import hashlib
import hmac
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer


DB_PATH = os.getenv("OILTRACE_DB_PATH", str(Path(__file__).with_name("oiltrace.db")))
SECRET_KEY = os.getenv("OILTRACE_SECRET_KEY", "change-this-secret-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT,
                is_logged_in INTEGER NOT NULL DEFAULT 0,
                is_admin INTEGER NOT NULL DEFAULT 0
            )
            """
        )

        columns = {
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(users)"
            ).fetchall()
        }

        if "last_login" not in columns:
            conn.execute(
                "ALTER TABLE users ADD COLUMN last_login TEXT"
            )

        if "is_logged_in" not in columns:
            conn.execute(
                """
                ALTER TABLE users
                ADD COLUMN is_logged_in INTEGER NOT NULL DEFAULT 0
                """
            )

        if "is_admin" not in columns:
            conn.execute(
                """
                ALTER TABLE users
                ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0
                """
            )


def _hash_password(
    password: str,
    salt_hex: Optional[str] = None,
):
    salt = (
        bytes.fromhex(salt_hex)
        if salt_hex
        else os.urandom(16)
    )

    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120_000,
    )

    return derived.hex(), salt.hex()


def _verify_password(
    password: str,
    password_hash: str,
    salt: str,
):
    calculated, _ = _hash_password(
        password,
        salt,
    )

    return hmac.compare_digest(
        calculated,
        password_hash,
    )


def register_user(
    username: str,
    password: str,
):
    username = username.strip()

    if len(username) < 3:
        raise ValueError(
            "Username must contain at least 3 characters."
        )

    if len(password) < 6:
        raise ValueError(
            "Password must contain at least 6 characters."
        )

    password_hash, salt = _hash_password(password)

    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO users (
                    username,
                    password_hash,
                    salt,
                    created_at,
                    last_login,
                    is_logged_in,
                    is_admin
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    username,
                    password_hash,
                    salt,
                    datetime.now(timezone.utc).isoformat(),
                    None,
                    0,
                    0,
                ),
            )

    except sqlite3.IntegrityError:
        raise ValueError(
            "Username already exists."
        )

    return {
        "username": username
    }


def authenticate_user(
    username: str,
    password: str,
):
    username = username.strip()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                id,
                username,
                password_hash,
                salt,
                is_admin
            FROM users
            WHERE username = ?
            """,
            (username,),
        ).fetchone()

        if not row:
            return None

        if not _verify_password(
            password,
            row["password_hash"],
            row["salt"],
        ):
            return None

        login_time = datetime.now(
            timezone.utc
        ).isoformat()

        conn.execute(
            """
            UPDATE users
            SET
                last_login = ?,
                is_logged_in = 1
            WHERE id = ?
            """,
            (
                login_time,
                row["id"],
            ),
        )

    return {
        "username": row["username"],
        "last_login": login_time,
        "is_logged_in": True,
        "is_admin": bool(row["is_admin"]),
    }


def logout_user(username: str):
    username = username.strip()

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, username
            FROM users
            WHERE username = ?
            """,
            (username,),
        ).fetchone()

        if not row:
            return False

        conn.execute(
            """
            UPDATE users
            SET is_logged_in = 0
            WHERE id = ?
            """,
            (row["id"],),
        )

    return True


def get_all_users():
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT
                id,
                username,
                created_at,
                last_login,
                is_logged_in,
                is_admin
            FROM users
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [
        {
            "id": row["id"],
            "username": row["username"],
            "created_at": row["created_at"],
            "last_login": row["last_login"],
            "is_logged_in": bool(row["is_logged_in"]),
            "is_admin": bool(row["is_admin"]),
        }
        for row in rows
    ]


def get_user_by_username(username: str):
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                id,
                username,
                is_admin
            FROM users
            WHERE username = ?
            """,
            (username,),
        ).fetchone()

    if not row:
        return None

    return {
        "id": row["id"],
        "username": row["username"],
        "is_admin": bool(row["is_admin"]),
    }


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
):
    payload = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=15)
    )

    payload["exp"] = expire

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        username = payload.get("sub")

        if not username:
            raise credentials_error

    except jwt.PyJWTError:
        raise credentials_error

    with _connect() as conn:
        row = conn.execute(
            """
            SELECT
                username,
                is_admin
            FROM users
            WHERE username = ?
            """,
            (username,),
        ).fetchone()

    if not row:
        raise credentials_error

    return {
        "username": row["username"],
        "is_admin": bool(row["is_admin"]),
    }


def get_current_admin(
    current_user=Depends(get_current_user),
):
    if not current_user["is_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


_init_db()
