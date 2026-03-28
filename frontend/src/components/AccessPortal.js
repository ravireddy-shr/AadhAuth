import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { getApiErrorMessage } from '../api';

const PORTAL_ORDER = ['conductor', 'government', 'passenger'];

const PORTAL_CONTENT = {
  conductor: {
    badge: 'Transit Gate',
    title: 'Conductor Login',
    headline: 'You can scan face and enter Aadhaar to approve boarding.',
    supporting: 'Verify Aadhaar entries, capture live face input, and approve boarding in one controlled flow.',
    accent: 'teal',
    button: 'Use conductor access',
    formTitle: 'Conductor login',
    formCopy: 'Enter the conductor Aadhaar ID and password to open the live scanning terminal.',
    demoHint: 'Local demo credentials: 999999999999 / cond1234'
  },
  government: {
    badge: 'Control Board',
    title: 'Government Portal',
    headline: 'Review approvals and movement in real time.',
    supporting: 'Monitor total scans, approval ratios, and passenger readiness from a clean oversight board.',
    accent: 'blue',
    button: 'Use government access',
    formTitle: 'Government login',
    formCopy: 'Sign in to the oversight board and review passenger verification activity.',
    demoHint: 'Local demo credentials: 888888888888 / gov1234'
  },
  passenger: {
    badge: 'Passenger Lane',
    title: 'Passenger Login & Registration',
    headline: 'Sign in or create your user profile',
    supporting: 'Manage your verification profile, upload your face, and check RTC eligibility before travel.',
    accent: 'violet',
    button: 'Use passenger access',
    formTitle: 'Passenger access',
    formCopy: 'Choose login or registration and manage the traveler identity from one clear panel.',
    demoHint: 'Create a passenger account here, then use the same Aadhaar and password to sign in.'
  }
};

const DEMO_CREDENTIALS = {
  conductor: { aadhaar: '999999999999', password: 'cond1234' },
  government: { aadhaar: '888888888888', password: 'gov1234' }
};

