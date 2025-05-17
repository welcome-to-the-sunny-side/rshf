import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    user_id: '',
    cf_handle: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.user_id.trim()) {
      errors.user_id = 'Username is required';
    }
    
    if (!formData.cf_handle.trim()) {
      errors.cf_handle = 'Codeforces handle is required';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      user_id: formData.user_id,
      cf_handle: formData.cf_handle,
      password: formData.password
    };
    
    const success = await register(userData);
    if (success) {
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    }
  };

  return (
    <div className="register-container">
      <div className="register-form-wrapper">
        <h2>Register for RSHF</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="user_id">Username</label>
            <input
              type="text"
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              placeholder="Choose a username"
              disabled={loading}
            />
            {formErrors.user_id && <div className="field-error">{formErrors.user_id}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="cf_handle">Codeforces Handle</label>
            <input
              type="text"
              id="cf_handle"
              name="cf_handle"
              value={formData.cf_handle}
              onChange={handleChange}
              placeholder="Your Codeforces handle"
              disabled={loading}
            />
            {formErrors.cf_handle && <div className="field-error">{formErrors.cf_handle}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Choose a password"
              disabled={loading}
            />
            {formErrors.password && <div className="field-error">{formErrors.password}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={loading}
            />
            {formErrors.confirmPassword && <div className="field-error">{formErrors.confirmPassword}</div>}
          </div>
          
          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <p className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}
