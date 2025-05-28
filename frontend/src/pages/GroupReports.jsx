import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './GroupReports.module.css';

export default function GroupReports() {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  
  // State for report form
  const [respondent, setRespondent] = useState('');
  const [contestIds, setContestIds] = useState('');
  const [reportText, setReportText] = useState('');
  
  // State for reports data
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // User role state
  const [userRole, setUserRole] = useState(null);
  const [showModViewButton, setShowModViewButton] = useState(false);
  
  // Check if user is a member or moderator
  const isLoggedInUserMember = userRole === "moderator" || userRole === "member" || userRole === "admin";
  
  // Check user's membership in the group to determine role
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !token) {
        setUserRole(null);
        setShowModViewButton(false);
        return;
      }
      
      try {
        const response = await axios.get(`/api/membership`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId, user_id: user.user_id }
        });
        
        if (response.data && response.data.role) {
          setUserRole(response.data.role);
          setShowModViewButton(response.data.role === "moderator" || response.data.role === "admin");
        } else {
          setUserRole(null);
          setShowModViewButton(false);
        }
      } catch (err) {
        console.error('Failed to check membership:', err);
        setUserRole(null);
        setShowModViewButton(false);
      }
    };
    
    if (groupId) {
      checkMembership();
    }
  }, [groupId, user, token]);
  
  // Fetch reports data
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/report`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { group_id: groupId }
        });
        
        setReportsData(response.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
        setError('Failed to load reports. Please try again later.');
        setReportsData([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (groupId) {
      fetchReports();
    }
  }, [groupId, token]);
  
  // Handle report creation
  const handleCreateReport = async () => {
    if (!user || !token || !isLoggedInUserMember) {
      setSubmitError('You must be logged in and a member of this group to submit a report.');
      return;
    }
    
    if (!respondent.trim()) {
      setSubmitError('Please enter a respondent username.');
      return;
    }
    
    if (!reportText.trim()) {
      setSubmitError('Please enter a report description.');
      return;
    }
    
    try {
      setSubmitLoading(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      
      const payload = {
        group_id: groupId,
        contest_id: contestIds.trim(),
        reporter_user_id: user.user_id,
        respondent_user_id: respondent.trim(),
        report_description: reportText.trim()
      };
      
      await axios.post(`/api/report`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSubmitSuccess(true);
      setRespondent('');
      setContestIds('');
      setReportText('');
      
      // Refresh the reports list
      const response = await axios.get(`/api/report`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { group_id: groupId }
      });
      
      setReportsData(response.data);
    } catch (err) {
      console.error('Failed to create report:', err);
      setSubmitError(err.response?.data?.detail || 'Failed to create report. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Split reports into active and processed
  const activeReports = reportsData.filter(report => !report.resolved);
  const processedReports = reportsData.filter(report => report.resolved);

  // Function to transform report data into table rows
  const transformReportsData = (reports, includeHandledBy = false) => {
    return reports.map(report => {
      // Create the "Contest ID" content
      const contestContent = report.contest_id ? (
        <Link to={`/group/${groupId}/contest/${report.contest_id}`} className="tableCellLink">
          {report.contest_id}
        </Link>
      ) : (
        <span>-</span>
      );
      
      // Create the row data with base columns
      const rowData = [
        report.report_id,
        contestContent,
        <Link to={`/user/${report.reporter_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.reporter_rating_at_report_time), fontWeight: 'bold' }}>
          {report.reporter_cf_handle}
        </Link>,
        <Link to={`/user/${report.respondent_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.respondent_rating_at_report_time), fontWeight: 'bold' }}>
          {report.respondent_cf_handle}
        </Link>,
        formatDate(report.timestamp),
      ];
      
      // Add resolved by and resolution message for processed reports
      if (includeHandledBy && report.resolved) {
        rowData.push(
          <Link to={`/user/${report.resolver_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.resolver_rating_at_resolve_time), fontWeight: 'bold' }}>
            {report.resolver_cf_handle}
          </Link>
        );
        
        // Add resolve date if available
        rowData.push(report.resolve_timestamp ? formatDate(report.resolve_timestamp) : formatDate(report.timestamp));
      }
      
      // Add action button
      rowData.push(
        <Link 
          to={`/group/${groupId}/report/${report.report_id}`}
          className="global-button blue small"
        >
          View →
        </Link>
      );
      
      return rowData;
    });
  };

  // Define columns for the tables
  const activeColumns = ["Report ID", "Contest ID", "Reporter", "Respondent", "Report Date", "Action"];
  const processedColumns = [...activeColumns.slice(0, -1), "Resolved By", "Resolve Date", "Action"];
  
  // Transform the data for the table components
  const activeTableRows = transformReportsData(activeReports);
  const processedTableRows = transformReportsData(processedReports, true);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Error message */}
      {error && (
        <div className="error-message" style={{ color: 'red', margin: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator" style={{ textAlign: 'center', margin: '50px' }}>
          Loading reports...
        </div>
      ) : (
        <>
          {/* Create Report Box - Only show for members */}
          {isLoggedInUserMember && (
            <ContentBoxWithTitle title="Create Report" backgroundColor="rgb(240, 240, 255)">
              <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
                {submitSuccess && (
                  <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    Report successfully created!
                  </div>
                )}
                
                {submitError && (
                  <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    {submitError}
                  </div>
                )}
                
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="respondent" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Respondent:
                  </label>
                  <input
                    id="respondent"
                    type="text"
                    value={respondent}
                    onChange={(e) => setRespondent(e.target.value)}
                    disabled={submitLoading}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="contest-ids" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Contest ID:
                  </label>
                  <input
                    id="contest-ids"
                    type="text"
                    value={contestIds}
                    onChange={(e) => setContestIds(e.target.value)}
                    disabled={submitLoading}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="report-text" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    Report (Max 500 characters):
                  </label>
                  <textarea
                    id="report-text"
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    disabled={submitLoading}
                    maxLength={500}
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
                
                <button
                  onClick={handleCreateReport}
                  disabled={submitLoading}
                  className="global-button blue"
                >
                  {submitLoading ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </ContentBoxWithTitle>
          )}
          
          {/* Reports Tables */}
          <div className={styles.reportsTableWrapper}>
            {/* Active Reports Table */}
            <SortablePagedTableBox 
              title="Active Reports"
              columns={activeColumns}
              data={activeTableRows}
              backgroundColor="rgb(255, 245, 230)" // Light orange
              itemsPerPage={10}
              initialSortColumnIndex={0} // Report ID column
              initialSortDirection="desc" // Descending order
              className="activeReportsTable"
            />
            
            {/* Processed Reports Table */}
            <SortablePagedTableBox 
              title="Processed Reports"
              columns={processedColumns}
              data={processedTableRows}
              backgroundColor="rgb(230, 255, 240)" // Light green
              itemsPerPage={10}
              initialSortColumnIndex={0} // Report ID column
              initialSortDirection="desc" // Descending order
              className="processedReportsTable"
            />
          </div>
        </>
      )}
    </div>
  );
} 