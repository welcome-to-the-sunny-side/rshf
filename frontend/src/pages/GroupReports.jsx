import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LazyLoadingSortablePagedTableBox from '../components/LazyLoadingSortablePagedTableBox';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css'; // For consistent loading/error message styling
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
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // User role state
  const [userRole, setUserRole] = useState(null);
  const [showModViewButton, setShowModViewButton] = useState(false);
  const isLoggedInUserMember = userRole === "moderator" || userRole === "member" || userRole === "admin";

  // State for Active Reports (unresolved)
  const [activeReports, setActiveReports] = useState([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [activeSort, setActiveSort] = useState({ key: 'timestamp', direction: 'desc' });
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState(null);

  // State for Processed Reports (resolved)
  const [processedReports, setProcessedReports] = useState([]);
  const [processedTotal, setProcessedTotal] = useState(0);
  const [processedPage, setProcessedPage] = useState(1);
  const [processedSort, setProcessedSort] = useState({ key: 'resolve_time_stamp', direction: 'desc' });
  const [processedLoading, setProcessedLoading] = useState(true);
  const [processedError, setProcessedError] = useState(null);
  const [refreshActiveReportsSignal, setRefreshActiveReportsSignal] = useState(0);

  const itemsPerPage = 10;
  const API_BASE_URL = '/api';

  // Check user's membership in the group to determine role
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !token) {
        setUserRole(null);
        setShowModViewButton(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/membership`, {
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
    if (groupId && token) {
      checkMembership();
    }
  }, [groupId, token]);

  // Fetch total count for Active Reports
  useEffect(() => {
    if (!groupId || !token) return;
    setActiveLoading(true);
    fetch(`${API_BASE_URL}/report_size?group_id=${groupId}&resolved=false`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_COUNT);
      return res.json();
    })
    .then(data => setActiveTotal(data.count))
    .catch(err => {
      console.error('Failed to fetch active reports count:', err);
      setActiveError(err.message);
    });
  }, [groupId, token, refreshActiveReportsSignal]);

  // Fetch paginated Active Reports data
  useEffect(() => {
    if (!groupId || !token) return;
    setActiveLoading(true);
    const skip = (activePage - 1) * itemsPerPage;
    fetch(`${API_BASE_URL}/report_range_fetch?group_id=${groupId}&resolved=false&sort_by=${activeSort.key}&sort_order=${activeSort.direction}&skip=${skip}&limit=${itemsPerPage}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_REPORTS);
      return res.json();
    })
    .then(data => {
      setActiveReports(data.items || []);
      // If total was not fetched yet or changed, update it from this response if available
      if (typeof data.total === 'number' && data.total !== activeTotal) {
        setActiveTotal(data.total);
      }
    })
    .catch(err => {
      console.error('Failed to fetch active reports:', err);
      setActiveError(err.message);
      setActiveReports([]);
    })
    .finally(() => setActiveLoading(false));
  }, [groupId, token, activePage, activeSort, itemsPerPage, refreshActiveReportsSignal]);

  // Fetch total count for Processed Reports
  useEffect(() => {
    if (!groupId || !token) return;
    setProcessedLoading(true);
    fetch(`${API_BASE_URL}/report_size?group_id=${groupId}&resolved=true`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_COUNT);
      return res.json();
    })
    .then(data => setProcessedTotal(data.count))
    .catch(err => {
      console.error('Failed to fetch processed reports count:', err);
      setProcessedError(err.message);
    });
  }, [groupId, token]);

  // Fetch paginated Processed Reports data
  useEffect(() => {
    if (!groupId || !token) return;
    setProcessedLoading(true);
    const skip = (processedPage - 1) * itemsPerPage;
    fetch(`${API_BASE_URL}/report_range_fetch?group_id=${groupId}&resolved=true&sort_by=${processedSort.key}&sort_order=${processedSort.direction}&skip=${skip}&limit=${itemsPerPage}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_REPORTS);
      return res.json();
    })
    .then(data => {
      setProcessedReports(data.items || []);
      if (typeof data.total === 'number' && data.total !== processedTotal) {
        setProcessedTotal(data.total);
      }
    })
    .catch(err => {
      console.error('Failed to fetch processed reports:', err);
      setProcessedError(err.message);
      setProcessedReports([]);
    })
    .finally(() => setProcessedLoading(false));
  }, [groupId, token, processedPage, processedSort, itemsPerPage, processedTotal]);

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
      
      setActivePage(1); // Reset to first page
      setRefreshActiveReportsSignal(prev => prev + 1); // Trigger refetch of total and list
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

// Fetch total count for Active Reports
useEffect(() => {
  if (!groupId || !token) return;
  setActiveLoading(true);
  fetch(`${API_BASE_URL}/report_size?group_id=${groupId}&resolved=false`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_COUNT);
    return res.json();
  })
  .then(data => setActiveTotal(data.count))
  .catch(err => {
    console.error('Failed to fetch active reports count:', err);
    setActiveError(err.message);
  });
}, [groupId, token]);

// Fetch paginated Active Reports data
useEffect(() => {
  if (!groupId || !token) return;
  setActiveLoading(true);
  const skip = (activePage - 1) * itemsPerPage;
  fetch(`${API_BASE_URL}/report_range_fetch?group_id=${groupId}&resolved=false&sort_by=${activeSort.key}&sort_order=${activeSort.direction}&skip=${skip}&limit=${itemsPerPage}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_REPORTS);
    return res.json();
  })
  .then(data => {
    setActiveReports(data.items || []);
    // If total was not fetched yet or changed, update it from this response if available
    if (typeof data.total === 'number' && data.total !== activeTotal) {
      setActiveTotal(data.total);
    }
  })
  .catch(err => {
    console.error('Failed to fetch active reports:', err);
    setActiveError(err.message);
    setActiveReports([]);
  })
  .finally(() => setActiveLoading(false));
}, [groupId, token, activePage, activeSort, itemsPerPage, activeTotal]);

