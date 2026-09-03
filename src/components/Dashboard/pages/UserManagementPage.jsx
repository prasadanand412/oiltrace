import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Users,
  UserRound,
  XCircle,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function fetchUsers() {
    setStatus("loading");
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`${API_URL}/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load users.");
      }

      setUsers(Array.isArray(data) ? data : []);
      setStatus("success");
    } catch (err) {
      setError(
        err.message || "Unable to connect to the user management service."
      );
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const onlineUsers = useMemo(
    () => users.filter((user) => user.is_logged_in),
    [users]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => user.is_admin),
    [users]
  );

  function formatDate(dateString) {
    if (!dateString) {
      return "Never";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString();
  }

  function formatShortDate(dateString) {
    if (!dateString) {
      return "None";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString();
  }

  function getInitials(username) {
    if (!username) {
      return "U";
    }

    return username
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase();
  }

  if (status === "loading") {
    return (
      <div className="um-page">
        <style>{styles}</style>

        <div className="um-loading">
          <div className="um-loading-icon">
            <LoaderCircle size={26} />
          </div>

          <h2>Loading User Management</h2>

          <p>
            Retrieving registered members from the OilTrace
            authentication system.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="um-page">
        <style>{styles}</style>

        <div className="um-header">
          <div>
            <div className="um-eyebrow">
              <ShieldCheck size={14} />
              ADMINISTRATION
            </div>

            <h1>User Management</h1>

            <p>
              Manage and monitor registered OilTrace platform members.
            </p>
          </div>
        </div>

        <div className="um-error">
          <div className="um-error-icon">
            <AlertCircle size={22} />
          </div>

          <div>
            <h3>Unable to load users</h3>
            <p>{error}</p>

            <button className="um-button" onClick={fetchUsers}>
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="um-page">
      <style>{styles}</style>

      {/* Header */}
      <header className="um-header">
        <div>
          <div className="um-eyebrow">
            <ShieldCheck size={14} />
            ADMINISTRATION
          </div>

          <h1>User Management</h1>

          <p>
            Manage registered members and monitor authentication activity
            across the OilTrace platform.
          </p>
        </div>

        <div className="um-admin-badge">
          <ShieldCheck size={16} />
          <span>Administrator</span>
        </div>
      </header>

      {/* Statistics */}
      <section className="um-stats">
        <article className="um-stat-card">
          <div className="um-stat-icon">
            <Users size={20} />
          </div>

          <div className="um-stat-content">
            <span className="um-stat-label">TOTAL MEMBERS</span>
            <strong>{users.length}</strong>
            <small>Registered accounts</small>
          </div>
        </article>

        <article className="um-stat-card">
          <div className="um-stat-icon um-icon-online">
            <Activity size={20} />
          </div>

          <div className="um-stat-content">
            <span className="um-stat-label">ONLINE NOW</span>
            <strong>{onlineUsers.length}</strong>
            <small>Active sessions</small>
          </div>
        </article>

        <article className="um-stat-card">
          <div className="um-stat-icon um-icon-admin">
            <ShieldCheck size={20} />
          </div>

          <div className="um-stat-content">
            <span className="um-stat-label">ADMINISTRATORS</span>
            <strong>{adminUsers.length}</strong>
            <small>Privileged accounts</small>
          </div>
        </article>

        <article className="um-stat-card">
          <div className="um-stat-icon um-icon-date">
            <Clock3 size={20} />
          </div>

          <div className="um-stat-content">
            <span className="um-stat-label">LATEST REGISTRATION</span>

            <strong className="um-date-stat">
              {users.length > 0
                ? formatShortDate(users[0].created_at)
                : "None"}
            </strong>

            <small>Most recent member</small>
          </div>
        </article>
      </section>

      {/* Users table */}
      <section className="um-card">
        <div className="um-card-header">
          <div>
            <div className="um-card-title-row">
              <h2>Registered Members</h2>

              <span className="um-count-badge">
                {users.length}
              </span>
            </div>

            <p>
              All accounts currently registered in the OilTrace
              authentication database.
            </p>
          </div>

          <button
            className="um-refresh-button"
            onClick={fetchUsers}
            title="Refresh user list"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {users.length === 0 ? (
          <div className="um-empty">
            <div className="um-empty-icon">
              <Users size={28} />
            </div>

            <h3>No registered members</h3>

            <p>
              No user accounts are currently available.
            </p>
          </div>
        ) : (
          <div className="um-table-container">
            <table className="um-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>REGISTERED</th>
                  <th>LAST LOGIN</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    {/* Member */}
                    <td>
                      <div className="um-member">
                        <div className="um-avatar">
                          {getInitials(user.username)}
                        </div>

                        <div className="um-member-info">
                          <strong>{user.username}</strong>

                          <span>
                            Member ID #{user.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      {user.is_admin ? (
                        <span className="um-role um-role-admin">
                          <ShieldCheck size={14} />
                          Administrator
                        </span>
                      ) : (
                        <span className="um-role um-role-member">
                          <UserRound size={14} />
                          Member
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      {user.is_logged_in ? (
                        <span className="um-status um-status-online">
                          <span className="um-status-dot" />
                          Online
                        </span>
                      ) : (
                        <span className="um-status um-status-offline">
                          <span className="um-status-dot" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* Registered */}
                    <td>
                      <span className="um-date">
                        {formatDate(user.created_at)}
                      </span>
                    </td>

                    {/* Last login */}
                    <td>
                      <span className="um-date">
                        {formatDate(user.last_login)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = `
.um-page {
  min-height: 100%;
  padding: 30px 34px 40px;
  background: #f7f9fc;
  color: #172033;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  box-sizing: border-box;
}

.um-page *,
.um-page *::before,
.um-page *::after {
  box-sizing: border-box;
}

/* Header */

.um-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.um-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.um-header h1 {
  margin: 0;
  color: #172033;
  font-size: 27px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.um-header p {
  margin: 8px 0 0;
  max-width: 650px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.um-admin-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid #dbe5f5;
  border-radius: 8px;
  background: #ffffff;
  color: #31558d;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* Statistics */

.um-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin-bottom: 22px;
}

.um-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 108px;
  padding: 18px;
  border: 1px solid #e5eaf2;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.025);
}

.um-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: 9px;
  background: #eef4ff;
  color: #2563eb;
}