function AccessPortal({ initialPortal = 'passenger', initialPassengerMode = 'login' }) {
  const navigate = useNavigate();
  const [activePortal, setActivePortal] = useState(initialPortal);
  const [passengerMode, setPassengerMode] = useState(initialPassengerMode);
  const [busyPortal, setBusyPortal] = useState('');
  const [forms, setForms] = useState({
    conductor: { aadhaar: '', password: '' },
    government: { aadhaar: '', password: '' },
    passengerLogin: { aadhaar: '', password: '' },
    passengerRegister: { name: '', aadhaar: '', mobile: '', password: '' }
  });

  useEffect(() => {
    setActivePortal(initialPortal);
  }, [initialPortal]);

  useEffect(() => {
    setPassengerMode(initialPassengerMode);
  }, [initialPassengerMode]);

  const activeContent = PORTAL_CONTENT[activePortal];
  const showDemoHints = process.env.NODE_ENV !== 'production';

  const orderedPortals = useMemo(() => {
    const activeIndex = PORTAL_ORDER.indexOf(activePortal);
    const left = PORTAL_ORDER[(activeIndex + PORTAL_ORDER.length - 1) % PORTAL_ORDER.length];
    const right = PORTAL_ORDER[(activeIndex + 1) % PORTAL_ORDER.length];
    return [left, activePortal, right];
  }, [activePortal]);

  const updateForm = (scope, field, value) => {
    setForms((current) => ({
      ...current,
      [scope]: {
        ...current[scope],
        [field]: value
      }
    }));
  };

  const applyDemoCredentials = (scope) => {
    const creds = DEMO_CREDENTIALS[scope];
    if (!creds) {
      return;
    }

    setForms((current) => ({
      ...current,
      [scope]: creds
    }));
  };

  const handleRoleLogin = async (roleKey, redirectPath) => {
    setBusyPortal(roleKey);
    try {
      const res = await api.post('/login', forms[roleKey]);
      const { token, role } = res.data;
      if (role !== roleKey) {
        toast.error(`This login belongs to ${role}, not ${roleKey}.`);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      toast.success(`${PORTAL_CONTENT[roleKey].title} ready`);
      navigate(redirectPath);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Login failed'));
    } finally {
      setBusyPortal('');
    }
  };

  const handlePassengerLogin = async () => {
    setBusyPortal('passenger');
    try {
      const res = await api.post('/login', forms.passengerLogin);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      toast.success('Passenger login success');
      navigate('/dashboard');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Login failed'));
    } finally {
      setBusyPortal('');
    }
  };

  const handlePassengerRegister = async () => {
    setBusyPortal('passenger');
    try {
      await api.post('/register', forms.passengerRegister);
      setForms((current) => ({
        ...current,
        passengerLogin: {
          aadhaar: current.passengerRegister.aadhaar,
          password: current.passengerRegister.password
        }
      }));
      setPassengerMode('login');
      toast.success('Passenger account created. Sign in to continue.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Registration failed'));
    } finally {
      setBusyPortal('');
    }
  };

  const renderAuthForm = () => {
    if (activePortal === 'conductor') {
      return (
        <form
          className="access-stage__form"
          onSubmit={(event) => {
            event.preventDefault();
            handleRoleLogin('conductor', '/conductor');
          }}
        >
          <label className="access-form__label">
            Aadhaar ID
            <input
              className="access-form__input"
              value={forms.conductor.aadhaar}
              onChange={(event) => updateForm('conductor', 'aadhaar', event.target.value)}
              placeholder="999999999999"
              required
            />
          </label>
          <label className="access-form__label">
            Secure password
            <input
              type="password"
              className="access-form__input"
              value={forms.conductor.password}
              onChange={(event) => updateForm('conductor', 'password', event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <button type="submit" className="access-form__button" disabled={busyPortal === 'conductor'}>
            {busyPortal === 'conductor' ? 'Opening lane...' : 'Open conductor lane'}
          </button>
          {showDemoHints && (
            <button
              type="button"
              className="access-form__secondary"
              onClick={() => applyDemoCredentials('conductor')}
            >
              Use local demo credentials
            </button>
          )}
        </form>
      );
    }

    if (activePortal === 'government') {
      return (
        <form
          className="access-stage__form"
          onSubmit={(event) => {
            event.preventDefault();
            handleRoleLogin('government', '/government');
          }}
        >
          <label className="access-form__label">
            Department Aadhaar
            <input
              className="access-form__input"
              value={forms.government.aadhaar}
              onChange={(event) => updateForm('government', 'aadhaar', event.target.value)}
              placeholder="888888888888"
              required
            />
          </label>
          <label className="access-form__label">
            Oversight password
            <input
              type="password"
              className="access-form__input"
              value={forms.government.password}
              onChange={(event) => updateForm('government', 'password', event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <button type="submit" className="access-form__button" disabled={busyPortal === 'government'}>
            {busyPortal === 'government' ? 'Opening board...' : 'Open government board'}
          </button>
          {showDemoHints && (
            <button
              type="button"
              className="access-form__secondary"
              onClick={() => applyDemoCredentials('government')}
            >
              Use local demo credentials
            </button>
          )}
        </form>
      );
    }

    return (
      <div className="access-stage__passenger">
        <div className="access-form__switch">
          <button
            type="button"
            className={`access-chip ${passengerMode === 'login' ? 'is-active' : ''}`}
            onClick={() => setPassengerMode('login')}
          >
            Passenger login
          </button>
          <button
            type="button"
            className={`access-chip ${passengerMode === 'register' ? 'is-active' : ''}`}
            onClick={() => setPassengerMode('register')}
          >
            Passenger register
          </button>
        </div>

        {passengerMode === 'login' ? (
          <form
            className="access-stage__form"
            onSubmit={(event) => {
              event.preventDefault();
              handlePassengerLogin();
            }}
          >
            <label className="access-form__label">
              Aadhaar ID
              <input
                className="access-form__input"
                value={forms.passengerLogin.aadhaar}
                onChange={(event) => updateForm('passengerLogin', 'aadhaar', event.target.value)}
                placeholder="Enter your Aadhaar"
                required
              />
            </label>
            <label className="access-form__label">
              Password
              <input
                type="password"
                className="access-form__input"
                value={forms.passengerLogin.password}
                onChange={(event) => updateForm('passengerLogin', 'password', event.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            <button type="submit" className="access-form__button" disabled={busyPortal === 'passenger'}>
              {busyPortal === 'passenger' ? 'Signing in...' : 'Enter passenger dashboard'}
            </button>
          </form>
        ) : (
          <form
            className="access-stage__form access-stage__form--register"
            onSubmit={(event) => {
              event.preventDefault();
              handlePassengerRegister();
            }}
          >
            <label className="access-form__label">
              Full name
              <input
                className="access-form__input"
                value={forms.passengerRegister.name}
                onChange={(event) => updateForm('passengerRegister', 'name', event.target.value)}
                placeholder="Your full name"
                required
              />
            </label>
            <label className="access-form__label">
              Aadhaar ID
              <input
                className="access-form__input"
                value={forms.passengerRegister.aadhaar}
                onChange={(event) => updateForm('passengerRegister', 'aadhaar', event.target.value)}
                placeholder="12-digit Aadhaar"
                required
              />
            </label>
            <label className="access-form__label">
              Mobile number
              <input
                className="access-form__input"
                value={forms.passengerRegister.mobile}
                onChange={(event) => updateForm('passengerRegister', 'mobile', event.target.value)}
                placeholder="Mobile number"
                required
              />
            </label>
            <label className="access-form__label">
              Password
              <input
                type="password"
                className="access-form__input"
                value={forms.passengerRegister.password}
                onChange={(event) => updateForm('passengerRegister', 'password', event.target.value)}
                placeholder="Create a password"
                required
              />
            </label>
            <button type="submit" className="access-form__button" disabled={busyPortal === 'passenger'}>
              {busyPortal === 'passenger' ? 'Creating account...' : 'Create passenger access'}
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <main className="auth-shell">
      <div className="auth-shell__halo auth-shell__halo--left" />
      <div className="auth-shell__halo auth-shell__halo--right" />

      <section className="auth-hero">
        <div className="auth-copy">
          <span className="auth-copy__eyebrow">AadhAuth</span>
          <h1>A Saas Product For Aadhar Authentication For Ticket Eligibilty</h1>
          <p> Here we provide a software for government road transportation cooperation where they can check passengers by scanning their face or entering Aadhar details for ticket eligibility 
          </p>
        </div>

        <div className="auth-experience">
          <div className="auth-deck">
            {orderedPortals.map((portalKey, index) => {
              const portal = PORTAL_CONTENT[portalKey];
              const placement = index === 1 ? 'is-active' : index === 0 ? 'is-left' : 'is-right';

              return (
                <article
                  key={portalKey}
                  className={`access-panel ${placement} accent-${portal.accent}`}
                  onClick={() => setActivePortal(portalKey)}
                >
                  <div className="access-panel__microcopy">
                    <span>{portal.badge}</span>
                    <span>secure identity</span>
                    <span>RTC board</span>
                  </div>
                  <div className="access-panel__curve" />
                  <div className="access-panel__content">
                    <div className="access-panel__titleblock">
                      <p className="access-panel__title">{portal.title}</p>
                      <h2>{portal.headline}</h2>
                    </div>
                    <p className="access-panel__supporting">{portal.supporting}</p>
                    <div className="access-panel__preview">
                      <button
                        type="button"
                        className={`access-panel__ghost ${activePortal === portalKey ? 'is-selected' : ''}`}
                      >
                        {activePortal === portalKey ? 'Selected' : portal.button}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section className={`access-stage accent-${activeContent.accent}`}>
            <div className="access-stage__intro">
              <span className="access-stage__badge">{activeContent.badge}</span>
              <h2>{activeContent.formTitle}</h2>
              <p>{activeContent.formCopy}</p>
              {showDemoHints && <div className="access-stage__hint">{activeContent.demoHint}</div>}
            </div>
            {renderAuthForm()}
          </section>
        </div>
      </section>
    </main>
  );
}

export default AccessPortal;
