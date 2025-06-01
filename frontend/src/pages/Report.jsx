import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getRatingColor } from '../utils/ratingUtils';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import GroupNavBar from '../components/GroupNavBar';
import styles from './Group.module.css'; // Assuming styles are relevant

export default function Report() {
  const { groupId, reportId } = useParams();
  const { user, token } = useAuth();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModerator, setIsModerator] = useState(false);

  // State for form inputs in the "Take Action" section
  const [actionReporterStatus, setActionReporterStatus] = useState('No change');
  const [actionRespondentStatus, setActionRespondentStatus] = useState('Member');
  const [actionReviewerNote, setActionReviewerNote] = useState('');

  useEffect(() => {
    const fetchReportDetails = async () => {
      if (!token || !reportId) {
        setLoading(false);
        setError('Report ID missing or not authenticated.');
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get(`/api/report`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { report_id: reportId },
        });
        if (response.data && response.data.length > 0) {
          setReportData(response.data[0]); // Expecting a single report in an array
          setError(null);
        } else {
          setError('Report not found or access denied.');
          setReportData(null);
        }
      } catch (err) {
        console.error('Failed to fetch report details:', err);
        setError('Failed to load report details. Please try again later.');
        setReportData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReportDetails();
  }, [reportId, token]);

  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !token || !groupId) {
        setIsModerator(false);
        return;
      }
      try {
        const response = await axios.get(`/api/membership`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId, user_id: user.user_id },
        });
        if (response.data && (response.data.role === 'moderator' || response.data.role === 'admin')) {
          setIsModerator(true);
        } else {
          setIsModerator(false);
        }
      } catch (err) {
        console.error('Failed to check membership:', err);
        setIsModerator(false);
      }
    };

    checkMembership();
  }, [groupId, user, token]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleAction = async (accepted) => {
    if (!user) {
        alert('You must be logged in to perform this action.');
        return;
    }
    
    try {
      setLoading(true);
      // Make API call to resolve the report
      await axios.put('/api/report/resolve', {
        report_id: reportId,
        resolver_user_id: user.user_id,
        resolve_message: actionReviewerNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch the updated report data
      const response = await axios.get(`/api/report`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { report_id: reportId },
      });
      
      if (response.data && response.data.length > 0) {
        setReportData(response.data[0]);
        alert(`Report successfully ${accepted ? 'accepted' : 'rejected'}!`);
      }
    } catch (err) {
      console.error('Failed to resolve report:', err);
      alert(`Failed to ${accepted ? 'accept' : 'reject'} report. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container standardTextFont">Loading report details...</div>;
  }

  if (error) {
    return <div className="page-container standardTextFont" style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!reportData) {
    return <div className="page-container standardTextFont">Report not found.</div>;
  }

    // Use latest schema fields
  const isResolved = !!reportData.resolved;
  const isAccepted = reportData.accepted === true ? true : (reportData.accepted === false ? false : null);

  return (
    <div className="page-container">
      <GroupNavBar groupId={groupId} showModViewButton={isModerator} />
      
      <ContentBoxWithTitle title="Report Details" backgroundColor="rgb(240, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
          <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '1em' }}>
            Report Status<strong>:</strong>{' '}
            <span style={{
              color: !isResolved ? 'rgb(230, 126, 34)' : (isAccepted === true ? 'green' : (isAccepted === false ? 'red' : 'gray')),
              fontWeight: 'bold'
            }}>
              {!isResolved ? 'Active' : (isAccepted === true ? 'Accepted' : (isAccepted === false ? 'Rejected' : '-'))}
            </span>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Report ID:</strong> {reportData.report_id}
          </div>
          
          {reportData.contest_id && (
            <div style={{ marginBottom: '15px' }}>
              <strong>Contest:</strong>{' '}
              <Link to={`/contest/${reportData.contest_id}`} className="tableCellLink">
                {reportData.contest_id}
              </Link>
            </div>
          )}
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Reporter:</strong>{' '}
            <Link 
              to={`/user/${reportData.reporter_cf_handle}`} 
              className="tableCellLink" 
              style={{ color: getRatingColor(reportData.reporter_rating_at_report_time), fontWeight: 'bold' }}
            >
              {reportData.reporter_cf_handle}
            </Link>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Respondent:</strong>{' '}
            <Link 
              to={`/user/${reportData.respondent_user_id}`} 
              className="tableCellLink" 
              style={{ color: getRatingColor(reportData.respondent_rating_at_report_time), fontWeight: 'bold' }}
            >
              {reportData.respondent_user_id}
            </Link>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Report Date:</strong> {formatDate(reportData.timestamp)}
          </div>
          
          <div className={styles.aboutBox} style={{ marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Report Text:</h4>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reportData.report_description}</p>
          </div>
        </div>
      </ContentBoxWithTitle>
      
      {!isResolved && isModerator && (
        <ContentBoxWithTitle title="Take Action" backgroundColor="rgb(255, 245, 230)">
          <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label htmlFor="reporter-status" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Reporter Status Change:
                </label>
                <select
                  id="reporter-status"
                  value={actionReporterStatus}
                  onChange={(e) => setActionReporterStatus(e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '160px'
                  }}
                >
                  <option value="No change">No change</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Member">Member</option>
                  <option value="Outsider">Outsider</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="respondent-status" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Respondent Status Change:
                </label>
                <select
                  id="respondent-status"
                  value={actionRespondentStatus}
                  onChange={(e) => setActionRespondentStatus(e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '160px'
                  }}
                >
                  <option value="Member">Member</option>
                  <option value="Outsider">Outsider</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="reviewer-note" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Reviewer's Note:
              </label>
              <textarea
                id="reviewer-note"
                value={actionReviewerNote}
                onChange={(e) => setActionReviewerNote(e.target.value)}
                maxLength={1000}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleAction(true)}
                className="global-button green"
              >
                Accept Report
              </button>
              <button
                onClick={() => handleAction(false)}
                className="global-button red"
              >
                Reject Report
              </button>
            </div>
          </div>
        </ContentBoxWithTitle>
      )}
      
      {isResolved && (
        <ContentBoxWithTitle 
          title="Review Outcome" 
          backgroundColor={isAccepted === true ? "rgb(230, 255, 240)" : (isAccepted === false ? "rgb(255, 230, 230)" : "rgb(240, 240, 240)")}
        >
          <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportData.resolver_cf_handle && (
                <div>
                  <strong>Reviewed By:</strong>{' '}
                  <Link 
                    to={`/user/${reportData.resolver_cf_handle}`} 
                    className="tableCellLink" 
                    style={{ color: getRatingColor(reportData.resolver_rating_at_resolve_time), fontWeight: 'bold' }}
                  >
                    {reportData.resolver_cf_handle}
                  </Link>
                </div>
              )}
              {reportData.resolve_time_stamp && (
                <div>
                  <strong>Resolve Date:</strong> {formatDate(reportData.resolve_time_stamp)}
                </div>
              )}
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ 
                  color: isAccepted === true ? 'green' : (isAccepted === false ? 'red' : 'gray'),
                  fontWeight: 'bold'
                }}>
                  {isAccepted === true ? 'Accepted' : (isAccepted === false ? 'Rejected' : '-')}
                </span>
              </div>
            <div>
                <strong>Result:</strong> {reportData.respondent_role_before ? reportData.respondent_role_before : '-' } {'->'} {reportData.respondent_role_after ? reportData.respondent_role_after : '-' }
            </div>
              {reportData.resolve_message && (
                <div className={styles.aboutBox} style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Reviewer's Note:</h4>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reportData.resolve_message}</p>
                </div>
              )}
            </div>
          </div>
        </ContentBoxWithTitle>
      )}
    </div>
  );
}