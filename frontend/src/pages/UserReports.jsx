import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import LazyLoadingSortablePagedTableBox from '../components/LazyLoadingSortablePagedTableBox';
import { API_MESSAGES } from '../constants/apiMessages';
import { useAuth } from '../context/AuthContext';
import UserNavBar from '../components/UserNavBar';
import { getRatingColor } from '../utils/ratingUtils';
import '../styles/apiFeedbackStyles.css';
import styles from './UserGroups.module.css'; // Reuse user page styles
import titleStyles from '../components/ContentBoxWithTitle.module.css';

export default function UserReports() {
  const { username } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Table state for each section
  const [activeAgainst, setActiveAgainst] = useState({ items: [], total: 0, page: 1, sort: { key: 'timestamp', direction: 'desc' }, loading: true, error: null });
  const [processedAgainst, setProcessedAgainst] = useState({ items: [], total: 0, page: 1, sort: { key: 'resolve_timestamp', direction: 'desc' }, loading: true, error: null });
  const [activeBy, setActiveBy] = useState({ items: [], total: 0, page: 1, sort: { key: 'timestamp', direction: 'desc' }, loading: true, error: null });
  const [processedBy, setProcessedBy] = useState({ items: [], total: 0, page: 1, sort: { key: 'resolve_timestamp', direction: 'desc' }, loading: true, error: null });

  const itemsPerPage = 10;
  const API_BASE_URL = '/api';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    setIsOwnProfile(user && username && user.user_id === username);
  }, [token, user, username, navigate]);

  // Fetch logic for each table
  const fetchReports = async (params, setter) => {
    setter((prev) => ({ ...prev, loading: true, error: null }));
    const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    try {
      const res = await fetch(`${API_BASE_URL}/report_range_fetch?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(API_MESSAGES.ERROR_FETCHING_REPORTS);
      const data = await res.json();
      setter((prev) => ({ ...prev, items: data.items || [], total: data.total || 0, loading: false }));
    } catch (err) {
      setter((prev) => ({ ...prev, error: err.message, loading: false }));
    }
  };

  // Fetch for each table
  useEffect(() => {
    fetchReports({ respondent_cf_handle: username, resolved: false, sort_by: activeAgainst.sort.key, sort_order: activeAgainst.sort.direction, skip: (activeAgainst.page - 1) * itemsPerPage, limit: itemsPerPage }, setActiveAgainst);
  }, [username, token, activeAgainst.page, activeAgainst.sort]);

  useEffect(() => {
    fetchReports({ respondent_cf_handle: username, resolved: true, sort_by: processedAgainst.sort.key, sort_order: processedAgainst.sort.direction, skip: (processedAgainst.page - 1) * itemsPerPage, limit: itemsPerPage }, setProcessedAgainst);
  }, [username, token, processedAgainst.page, processedAgainst.sort]);

  useEffect(() => {
    fetchReports({ reporter_cf_handle: username, resolved: false, sort_by: activeBy.sort.key, sort_order: activeBy.sort.direction, skip: (activeBy.page - 1) * itemsPerPage, limit: itemsPerPage }, setActiveBy);
  }, [username, token, activeBy.page, activeBy.sort]);

  useEffect(() => {
    fetchReports({ reporter_cf_handle: username, resolved: true, sort_by: processedBy.sort.key, sort_order: processedBy.sort.direction, skip: (processedBy.page - 1) * itemsPerPage, limit: itemsPerPage }, setProcessedBy);
  }, [username, token, processedBy.page, processedBy.sort]);

  // Table columns (adapted from GroupReports.jsx, omitting group-specific columns)
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
        <Link to={`/contest/${report.contest_id}`} className="tableCellLink">{report.contest_id}</Link>
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
      key: 'timestamp',
      label: 'Report Date',
      sortable: true,
      render: (report) => formatDate(report.timestamp),
    },
    {
      key: 'action_view_report_active',
      label: 'Action',
      sortable: false,
      render: (report) => (
        <Link to={`/group/${report.group_id || 'main'}/report/${report.report_id}`} className="global-button blue small">View</Link>
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
      key: 'resolve_timestamp',
      label: 'Resolve Date',
      sortable: true,
      render: (report) => report.resolve_timestamp ? formatDate(report.resolve_timestamp) : 'N/A',
    },
    {
      key: 'result',
      label: 'Result',
      sortable: false,
      render: (report) => {
        if (report.accepted === true) {
          return <span style={{ color: 'green', fontWeight: 'bold' }}>Accepted</span>;
        } else if (report.accepted === false) {
          return <span style={{ color: 'red', fontWeight: 'bold' }}>Rejected</span>;
        } else {
          return <span style={{ color: '#888' }}>-</span>;
        }
      },
    },
    {
      key: 'action_view_report_processed',
      label: 'Action',
      sortable: false,
      render: (report) => (
        <Link to={`/group/${report.group_id || 'main'}/report/${report.report_id}`} className="global-button blue small">View</Link>
      ),
    },
  ];

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Handlers for sorting and pagination
  const handleSort = (tableSetter, tableState) => (columnKey) => {
    tableSetter((prev) => ({ ...prev, page: 1, sort: { key: columnKey, direction: prev.sort.key === columnKey && prev.sort.direction === 'asc' ? 'desc' : 'asc' } }));
  };
  const handlePageChange = (tableSetter) => (page) => {
    tableSetter((prev) => ({ ...prev, page }));
  };

  return (
    <div className="page-container">
      <UserNavBar username={username} isOwnProfile={isOwnProfile} />
      <div className={styles.reportsTableWrapper}>
        {/* Always render all four tables, regardless of data */}
        <LazyLoadingSortablePagedTableBox
          title={<span className={titleStyles.titleText}>Active Reports (Against User)</span>}
          columns={activeTableColumns}
          items={activeAgainst.items}
          totalItems={activeAgainst.total}
          itemsPerPage={itemsPerPage}
          currentPage={activeAgainst.page}
          onPageChange={handlePageChange(setActiveAgainst)}
          sortConfig={activeAgainst.sort}
          onSortChange={handleSort(setActiveAgainst, activeAgainst)}
          isLoading={activeAgainst.loading}
          noDataMessage={API_MESSAGES.NO_REPORTS_ACTIVE}
          backgroundColor="rgb(255, 245, 230)"
          className="activeReportsTable"
          error={activeAgainst.error}
        />
        <LazyLoadingSortablePagedTableBox
          title={<span className={titleStyles.titleText}>Processed Reports (Against User)</span>}
          columns={processedTableColumns}
          items={processedAgainst.items}
          totalItems={processedAgainst.total}
          itemsPerPage={itemsPerPage}
          currentPage={processedAgainst.page}
          onPageChange={handlePageChange(setProcessedAgainst)}
          sortConfig={processedAgainst.sort}
          onSortChange={handleSort(setProcessedAgainst, processedAgainst)}
          isLoading={processedAgainst.loading}
          noDataMessage={API_MESSAGES.NO_REPORTS_PROCESSED}
          backgroundColor="rgb(230, 255, 240)"
          className="processedReportsTable"
          error={processedAgainst.error}
        />
        <LazyLoadingSortablePagedTableBox
          title={<span className={titleStyles.titleText}>Active Reports (By User)</span>}
          columns={activeTableColumns}
          items={activeBy.items}
          totalItems={activeBy.total}
          itemsPerPage={itemsPerPage}
          currentPage={activeBy.page}
          onPageChange={handlePageChange(setActiveBy)}
          sortConfig={activeBy.sort}
          onSortChange={handleSort(setActiveBy, activeBy)}
          isLoading={activeBy.loading}
          noDataMessage={API_MESSAGES.NO_REPORTS_ACTIVE}
          backgroundColor="rgb(255, 245, 230)"
          className="activeReportsTable"
          error={activeBy.error}
        />
        <LazyLoadingSortablePagedTableBox
          title={<span className={titleStyles.titleText}>Processed Reports (By User)</span>}
          columns={processedTableColumns}
          items={processedBy.items}
          totalItems={processedBy.total}
          itemsPerPage={itemsPerPage}
          currentPage={processedBy.page}
          onPageChange={handlePageChange(setProcessedBy)}
          sortConfig={processedBy.sort}
          onSortChange={handleSort(setProcessedBy, processedBy)}
          isLoading={processedBy.loading}
          noDataMessage={API_MESSAGES.NO_REPORTS_PROCESSED}
          backgroundColor="rgb(230, 255, 240)"
          className="processedReportsTable"
          error={processedBy.error}
        />
      </div>
    </div>
  );
}
