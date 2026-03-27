import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import api, { getAuthHeaders } from '../api';

function Dashboard() {
  const [eligible, setEligible] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const webcamRef = useRef(null);

  const checkEligibility = async () => {
    try {
      const res = await api.get('/check_eligibility', {
        headers: getAuthHeaders()
      });
      setEligible(res.data.eligible);
      toast.success(`Eligibility: ${res.data.eligible ? 'Eligible' : 'Not Eligible'}`);
    } catch (error) {
      toast.error('Error checking eligibility');
    }
  };

  const captureImageToForm = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      throw new Error('Unable to capture image');
    }
    const blob = await fetch(imageSrc).then(res => res.blob());
    const formData = new FormData();
    formData.append('face', blob, 'face.jpg');
    return formData;
  };

  const uploadFace = async () => {
    try {
      const formData = await captureImageToForm();
      await api.post('/upload_face', formData, {
        headers: getAuthHeaders()
      });
      toast.success('Face uploaded successfully');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Face upload failed';
      toast.error(msg);
    }
  };

  const authenticateFace = async () => {
    try {
      const formData = await captureImageToForm();
      const res = await api.post('/authenticate_face', formData, {
        headers: getAuthHeaders()
      });
      setMatchResult(res.data);
      toast.success(`Match: ${res.data.match} (${res.data.percentage.toFixed(2)}%)`);
    } catch (error) {
      const msg = error?.response?.data?.error || 'Authentication failed';
      toast.error(msg);
    }
  };

  return (
    <main className="workspace-shell workspace-shell--passenger">
      <div className="workspace-shell__backdrop" />

      <header className="workspace-topbar">
        <div>
          <span className="workspace-topbar__eyebrow">Passenger dashboard</span>
          <h1>Manage travel identity and face verification</h1>
          <p>Check boarding eligibility, upload your face profile, and confirm a live face match from one traveler panel.</p>
        </div>
        <div className="workspace-topbar__actions">
          <span className="status-pill tone-info">Traveler access</span>
          <Link to="/" className="ghost-link">Switch portal</Link>
        </div>
      </header>

      <section className="dashboard-grid">
        <section className="card dashboard-card">
          <p className="scan-panel__kicker">Passenger controls</p>
          <h2>Identity actions</h2>
          <p className="dashboard-card__copy">Run the required steps in sequence to prepare your Aadhaar profile for travel.</p>
          <div className="dashboard-actions">
            <button onClick={checkEligibility} className="access-form__button">Check eligibility</button>
            <button onClick={uploadFace} className="scan-action scan-action--secondary">Upload face</button>
            <button onClick={authenticateFace} className="scan-action">Authenticate face</button>
          </div>
        </section>

        <section className="card dashboard-card">
          <p className="scan-panel__kicker">Live status</p>
          <h2>Verification results</h2>
          <div className="dashboard-status">
            {eligible !== null && (
              <div className={`alert ${eligible ? 'tone-success' : 'tone-warning'}`}>
                Eligibility: {eligible ? 'Eligible' : 'Not Eligible'}
              </div>
            )}

            {matchResult && (
              <div className={`alert ${matchResult.match ? 'tone-success' : 'tone-danger'}`}>
                Face Match: {matchResult.match ? 'Yes' : 'No'} ({matchResult.percentage.toFixed(2)}%)
              </div>
            )}

            {eligible === null && !matchResult && (
              <div className="alert tone-idle">Run a check to see your current eligibility and face match result.</div>
            )}
          </div>
        </section>
      </section>

      <section className="card dashboard-camera">
        <div className="scan-panel__titleblock">
          <span>Passenger camera</span>
          <p>Capture the live traveler image here for upload and verification.</p>
        </div>
        <div className="dashboard-camera__frame">
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width={400} height={300} className="dashboard-camera__feed" />
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
