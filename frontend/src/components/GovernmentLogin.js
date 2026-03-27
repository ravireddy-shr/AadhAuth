import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../api';

function GovernmentLogin() {
  const [aadhaar, setAadhaar] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { aadhaar, password });
      const { token, role } = res.data;
      if (role !== 'government') {
        toast.error('Only government portal users can use this page.');
        return;
      }
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      toast.success('Government login success');
      navigate('/government');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <div className="card p-4">
      <h2>Government Sign In</h2>
      <p>Use government credentials to view verification reports.</p>
      <form onSubmit={login}>
        <div className="mb-3">
          <label>Aadhaar</label>
          <input className="form-control" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} placeholder="888888888888" />
        </div>
        <div className="mb-3">
          <label>Password</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
        </div>
        <button type="submit" className="btn btn-primary">Sign in as Government</button>
        {process.env.NODE_ENV !== 'production' && (
          <button
            type="button"
            className="btn btn-outline-light mt-3"
            onClick={() => {
              setAadhaar('888888888888');
              setPassword('gov1234');
            }}
          >
            Use local demo credentials
          </button>
        )}
      </form>
    </div>
  );
}

export default GovernmentLogin;
