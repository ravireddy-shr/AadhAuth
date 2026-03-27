import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Login() {
  const [form, setForm] = useState({ aadhaar: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      toast.success('Logged in');
      navigate('/dashboard');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Login failed';
      toast.error(msg);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 card p-4">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Aadhaar Number</label>
            <input type="text" name="aadhaar" className="form-control" value={form.aadhaar} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-control" value={form.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary">Login</button>
        </form>
        <p className="mt-3"><a href="/register">Register</a></p>
      </div>
    </div>
  );
}

export default Login;
