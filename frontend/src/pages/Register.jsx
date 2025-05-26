import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import styles from './Register.module.css';

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

  // Add a class to the body to handle special register page styling
  React.useEffect(() => {
    document.body.classList.add('registerPage');
    return () => {
      document.body.classList.remove('registerPage');
    };
  }, []);

  return (
    <div className={styles.registerPage}>
      <div className={styles.formSide}>
        <ContentBoxWithTitle
          className={styles.registerFormContainer}
          title={<span>Register</span>}
          backgroundColor="rgb(230, 255, 230)" 
          contentPadding="0.75rem"
        >
          {error && <div className={styles.errorMessage}>{error}</div>}
          <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="user_id" className={`${styles.formLabel} standardTextFont`}>Username</label>
            <input
              type="text"
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              placeholder="Choose a username"
              disabled={loading}
              className={`${styles.formInput} standardTextFont`}
            />
            {formErrors.user_id && <div className={styles.fieldError}>{formErrors.user_id}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="cf_handle" className={`${styles.formLabel} standardTextFont`}>Codeforces Handle</label>
            <input
              type="text"
              id="cf_handle"
              name="cf_handle"
              value={formData.cf_handle}
              onChange={handleChange}
              placeholder="Your Codeforces handle"
              disabled={loading}
              className={`${styles.formInput} standardTextFont`}
            />
            {formErrors.cf_handle && <div className={styles.fieldError}>{formErrors.cf_handle}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={`${styles.formLabel} standardTextFont`}>Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Choose a password"
              disabled={loading}
              className={`${styles.formInput} standardTextFont`}
            />
            {formErrors.password && <div className={styles.fieldError}>{formErrors.password}</div>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={`${styles.formLabel} standardTextFont`}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              disabled={loading}
              className={`${styles.formInput} standardTextFont`}
            />
            {formErrors.confirmPassword && <div className={styles.fieldError}>{formErrors.confirmPassword}</div>}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '0.4rem' }}>
            <button
              type="submit"
              className="global-button blue small"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
          </form>

          <p className={`${styles.linkTextContainer} standardTextFont`}>
            Already have an account?{' '}
            <Link to="/login" className="tableCellLink">
              Login here
            </Link>
          </p>
        </ContentBoxWithTitle>
      </div>
    </div>
  );
}