.um-icon-online {
  background: #edf9f3;
  color: #15945c;
}

.um-icon-admin {
  background: #f1efff;
  color: #6d5ce7;
}

.um-icon-date {
  background: #fff7e9;
  color: #c98514;
}

.um-stat-content {
  min-width: 0;
}

.um-stat-label {
  display: block;
  margin-bottom: 3px;
  color: #94a3b8;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.um-stat-content strong {
  display: block;
  color: #172033;
  font-size: 23px;
  line-height: 1.25;
  font-weight: 700;
}

.um-stat-content small {
  display: block;
  margin-top: 2px;
  color: #94a3b8;
  font-size: 10px;
}

.um-date-stat {
  font-size: 17px !important;
  margin-top: 3px;
}

/* Main card */

.um-card {
  overflow: hidden;
  border: 1px solid #e5eaf2;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.025);
}

.um-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 21px 23px;
  border-bottom: 1px solid #edf1f6;
}

.um-card-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.um-card-header h2 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.um-card-header p {
  margin: 5px 0 0;
  color: #8491a5;
  font-size: 11px;
}

.um-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 23px;
  height: 21px;
  padding: 0 7px;
  border-radius: 12px;
  background: #eef4ff;
  color: #2563eb;
  font-size: 10px;
  font-weight: 700;
}

.um-refresh-button,
.um-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dbe3ef;
  border-radius: 7px;
  background: #ffffff;
  color: #475569;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.um-refresh-button:hover,
