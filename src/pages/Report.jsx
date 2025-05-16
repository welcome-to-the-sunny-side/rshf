import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRatingColor } from '../utils/ratingUtils';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import GroupNavBar from '../components/GroupNavBar';
import styles from './Group.module.css'; // Import the styles from Group.jsx

export default function Report() {
  const { groupId, reportId } = useParams();
  
  // State for form inputs in the "Take Action" section
  const [reporterStatus, setReporterStatus] = useState('Member');
  const [respondentStatus, setRespondentStatus] = useState('Member');
  const [reviewerNote, setReviewerNote] = useState('');
  
  // Sample report data - in a real app, this would come from an API call
  // Note: isActive field would determine whether this is an active or processed report
  const [report, setReport] = useState({
    id: reportId,
    contestId: 246,
    isActive: false, // This would come from the backend
    reporter: {
      username: "alice",
      rating: 2185,
      currentStatus: "Member", // Current status of reporter in the group
      reportAccuracy: { accepted: 12, total: 15 }
    },
    respondent: {
      username: "frank",
      rating: 2100,
      currentStatus: "Member", // Current status of respondent in the group
      previouslyRemovedFromThisGroup: false,
      previousReportIds: []
    },
    reportDate: "2024-03-20",
    reportText: "User was found to be using external resources during the contest. The solution was identical to a solution found online with minor modifications.",
    // Fields below would only be populated for processed reports
    reviewer: {
      username: "moderator1",
      rating: 2300
    },
    reviewDate: "2024-03-22",
    reviewerNote: "Verified the similarities between the solution and online resources. Clear violation of contest rules.",
    accepted: true,
    reporterStatusChange: "No change",
    respondentStatusChange: "Outsider"
  });

  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle action submission (accept or reject)
  const handleAction = (accepted) => {
    console.log('Taking action:', { 
      reportId, 
      accepted, 
      reporterStatus, 
      respondentStatus, 
      reviewerNote 
    });
    // In a real app, this would call an API to process the report
    alert(`Report ${accepted ? 'accepted' : 'rejected'}!`);
    
    // Update local state to show the processed view
    setReport(prev => ({
      ...prev,
      isActive: false,
      accepted: accepted,
      reviewer: {
        username: "moderator1", // In a real app, this would be the current user
        rating: 2300
      },
      reviewDate: new Date().toISOString().split('T')[0],
      reviewerNote: reviewerNote,
      reporterStatusChange: reporterStatus,
      respondentStatusChange: respondentStatus
    }));
  };

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={true} />
      
      {/* Report Details Box */}
      <ContentBoxWithTitle title="Report Details" backgroundColor="rgb(240, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
          {/* Display report status at the top */}
          <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1em' }}>
            <strong>Report Status:</strong>{' '}
            <span style={{ 
              color: report.isActive ? 'rgb(230, 126, 34)' : (report.accepted ? 'rgb(0, 150, 0)' : 'rgb(200, 0, 0)') 
            }}>
              {report.isActive ? 'Active' : (report.accepted ? 'Accepted' : 'Rejected')}
            </span>
          </div>
          
          {/* List of details */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <strong>Report ID:</strong> {report.id}
              </div>
              
              <div>
                <strong>Contest ID:</strong>{' '}
                {report.contestId ? (
                  <Link to={`/group/${groupId}/contest/${report.contestId}`} className="tableCellLink">
                    {report.contestId}
                  </Link>
                ) : (
                  <span>-</span>
                )}
              </div>
              
              <div>
                <strong>Reporter:</strong>{' '}
                <Link to={`/user/${report.reporter.username}`} className="tableCellLink" style={{ color: getRatingColor(report.reporter.rating), fontWeight: 'bold' }}>
                  {report.reporter.username}
                </Link>
              </div>
              
              <div>
                <strong>Report Accuracy:</strong>{' '}
                <span title={`${report.reporter.reportAccuracy.accepted} accepted out of ${report.reporter.reportAccuracy.total} reports`}>
                  {Math.round((report.reporter.reportAccuracy.accepted / report.reporter.reportAccuracy.total) * 100)}% 
                  ({report.reporter.reportAccuracy.accepted}/{report.reporter.reportAccuracy.total})
                </span>
              </div>
              
              <div>
                <strong>Respondent:</strong>{' '}
                <Link to={`/user/${report.respondent.username}`} className="tableCellLink" style={{ color: getRatingColor(report.respondent.rating), fontWeight: 'bold' }}>
                  {report.respondent.username}
                </Link>
              </div>
              
              <div>
                <strong>Previously Removed:</strong>{' '}
                {report.respondent.previouslyRemovedFromThisGroup ? (
                  <div style={{ color: 'red', display: 'inline' }}>
                    Yes - 
                    {report.respondent.previousReportIds.map((reportId, index) => (
                      <span key={reportId}>
                        {index > 0 && ", "}
                        <Link to={`/group/${groupId}/report/${reportId}`} className="tableCellLink">
                          {reportId}
                        </Link>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'green', display: 'inline' }}>No</div>
                )}
              </div>
              
              <div>
                <strong>Report Date:</strong> {formatDate(report.reportDate)}
              </div>
            </div>
          </div>
          
          {/* Report message box styled like the about box in Group.jsx - moved below the list */}
          <div className={styles.aboutBox}>
            <h4 style={{ margin: '0 0 8px 0' }}>Report Message:</h4>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.reportText}</p>
          </div>
        </div>
      </ContentBoxWithTitle>
      
      {/* Conditional rendering based on report status */}
      {report.isActive ? (
        // For active reports - display the "Take Action" section
        <ContentBoxWithTitle title="Take Action" backgroundColor="rgb(255, 245, 230)">
          <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="reporter-status" style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>
                  Modify Reporter Status: <span style={{ fontWeight: 'bold' }}>{report.reporter.currentStatus}</span> →
                </label>
                <select
                  id="reporter-status"
                  value={reporterStatus}
                  onChange={(e) => setReporterStatus(e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '160px'
                  }}
                >
                  <option value="Moderator">Moderator</option>
                  <option value="Member">Member</option>
                  <option value="Outsider">Outsider</option>
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="respondent-status" style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>
                  Modify Respondent Status: <span style={{ fontWeight: 'bold' }}>{report.respondent.currentStatus}</span> →
                </label>
                <select
                  id="respondent-status"
                  value={respondentStatus}
                  onChange={(e) => setRespondentStatus(e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '160px'
                  }}
                >
                  <option value="Moderator">Moderator</option>
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
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
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
      ) : (
        // For processed reports - display the review outcome
        <ContentBoxWithTitle 
          title="Review Outcome" 
          backgroundColor={report.accepted ? "rgb(230, 255, 240)" : "rgb(255, 230, 230)"}
        >
          <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <strong>Reviewed By:</strong>{' '}
                <Link to={`/user/${report.reviewer.username}`} className="tableCellLink" style={{ color: getRatingColor(report.reviewer.rating), fontWeight: 'bold' }}>
                  {report.reviewer.username}
                </Link>
              </div>
              
              <div>
                <strong>Review Date:</strong> {formatDate(report.reviewDate)}
              </div>
              
              <div>
                <strong>Status:</strong>{' '}
                <span style={{ 
                  color: report.accepted ? 'rgb(0, 150, 0)' : 'rgb(200, 0, 0)',
                  fontWeight: 'bold'
                }}>
                  {report.accepted ? 'Accepted' : 'Rejected'}
                </span>
              </div>
              
              <div>
                <strong>Reporter Status Change:</strong>{' '}
                <span style={{ fontWeight: 'bold' }}>{report.reporter.currentStatus}</span> → {report.reporterStatusChange}
              </div>
              
              <div>
                <strong>Respondent Status Change:</strong>{' '}
                <span style={{ fontWeight: 'bold' }}>{report.respondent.currentStatus}</span> → {report.respondentStatusChange}
              </div>
              
              <div className={styles.aboutBox} style={{ marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Reviewer's Note:</h4>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.reviewerNote}</p>
              </div>
            </div>
          </div>
        </ContentBoxWithTitle>
      )}
    </div>
  );
} 