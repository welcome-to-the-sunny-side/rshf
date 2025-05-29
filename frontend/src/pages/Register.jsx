import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import styles from './Login.module.css';
import waifuImage from '../assets/rshf_waifu_register_pose.webp';
import formInputStyles from '../components/FormInput.module.css';
import useIsMobile from '../utils/useIsMobile'; // Import the mobile detection hook

export default function Register() {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    user_id: '',
    cf_handle: '',
    email_id: '',
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
    
    if (!formData.cf_handle.trim()) {
      errors.cf_handle = 'Codeforces handle is required';
    }
    
    if (!formData.email_id.trim()) {
      errors.email_id = 'Email address is required';
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email_id)) {
      errors.email_id = 'Invalid email address';
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
    
    // Set user_id to cf_handle
    const userData = {
      user_id: formData.cf_handle,
      cf_handle: formData.cf_handle,
      email_id: formData.email_id,
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

  return isMobile ? (
    <div className={styles.mobileLoginPage}>
      <div className={styles.mobileFormSide}>
        <ContentBoxWithTitle
          className={styles.mobileLoginFormContainer}
          title={<span>Register</span>}
          backgroundColor="rgb(230, 255, 230)"
          contentPadding="1.2rem 1rem"
        >
          {error && <div className={styles.errorMessage}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className={`standardTextFont`} style={{marginBottom: '1rem', background: '#e6f7ff', border: '1px solid #91d5ff', padding: '0.75rem', borderRadius: '6px', color: '#005480'}}>
              <strong>Important:</strong> Before registering, please make a submission that results in a <b>compilation error</b> to <a href="https://codeforces.com/problemset/problem/1188/B" target="_blank" rel="noopener noreferrer">this problem</a>. Registration will only work if your latest submission meets this requirement and was made within the last 5 minutes.
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="cf_handle" className={`${styles.formLabel} standardTextFont`}>Codeforces Username</label>
              <input
                type="text"
                id="cf_handle"
                name="cf_handle"
                value={formData.cf_handle}
                onChange={handleChange}
                placeholder="Your Codeforces Username"
                disabled={loading}
                className={formInputStyles.formInput}
              />
              {formErrors.cf_handle && <div className={styles.fieldError}>{formErrors.cf_handle}</div>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email_id" className={`${styles.formLabel} standardTextFont`}>Email Address</label>
              <input
                type="email"
                id="email_id"
                name="email_id"
                value={formData.email_id}
                onChange={handleChange}
                placeholder="Your email address"
                disabled={loading}
                className={formInputStyles.formInput}
              />
              {formErrors.email_id && <div className={styles.fieldError}>{formErrors.email_id}</div>}
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
                className={formInputStyles.formInput}
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
                className={formInputStyles.formInput}
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
  ) : (
    <div className={styles.loginPage}>
      <div className={styles.formSide} style={{ paddingRight: 0, paddingLeft: 0, paddingTop: '50px', marginRight: 0, justifyContent: 'flex-end' }}>
        <ContentBoxWithTitle
          className={styles.loginFormContainer}
          style={{ marginRight: 0 }}
          title={<span>Register</span>}
          backgroundColor="rgb(230, 255, 230)"
          contentPadding="0.75rem"
        >
          {error && <div className={styles.errorMessage}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className={`standardTextFont`} style={{marginBottom: '1rem', background: '#e6f7ff', border: '1px solid #91d5ff', padding: '0.75rem', borderRadius: '6px', color: '#005480'}}>
              <strong>Important:</strong> Before registering, please make a submission that results in a <b>compilation error</b> to <a href="https://codeforces.com/problemset/problem/1188/B" target="_blank" rel="noopener noreferrer">this problem</a>. Registration will only work if your latest submission meets this requirement and was made within the last 5 minutes.
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="cf_handle" className={`${styles.formLabel} standardTextFont`}>Codeforces Username</label>
              <input
                type="text"
                id="cf_handle"
                name="cf_handle"
                value={formData.cf_handle}
                onChange={handleChange}
                placeholder="Your Codeforces Username"
                disabled={loading}
                className={formInputStyles.formInput}
              />
              {formErrors.cf_handle && <div className={styles.fieldError}>{formErrors.cf_handle}</div>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email_id" className={`${styles.formLabel} standardTextFont`}>Email Address</label>
              <input
                type="email"
                id="email_id"
                name="email_id"
                value={formData.email_id}
                onChange={handleChange}
                placeholder="Your email address"
                disabled={loading}
                className={formInputStyles.formInput}
              />
              {formErrors.email_id && <div className={styles.fieldError}>{formErrors.email_id}</div>}
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
                className={formInputStyles.formInput}
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
                className={formInputStyles.formInput}
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
      <div className={styles.waifuContainer} style={{ justifyContent: 'flex-start', marginLeft: 0, paddingLeft: 0 }}>
        <img src={waifuImage} alt="RSHF Waifu" className={styles.waifuImage} style={{ marginLeft: 0, paddingLeft: 0, paddingRight: '60px' }} />
      </div>
    </div>
  );
}
