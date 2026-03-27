import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { getAuthHeaders } from '../api';

function GovernmentDashboard() {
  const [stats, setStats] = useState(null);
  const [passengers, setPassengers] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!localStorage.getItem('token')) {
        toast.error('Please login as government');
        return;
      }

      try {
        const headers = getAuthHeaders();
        const [statsRes, passengersRes] = await Promise.all([
          api.get('/gov/stats', { headers }),
          api.get('/users/gov?role=passenger', { headers })
        ]);
        setStats(statsRes.data);
        setPassengers(passengersRes.data);
      } catch (error) {
        toast.error(error?.response?.data?.error || 'Cannot load oversight board');
      }
    };

    load();
  }, []);

  const boardColumns = useMemo(() => {
    if (!stats) {
      return [];
    }

    const pendingPassengers = passengers.filter((user) => !user.gov_approval && !user.eligible);
    const approvedPassengers = passengers.filter((user) => user.gov_approval && !user.eligible);
    const eligiblePassengers = passengers.filter((user) => user.eligible);
    const reviewPassengers = passengers.filter((user) => !user.gov_approval);

    return [
      {
        title: 'Queued',
        tone: 'violet',
        items: [
          { type: 'metric', title: 'Total scans', meta: `${stats.total_scans}`, note: 'Biometric requests processed today.' },
          { type: 'metric', title: 'Registered passengers', meta: `${stats.total_passengers}`, note: 'Passengers currently in the registry.' },
          ...pendingPassengers.slice(0, 3).map((user) => ({ type: 'user', user, note: 'Waiting for first successful clearance.' }))
        ]
      },
      {
        title: 'ID cleared',
        tone: 'cyan',
        items: [
          { type: 'metric', title: 'Approved scans', meta: `${stats.approved}`, note: 'Government-side biometric checks cleared.' },
          ...approvedPassengers.slice(0, 4).map((user) => ({ type: 'user', user, note: 'Government approved. Ticket eligibility still pending.' }))
        ]
      },
      {
        title: 'Travel ready',
        tone: 'green',
        items: [
          { type: 'metric', title: 'Eligible passengers', meta: `${stats.eligible}`, note: 'Passengers ready to board.' },
          ...eligiblePassengers.slice(0, 4).map((user) => ({ type: 'user', user, note: 'All verification checks completed successfully.' }))
        ]
      },
      {
        title: 'Attention',
        tone: 'orange',
        items: [
          { type: 'metric', title: 'Rejected scans', meta: `${stats.rejected}`, note: 'Passengers who still need manual review.' },
          ...reviewPassengers.slice(0, 4).map((user) => ({ type: 'user', user, note: 'Requires additional validation before boarding.' }))
        ]
      }
    ];
  }, [passengers, stats]);

  if (!stats) {
    return (
      <main className="workspace-shell workspace-shell--board">
        <div className="workspace-shell__backdrop" />
        <section className="board-loading">
          <span className="status-pill tone-info">Loading board</span>
          <h1>Preparing the government oversight lanes...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell workspace-shell--board">
      <div className="workspace-shell__backdrop" />

      <header className="workspace-topbar">
        <div>
          <span className="workspace-topbar__eyebrow">Government console</span>
          <h1>Passenger verification operations board</h1>
        </div>
        <div className="workspace-topbar__actions">
          <span className="status-pill tone-info">Live oversight</span>
          <Link to="/" className="ghost-link">Switch portal</Link>
        </div>
      </header>

      <section className="board-summary">
        <div className="board-summary__card">
          <span>Total scans</span>
          <strong>{stats.total_scans}</strong>
        </div>
        <div className="board-summary__card">
          <span>Approved</span>
          <strong>{stats.approved}</strong>
        </div>
        <div className="board-summary__card">
          <span>Rejected</span>
          <strong>{stats.rejected}</strong>
        </div>
        <div className="board-summary__card">
          <span>Travel ready</span>
          <strong>{stats.eligible}</strong>
        </div>
      </section>

      <section className="oversight-board">
        {boardColumns.map((column) => (
          <div key={column.title} className={`oversight-lane tone-${column.tone}`}>
            <header className="oversight-lane__header">
              <h2>{column.title}</h2>
              <span>{column.items.length} cards</span>
            </header>
            <div className="oversight-lane__stack">
              {column.items.map((item, index) => (
                <article key={`${column.title}-${index}-${item.type}`} className={`oversight-card type-${item.type}`}>
                  {item.type === 'metric' ? (
                    <>
                      <p className="oversight-card__metric">{item.title}</p>
                      <strong>{item.meta}</strong>
                      <span>{item.note}</span>
                    </>
                  ) : (
                    <>
                      <p className="oversight-card__name">{item.user.name}</p>
                      <strong>{item.user.aadhaar}</strong>
                      <span>{item.note}</span>
                      <em>{item.user.eligible ? 'Eligible' : item.user.gov_approval ? 'Approved' : 'Pending'}</em>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export default GovernmentDashboard;