.um-button:hover {
  border-color: #b8c8e2;
  background: #f7faff;
  color: #2563eb;
}

.um-refresh-button:active,
.um-button:active {
  transform: translateY(1px);
}

/* Table */

.um-table-container {
  width: 100%;
  overflow-x: auto;
}

.um-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  table-layout: fixed;
}

.um-table th {
  height: 43px;
  padding: 0 22px;
  border-bottom: 1px solid #e9eef5;
  background: #fbfcfe;
  color: #8995a8;
  text-align: left;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.um-table th:nth-child(1) {
  width: 29%;
}

.um-table th:nth-child(2) {
  width: 19%;
}

.um-table th:nth-child(3) {
  width: 14%;
}

.um-table th:nth-child(4) {
  width: 19%;
}

.um-table th:nth-child(5) {
  width: 19%;
}

.um-table td {
  height: 70px;
  padding: 10px 22px;
  border-bottom: 1px solid #edf1f5;
  color: #475569;
  font-size: 11px;
  vertical-align: middle;
}

.um-table tbody tr {
  transition: background 0.15s ease;
}

.um-table tbody tr:hover {
  background: #fafcff;
}

.um-table tbody tr:last-child td {
  border-bottom: none;
}

/* Member */

.um-member {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.um-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #edf3ff;
  color: #315fa8;
  font-size: 11px;
  font-weight: 700;
}

.um-member-info {
  min-width: 0;
}

.um-member-info strong {
  display: block;
  overflow: hidden;
  color: #25334a;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.um-member-info span {
  display: block;
  margin-top: 3px;
  color: #9aa5b5;
  font-size: 9px;
}

/* Role */

.um-role {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.um-role-member {
  background: #f4f6f9;
  color: #66758a;
}

.um-role-admin {
  background: #f1efff;
  color: #6656cf;
}

/* Status */

.um-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 600;
}

.um-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.um-status-online {
  color: #148253;
}

.um-status-online .um-status-dot {
  background: #20a66a;
  box-shadow: 0 0 0 3px #e7f7ef;
}

.um-status-offline {
  color: #8995a5;
}

.um-status-offline .um-status-dot {
  background: #b5bfcc;
}

/* Date */

.um-date {
  color: #64748b;
  font-size: 10px;
  white-space: nowrap;
}

/* Empty */

.um-empty {
  padding: 65px 20px;
  text-align: center;
}

.um-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 12px;
  background: #f1f5fa;
  color: #94a3b8;
}

.um-empty h3 {
  margin: 0;
  color: #334155;
  font-size: 14px;
}

.um-empty p {
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 11px;
}

/* Loading */

.um-loading {
  display: flex;
  min-height: 420px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.um-loading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 15px;
  border-radius: 12px;
  background: #eef4ff;
  color: #2563eb;
}

.um-loading-icon svg {
  animation: um-spin 1s linear infinite;
}

.um-loading h2 {
  margin: 0;
  color: #25334a;
  font-size: 16px;
}

.um-loading p {
  max-width: 400px;
  margin: 7px 0 0;
  color: #8a96a8;
  font-size: 11px;
  line-height: 1.5;
}

@keyframes um-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Error */

.um-error {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  border: 1px solid #f1d8d8;
  border-radius: 10px;
  background: #fffafa;
}

.um-error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border-radius: 9px;
  background: #fff0f0;
  color: #d64b4b;
}

.um-error h3 {
  margin: 1px 0 5px;
  color: #8f3030;
  font-size: 14px;
}

.um-error p {
  margin: 0 0 13px;
  color: #9b6666;
  font-size: 11px;
}

/* Responsive */

@media (max-width: 1100px) {
  .um-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .um-page {
    padding: 20px 16px 30px;
  }

  .um-header {
    flex-direction: column;
  }

  .um-admin-badge {
    align-self: flex-start;
  }

  .um-stats {
    grid-template-columns: 1fr;
  }

  .um-card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .um-refresh-button {
    align-self: flex-start;
  }
}
`;