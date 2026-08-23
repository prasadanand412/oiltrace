import hashlib
import hmac
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

DB_PATH = "oiltrace.db"
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
                created_at TEXT NOT NULL
            )
            """
        )


def _hash_password(password: str, salt_hex: Optional[str] = None):
    salt = bytes.fromhex(salt_hex) if salt_hex else os.urandom(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120_000,
    )
    return derived.hex(), salt.hex()


def _verify_password(password: str, password_hash: str, salt: str):
    calculated, _ = _hash_password(password, salt)
    return hmac.compare_digest(calculated, password_hash)


def register_user(username: str, password: str):
    if len(username.strip()) < 3:
        raise ValueError("Username must contain at least 3 characters.")
    if len(password) < 6:
        raise ValueError("Password must contain at least 6 characters.")

    password_hash, salt = _hash_password(password)

    try:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO users (username, password_hash, salt, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    username.strip(),
                    password_hash,
                    salt,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
    except sqlite3.IntegrityError:
        raise ValueError("Username already exists.")

    return {"username": username.strip()}


def authenticate_user(username: str, password: str):
    with _connect() as conn:
        row = conn.execute(
            "SELECT username, password_hash, salt FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    if not row or not _verify_password(password, row["password_hash"], row["salt"]):
        return None

    return {"username": row["username"]}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=15)
    )
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise credentials_error
    except jwt.PyJWTError:
        raise credentials_error

    with _connect() as conn:
        row = conn.execute(
            "SELECT username FROM users WHERE username = ?",
            (username,),
        ).fetchone()

    if not row:
        raise credentials_error

    return {"username": row["username"]}


_init_db()
