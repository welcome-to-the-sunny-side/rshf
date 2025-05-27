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

  const handleAction = (accepted) => {
    if (!user) {
        alert('You must be logged in to perform this action.');
        return;
    }
    // This is a dummy action as the backend endpoint is not ready.
    // It updates local state to simulate report resolution.
    alert(`Report ${accepted ? 'accepted' : 'rejected'}! (Client-side simulation)`);
    setReportData(prev => ({
      ...prev,
      resolved: true,
      // Store resolution details locally for UI update
      locally_resolved_accepted: accepted, 
      locally_resolved_by_username: user.user_id, // Use current user's ID
      locally_resolved_by_rating: null, // Rating not available directly, could fetch if needed
      locally_resolved_review_date: new Date().toISOString().split('T')[0],
      locally_resolved_reviewer_note: actionReviewerNote,
      locally_resolved_reporter_status_change: actionReporterStatus,
      locally_resolved_respondent_status_change: actionRespondentStatus,
    }));
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

  // Determine if the report is active (not resolved)
  const isActive = !reportData.resolved;
  // For locally resolved reports, use the locally stored 'accepted' status
  const isAccepted = reportData.resolved ? (reportData.locally_resolved_accepted !== undefined ? reportData.locally_resolved_accepted : null) : null;

  return (
    <div className="page-container">
      <GroupNavBar groupId={groupId} showModViewButton={isModerator} />
      
      <ContentBoxWithTitle title="Report Details" backgroundColor="rgb(240, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
          <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '1em' }}>
            Report Status<strong>:</strong>{' '}
            <span style={{
              color: isActive ? 'rgb(230, 126, 34)' : (isAccepted === true ? 'rgb(0, 150, 0)' : (isAccepted === false ? 'rgb(200, 0, 0)' : 'rgb(100, 100, 100)'))
            }}>
              {isActive ? 'Active' : (isAccepted === true ? 'Accepted' : (isAccepted === false ? 'Rejected' : 'Resolved'))}
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
              to={`/user/${reportData.reporter_user_id}`} 
              className="tableCellLink" 
              style={{ color: getRatingColor(reportData.reporter_rating_at_report_time), fontWeight: 'bold' }}
            >
              {reportData.reporter_user_id}
            </Link>
            {reportData.reporter_rating_at_report_time !== null && ` (Rating: ${reportData.reporter_rating_at_report_time})`}
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
            {reportData.respondent_rating_at_report_time !== null && ` (Rating: ${reportData.respondent_rating_at_report_time})`}
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
      
      {isActive && isModerator && (
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
      
      {reportData.resolved && (
        <ContentBoxWithTitle 
          title="Review Outcome" 
          backgroundColor={isAccepted === true ? "rgb(230, 255, 240)" : (isAccepted === false ? "rgb(255, 230, 230)" : "rgb(240, 240, 240)")}
        >
          <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(reportData.resolved_by || reportData.locally_resolved_by_username) && (
                <div>
                  <strong>Reviewed By:</strong>{' '}
                  <Link 
                    to={`/user/${reportData.locally_resolved_by_username || reportData.resolved_by}`} 
                    className="tableCellLink" 
                    style={{ color: getRatingColor(reportData.locally_resolved_by_rating || reportData.resolver_rating_at_resolve_time), fontWeight: 'bold' }}
                  >
                    {reportData.locally_resolved_by_username || reportData.resolved_by}
                  </Link>
                  {(reportData.locally_resolved_by_rating || reportData.resolver_rating_at_resolve_time) !== null && 
                    ` (Rating: ${reportData.locally_resolved_by_rating || reportData.resolver_rating_at_resolve_time})`
                  }
                </div>
              )}
              
              {reportData.locally_resolved_review_date && (
                 <div>
                   <strong>Review Date:</strong> {formatDate(reportData.locally_resolved_review_date)}
                 </div>
              )}
              
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ 
                  color: isAccepted === true ? 'rgb(0, 150, 0)' : (isAccepted === false ? 'rgb(200, 0, 0)' : 'rgb(100,100,100)'),
                  fontWeight: 'bold'
                }}>
                  {isAccepted === true ? 'Accepted' : (isAccepted === false ? 'Rejected' : 'Resolved (Status Unknown)')}
                </span>
              </div>
              
              {/* Display status changes only if resolved locally, as API doesn't provide this for pre-resolved reports */}
              {reportData.locally_resolved_reporter_status_change && (
                <div>
                  <strong>Reporter Status Set To:</strong> {reportData.locally_resolved_reporter_status_change}
                </div>
              )}
              
              {reportData.locally_resolved_respondent_status_change && (
                <div>
                  <strong>Respondent Status Set To:</strong> {reportData.locally_resolved_respondent_status_change}
                </div>
              )}
              
              {(reportData.resolve_message || reportData.locally_resolved_reviewer_note) && (
                <div className={styles.aboutBox} style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Reviewer's Note:</h4>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{reportData.locally_resolved_reviewer_note || reportData.resolve_message}</p>
                </div>
              )}
            </div>
          </div>
        </ContentBoxWithTitle>
      )}
    </div>
  );
}