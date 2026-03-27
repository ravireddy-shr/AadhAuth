import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import api, { getAuthHeaders } from '../api';

function Conductor() {
  const [users, setUsers] = useState([]);
  const [targetAadhaar, setTargetAadhaar] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(12);
  const [capturePreview, setCapturePreview] = useState('');
  const webcamRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!loading) {
      setScanProgress(scanResult?.scan ? 100 : 12);
      return undefined;
    }

    setScanProgress(18);
    const timer = window.setInterval(() => {
      setScanProgress((current) => {
        if (current >= 88) {
          return current;
        }
        return Math.min(88, current + Math.floor(Math.random() * 12) + 4);
      });
    }, 220);

    return () => window.clearInterval(timer);
  }, [loading, scanResult]);

  const knownPassengers = useMemo(() => users.slice(0, 5), [users]);

  const statusTone = useMemo(() => {
    if (loading) {
      return { label: 'Scanning live feed', detail: 'Align the passenger face inside the frame.', tone: 'info' };
    }
    if (!scanResult) {
      return { label: 'Ready for verification', detail: 'Use face scan or Aadhaar lookup to begin.', tone: 'idle' };
    }
    if (scanResult.scan && scanResult.matched_user?.eligible) {
      return { label: 'Successful verification', detail: 'Identity confirmed and boarding is allowed.', tone: 'success' };
    }
    if (scanResult.scan) {
      return { label: 'Identity found', detail: 'Passenger record matched, but travel is not yet eligible.', tone: 'warning' };
    }
    return { label: 'No verified match', detail: scanResult.message || 'The passenger could not be matched.', tone: 'danger' };
  }, [loading, scanResult]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/gov?role=passenger', {
        headers: getAuthHeaders()
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Cannot load passenger directory');
    }
  };

  const captureImage = async () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      throw new Error('No image from camera');
    }
    setCapturePreview(screenshot);
    const blob = await fetch(screenshot).then((res) => res.blob());
    return blob;
  };

  const onScanByFace = async () => {
    setLoading(true);
    try {
      const faceBlob = await captureImage();
      const formData = new FormData();
      formData.append('face', faceBlob, 'face.jpg');

      const res = await api.post('/rtc/scan', formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      setScanProgress(100);
      setScanResult(res.data);
      if (res.data.scan && res.data.matched_user?.gov_pass) {
        toast.success('Government verification complete');
      } else {
        toast.warning('Passenger matched, but not yet cleared');
      }
    } catch (err) {
      setScanResult(err?.response?.data || null);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'RTC scan failed';
      toast.error(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onScanByAadhaar = async () => {
    if (!targetAadhaar || targetAadhaar.length !== 12) {
      toast.warn('Enter a valid 12-digit Aadhaar');
      return;
    }

    setLoading(true);
    setCapturePreview('');
    try {
      const res = await api.post(
        '/rtc/scan',
        { aadhaar: targetAadhaar },
        {
          headers: getAuthHeaders()
        }
      );
      setScanProgress(100);
      setScanResult(res.data);
      if (res.data.scan && res.data.matched_user?.gov_pass) {
        toast.success('Passenger verified through Aadhaar');
      } else {
        toast.warning('Aadhaar found, but approval is pending');
      }
    } catch (err) {
      setScanResult(err?.response?.data || null);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'RTC Aadhaar scan failed';
      toast.error(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resultUser = scanResult?.matched_user;

  return (
    <main className="workspace-shell workspace-shell--conductor">
      <div className="workspace-shell__backdrop" />
      <header className="workspace-topbar">
        <div>
          <span className="workspace-topbar__eyebrow">Conductor Dashboard</span>
          <h1>Biometric Verification</h1>
        </div>
        <div className="workspace-topbar__actions">
          <span className={`status-pill tone-${statusTone.tone}`}>{statusTone.label}</span>
          <Link to="/" className="ghost-link">Switch portal</Link>
        </div>
      </header>

      <section className="scan-console">
        <aside className="scan-panel scan-panel--intro">
          <div className="face-orbit">
            <div className="face-orbit__core" />
          </div>
          <p className="scan-panel__kicker">Face ID</p>
          <h2>Hold the camera steady and scan the passenger live.</h2>
          <p className="scan-panel__body">
            Use manual Aadhaar entry if the rider is already known, or capture a face scan to verify against the transit record.
          </p>

          <label className="scan-input-group">
            <span>Aadhaar lookup</span>
            <input
              value={targetAadhaar}
              onChange={(event) => setTargetAadhaar(event.target.value)}
              className="scan-input"
              placeholder="123456789012"
              maxLength={12}
            />
          </label>

          <div className="scan-panel__buttons">
            <button className="scan-action scan-action--secondary" onClick={onScanByAadhaar} disabled={loading}>
              Verify Aadhaar
            </button>
            <button className="scan-action" onClick={onScanByFace} disabled={loading}>
              Start face scan
            </button>
          </div>

          <div className="scan-panel__note">
            <strong>Lane note</strong>
            <span>{statusTone.detail}</span>
          </div>
        </aside>

        <section className="scan-panel scan-panel--camera">
          <div className="scan-panel__titleblock">
            <span>Please wait!</span>
            <p>The center lane keeps the live biometric frame active while the lookup runs.</p>
          </div>

          <div className={`scan-viewfinder ${loading ? 'is-scanning' : ''}`}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              mirrored
              width={420}
              height={360}
              className="scan-viewfinder__feed"
            />
            <div className="scan-viewfinder__overlay">
              <div className="scan-viewfinder__frame" />
              <div className="scan-viewfinder__line" />
            </div>
          </div>

          <div className="scan-progress">
            <div className="scan-progress__bar">
              <span style={{ width: `${scanProgress}%` }} />
            </div>
            <div className="scan-progress__meta">
              <strong>{loading ? `${scanProgress}%` : scanResult ? '100%' : 'Idle'}</strong>
              <span>{loading ? 'Scanning' : 'Ready'}</span>
            </div>
          </div>
        </section>

        <aside className="scan-panel scan-panel--result">
          <div className="scan-result__header">
            <span className={`status-pill tone-${statusTone.tone}`}>{statusTone.label}</span>
            <p>ID confirmed data appears here after every scan.</p>
          </div>

          <div className="identity-card">
            <div className="identity-card__portrait">
              {capturePreview ? (
                <img src={capturePreview} alt="Captured passenger" />
              ) : (
                <div className="identity-card__placeholder">Preview</div>
              )}
            </div>

            <div className="identity-card__body">
              <h3>{resultUser?.name || 'Awaiting passenger match'}</h3>
              <p>{resultUser ? `Aadhaar ${resultUser.aadhaar}` : 'Live scan will populate passenger details here.'}</p>

              <dl className="identity-card__details">
                <div>
                  <dt>Government pass</dt>
                  <dd>{resultUser ? (resultUser.gov_pass ? 'Approved' : 'Pending') : '--'}</dd>
                </div>
                <div>
                  <dt>Ticket eligibility</dt>
                  <dd>{resultUser ? (resultUser.eligible ? 'Eligible' : 'Restricted') : '--'}</dd>
                </div>
                <div>
                  <dt>Match distance</dt>
                  <dd>{resultUser?.distance ?? '--'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{scanResult?.scan ? 'Matched' : 'No match yet'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </section>

      <section className="scan-directory">
        <div className="scan-directory__header">
          <h2>Known passengers</h2>
          <p>Quick reference list for manual Aadhaar verification.</p>
        </div>
        <div className="scan-directory__list">
          {knownPassengers.map((user) => (
            <button
              key={user._id}
              type="button"
              className="scan-directory__item"
              onClick={() => setTargetAadhaar(user.aadhaar)}
            >
              <strong>{user.name}</strong>
              <span>{user.aadhaar}</span>
              <em>{user.eligible ? 'Eligible' : 'Pending'}</em>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Conductor;
