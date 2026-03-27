import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function Register() {
  const [form, setForm] = useState({ name: '', aadhaar: '', mobile: '', password: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register', form);
      toast.success('Registered successfully');
      navigate('/');
    } catch (error) {
      const msg = error?.response?.data?.error || 'Registration failed';
      toast.error(msg);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 card p-4">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input type="text" name="name" className="form-control" value={form.name} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Aadhaar Number</label>
            <input type="text" name="aadhaar" className="form-control" value={form.aadhaar} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Mobile Number</label>
            <input type="text" name="mobile" className="form-control" value={form.mobile} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-control" value={form.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary">Register</button>
        </form>
      </div>
    </div>
  );
}

export default Register;