// Fetch total count for Processed Reports
useEffect(() => {
  if (!groupId || !token) return;
  setProcessedLoading(true);
  fetch(`${API_BASE_URL}/report_size?group_id=${groupId}&resolved=true`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_COUNT);
    return res.json();
  })
  .then(data => setProcessedTotal(data.count))
  .catch(err => {
    console.error('Failed to fetch processed reports count:', err);
    setProcessedError(err.message);
  });
}, [groupId, token]);

// Fetch paginated Processed Reports data
useEffect(() => {
  if (!groupId || !token) return;
  setProcessedLoading(true);
  const skip = (processedPage - 1) * itemsPerPage;
  fetch(`${API_BASE_URL}/report_range_fetch?group_id=${groupId}&resolved=true&sort_by=${processedSort.key}&sort_order=${processedSort.direction}&skip=${skip}&limit=${itemsPerPage}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_REPORTS);
    return res.json();
  })
  .then(data => {
    setProcessedReports(data.items || []);
    if (typeof data.total === 'number' && data.total !== processedTotal) {
      setProcessedTotal(data.total);
    }
  })
  .catch(err => {
    console.error('Failed to fetch processed reports:', err);
    setProcessedError(err.message);
    setProcessedReports([]);
  })
  .finally(() => setProcessedLoading(false));
}, [groupId, token, processedPage, processedSort, itemsPerPage, processedTotal]);



// Column Definitions
const commonReportColumns = [
  {
    key: 'report_id',
    label: 'Report ID',
    sortable: true,
    render: (report) => report.report_id,
  },
  {
    key: 'contest_id',
    label: 'Contest ID',
    sortable: true,
    render: (report) => report.contest_id ? (
      <Link to={`/contest/${report.contest_id}`} className="tableCellLink">
        {report.contest_id}
      </Link>
    ) : 'N/A',
  },
  {
    key: 'reporter_cf_handle',
    label: 'Reporter',
    sortable: true,
    render: (report) => (
      <Link to={`/user/${report.reporter_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.reporter_rating_at_report_time), fontWeight: 'bold' }}>
        {report.reporter_cf_handle}
      </Link>
    ),
  },
  {
    key: 'respondent_cf_handle',
    label: 'Respondent',
    sortable: true,
    render: (report) => (
      <Link to={`/user/${report.respondent_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.respondent_rating_at_report_time), fontWeight: 'bold' }}>
        {report.respondent_cf_handle}
      </Link>
    ),
  },
];

const activeTableColumns = [
  ...commonReportColumns,
  {
    key: 'timestamp', // Corresponds to 'timestamp' in model
    label: 'Report Date',
    sortable: true,
    render: (report) => formatDate(report.timestamp),
  },
  {
    key: 'action_view_report_active',
    label: 'Action',
    sortable: false,
    render: (report) => (
      <Link to={`/report/${report.report_id}`} className="global-button blue small">
        View
      </Link>
    ),
  },
];

const processedTableColumns = [
  ...commonReportColumns,
  {
    key: 'resolver_cf_handle',
    label: 'Resolved By',
    sortable: true,
    render: (report) => report.resolver_cf_handle ? (
      <Link to={`/user/${report.resolver_cf_handle}`} className="tableCellLink" style={{ color: getRatingColor(report.resolver_rating_at_resolve_time), fontWeight: 'bold' }}>
        {report.resolver_cf_handle}
      </Link>
    ) : 'N/A',
  },
  {
    key: 'resolve_time_stamp', // Corresponds to 'resolve_time_stamp' in model
    label: 'Resolve Date',
    sortable: true,
    render: (report) => report.resolve_time_stamp ? formatDate(report.resolve_time_stamp) : 'N/A',
  },
  {
    key: 'action_view_report_processed',
    label: 'Action',
    sortable: false,
    render: (report) => (
      <Link to={`/report/${report.report_id}`} className="global-button blue small">
        View
      </Link>
    ),
  },
];

const handleActiveSort = (columnKey) => {
  setActivePage(1);
  setActiveSort((prevConfig) => ({
    key: columnKey,
    direction: prevConfig.key === columnKey && prevConfig.direction === 'asc' ? 'desc' : 'asc',
  }));
};

const handleProcessedSort = (columnKey) => {
  setProcessedPage(1);
  setProcessedSort((prevConfig) => ({
    key: columnKey,
    direction: prevConfig.key === columnKey && prevConfig.direction === 'asc' ? 'desc' : 'asc',
  }));
};

return (
  <div className="page-container">
    <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />

    {isLoggedInUserMember && (
      <ContentBoxWithTitle title="Create New Report" className={styles.formWrapper}>
        <div style={{ padding: '20px' }}>
          {submitSuccess && (
            <div className="api-feedback-container success-message" style={{ marginBottom: '15px' }}>
              Report created successfully!
            </div>
          )}
          {submitError && (
            <div className="api-feedback-container error-message" style={{ marginBottom: '15px' }}>
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
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
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
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
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
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px', resize: 'vertical' }}
            />
          </div>
          <button onClick={handleCreateReport} disabled={submitLoading} className="global-button blue">
            {submitLoading ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </ContentBoxWithTitle>
    )}

    <div className={styles.reportsTableWrapper}>
      {/* Active Reports Table */}
      <h2 className={styles.tableTitle}>Active Reports</h2>
      {activeLoading && activeReports.length === 0 && (
        <div className="api-feedback-container loading-message">{API_MESSAGES.LOADING}</div>
      )}
      {activeError && (
        <div className="api-feedback-container error-message">{activeError}</div>
      )}
      {!activeLoading && !activeError && activeReports.length === 0 && activeTotal === 0 && (
        <div className="api-feedback-container no-data-message">{API_MESSAGES.NO_REPORTS_ACTIVE}</div>
      )}
      {(activeReports.length > 0 || activeTotal > 0) && !activeError && (
        <LazyLoadingSortablePagedTableBox
          columns={activeTableColumns}
          items={activeReports}
          totalItems={activeTotal}
          itemsPerPage={itemsPerPage}
          currentPage={activePage}
          onPageChange={setActivePage}
          sortConfig={activeSort}
          onSortChange={handleActiveSort}
          isLoading={activeLoading && activeReports.length > 0} // Show subtle loading when loading more pages
          // error={activeError} // Error is handled above
          noDataMessage={API_MESSAGES.NO_REPORTS_ACTIVE} // Should not be hit if logic above is correct
          backgroundColor="rgb(255, 245, 230)"
          className="activeReportsTable"
        />
      )}

      {/* Processed Reports Table */}
      <h2 className={styles.tableTitle} style={{ marginTop: '30px' }}>Processed Reports</h2>
      {processedLoading && processedReports.length === 0 && (
        <div className="api-feedback-container loading-message">{API_MESSAGES.LOADING}</div>
      )}
      {processedError && (
        <div className="api-feedback-container error-message">{processedError}</div>
      )}
      {!processedLoading && !processedError && processedReports.length === 0 && processedTotal === 0 && (
        <div className="api-feedback-container no-data-message">{API_MESSAGES.NO_REPORTS_PROCESSED}</div>
      )}
      {(processedReports.length > 0 || processedTotal > 0) && !processedError && (
        <LazyLoadingSortablePagedTableBox
          columns={processedTableColumns}
          items={processedReports}
          totalItems={processedTotal}
          itemsPerPage={itemsPerPage}
          currentPage={processedPage}
          onPageChange={setProcessedPage}
          sortConfig={processedSort}
          onSortChange={handleProcessedSort}
          isLoading={processedLoading && processedReports.length > 0}
          // error={processedError}
          noDataMessage={API_MESSAGES.NO_REPORTS_PROCESSED}
          backgroundColor="rgb(230, 255, 240)"
          className="processedReportsTable"
        />
      )}
    </div>
  </div>
);
}