import "./App.css";

function App() {
  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>🌊</span>
          <h2>OilTrace</h2>
        </div>

        <nav>
          <div className="nav-item active">🏠 Dashboard</div>
          <div className="nav-item">🗺️ Spill Map</div>
          <div className="nav-item">🛰️ Satellite Detection</div>
          <div className="nav-item">🚢 Vessel Tracking</div>
          <div className="nav-item">📊 Analytics</div>
          <div className="nav-item">⚙️ Settings</div>
        </nav>

        <div className="sidebar-bottom">
          <div className="help">❓ Help & Support</div>
          <div className="user">
            <div className="avatar">A</div>
            <div>
              <strong>Admin</strong>
              <small>OilTrace Team</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">

        {/* Header */}
        <header className="header">
          <div>
            <h1>Oil Spill Monitoring Dashboard</h1>
            <p>AI-powered oil spill detection and prediction system</p>
          </div>

          <button className="notification">🔔</button>
        </header>

        {/* Statistics */}
        <section className="stats">

          <div className="stat-card">
            <div className="stat-icon">🛢️</div>
            <div>
              <p>Active Oil Spills</p>
              <h2>24</h2>
              <span className="danger">↑ 8.2%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🌊</div>
            <div>
              <p>Area Affected</p>
              <h2>1,284 km²</h2>
              <span className="warning">↑ 4.5%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🚢</div>
            <div>
              <p>Vessels Tracked</p>
              <h2>1,842</h2>
              <span className="success">↑ 12.4%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div>
              <p>Detection Accuracy</p>
              <h2>94.8%</h2>
              <span className="success">↑ 2.1%</span>
            </div>
          </div>

        </section>

        {/* Dashboard Grid */}
        <section className="dashboard-grid">

          {/* Map */}
          <div className="card map-card">
            <div className="card-header">
              <div>
                <h3>Oil Spill Monitoring</h3>
                <p>Live spill locations</p>
              </div>

              <button className="view-btn">View Map</button>
            </div>

            <div className="map">
              <div className="map-grid"></div>

              <div className="location location1">🔴</div>
              <div className="location location2">🟠</div>
              <div className="location location3">🔴</div>
              <div className="location location4">🟡</div>

              <div className="map-label">
                🌊 Arabian Sea
              </div>
            </div>
          </div>

          {/* Severity */}
          <div className="card severity-card">
            <div className="card-header">
              <div>
                <h3>Spill Severity</h3>
                <p>Current incidents</p>
              </div>
            </div>

            <div className="severity-item">
              <div>
                <span className="dot critical"></span>
                Critical
              </div>
              <strong>6</strong>
            </div>

            <div className="severity-item">
              <div>
                <span className="dot high"></span>
                High
              </div>
              <strong>9</strong>
            </div>

            <div className="severity-item">
              <div>
                <span className="dot medium"></span>
                Medium
              </div>
              <strong>6</strong>
            </div>

            <div className="severity-item">
              <div>
                <span className="dot low"></span>
                Low
              </div>
              <strong>3</strong>
            </div>
          </div>

        </section>

        {/* Recent Spills */}
        <section className="card recent-card">

          <div className="card-header">
            <div>
              <h3>Recent Oil Spill Incidents</h3>
              <p>Latest detected incidents</p>
            </div>

            <button className="view-btn">View All</button>
          </div>

          <div className="table-container">

            <table>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Location</th>
                  <th>Detected</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>#OT-1024</td>
                  <td>Arabian Sea</td>
                  <td>25 Aug 2026</td>
                  <td>
                    <span className="badge critical-badge">
                      Critical
                    </span>
                  </td>
                  <td>
                    <span className="status active-status">
                      Active
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>#OT-1023</td>
                  <td>Mumbai Coast</td>
                  <td>25 Aug 2026</td>
                  <td>
                    <span className="badge high-badge">
                      High
                    </span>
                  </td>
                  <td>
                    <span className="status active-status">
                      Active
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>#OT-1022</td>
                  <td>Goa Coast</td>
                  <td>24 Aug 2026</td>
                  <td>
                    <span className="badge medium-badge">
                      Medium
                    </span>
                  </td>
                  <td>
                    <span className="status monitoring-status">
                      Monitoring
                    </span>
                  </td>
                </tr>

                <tr>
                  <td>#OT-1021</td>
                  <td>Gujarat Coast</td>
                  <td>24 Aug 2026</td>
                  <td>
                    <span className="badge low-badge">
                      Low
                    </span>
                  </td>
                  <td>
                    <span className="status resolved-status">
                      Resolved
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </section>

      </main>
    </div>
  );
}

export default App;