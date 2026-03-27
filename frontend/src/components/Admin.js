import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { getAuthHeaders } from '../api';

function Admin() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users', {
        headers: getAuthHeaders()
      });
      setUsers(res.data);
    } catch (error) {
      console.error('Unable to fetch users', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/logs', {
        headers: getAuthHeaders()
      });
      setLogs(res.data);
    } catch (error) {
      console.error('Unable to fetch logs', error);
    }
  };

  return (
    <main className="workspace-shell workspace-shell--admin">
      <div className="workspace-shell__backdrop" />

      <header className="workspace-topbar">
        <div>
          <span className="workspace-topbar__eyebrow">Admin console</span>
          <h1>System users and audit activity</h1>
          <p>Review registered accounts and recent system events from the same secured visual environment as the rest of the platform.</p>
        </div>
        <div className="workspace-topbar__actions">
          <span className="status-pill tone-warning">Restricted access</span>
          <Link to="/" className="ghost-link">Switch portal</Link>
        </div>
      </header>

      <section className="admin-grid">
        <section className="card admin-panel">
          <div className="admin-panel__header">
            <p className="scan-panel__kicker">Registry</p>
            <h2>Users</h2>
          </div>
          <div className="admin-list">
            {users.map((user) => (
              <article key={user._id} className="list-group-item admin-list__item">
                <strong>{user.name}</strong>
                <span>{user.aadhaar}</span>
                <em>{user.eligible ? 'Eligible' : 'Not eligible'}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="card admin-panel">
          <div className="admin-panel__header">
            <p className="scan-panel__kicker">Audit trail</p>
            <h2>Logs</h2>
          </div>
          <div className="admin-list">
            {logs.map((log) => (
              <article key={log._id} className="list-group-item admin-list__item">
                <strong>{log.action}</strong>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
                <em>{log.user_id || log.aadhaar || 'system'}</em>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default Admin;
