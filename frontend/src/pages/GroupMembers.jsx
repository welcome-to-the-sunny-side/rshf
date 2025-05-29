import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';
import { useAuth } from '../context/AuthContext';
import LazyLoadingSortablePagedTableBox from '../components/LazyLoadingSortablePagedTableBox';
import styles from './GroupMembers.module.css'; // Keep for page-level styles if any
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';

// Define column keys for sorting and display
const COLUMN_KEYS = {
  CF_HANDLE: 'cf_handle',
  ROLE: 'role',
  USER_GROUP_RATING: 'user_group_rating',
  USER_GROUP_MAX_RATING: 'user_group_max_rating',
  DATE_JOINED: 'date_joined',
};

const API_BASE_URL = '/api';

export default function GroupMembers() {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  
  // User role and permission state (remains for GroupNavBar)
  const [userRole, setUserRole] = useState(null);
  const [showModViewButton, setShowModViewButton] = useState(false);

  // State for new paginated members data
  const [membersData, setMembersData] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Fixed
  const [sortConfig, setSortConfig] = useState({
    key: COLUMN_KEYS.DATE_JOINED, // Default sort key
    direction: 'desc',          // Default sort direction
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  // Fetch paginated members data
   const fetchGroupMembersData = useCallback(async () => {
    if (!groupId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const offset = (currentPage - 1) * itemsPerPage;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      // Fetch total count using axios
      const countResponse = await axios.get(`/api/group_membership_size`, {
        headers,
        params: { gid: groupId },
      });
      setTotalMembers(countResponse.data.count);

      // Fetch paginated data if needed
      if (countResponse.data.count > 0 || totalMembers === 0) {
        const dataResponse = await axios.get(`${API_BASE_URL}/group_membership_range_fetch`, {
          headers,
          params: {
            gid: groupId,
            offset,
            limit: itemsPerPage,
            sort_by: sortConfig.key,
            sort_order: sortConfig.direction,
          },
        });
        setMembersData(dataResponse.data);
      } else {
        setMembersData([]);
      }

    } catch (err) {
      console.error('Failed to fetch members data:', err);
      setError(err.response?.data?.detail || err.message);
      setMembersData([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  }, [groupId, token, currentPage, itemsPerPage, sortConfig, totalMembers]);

  useEffect(() => {
    fetchGroupMembersData();
  }, [fetchGroupMembersData]);

  const handlePageChange = (newPageNumber) => {
    setCurrentPage(newPageNumber);
  };

  const handleSort = (columnKey) => {
    setCurrentPage(1); // Reset to first page on sort
    setSortConfig((prevConfig) => ({
      key: columnKey,
      direction: prevConfig.key === columnKey && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Define columns for LazyLoadingSortablePagedTableBox
  const tableColumns = [
    {
      key: COLUMN_KEYS.CF_HANDLE,
      label: 'User',
      sortable: true,
      render: (member) => (
        <Link 
          to={`/user/${member.cf_handle}`} 
          className="tableCellLink" // Ensure this class is globally available or defined in a shared CSS
          style={{ color: getRatingColor(member.user_group_rating), fontWeight: 'bold' }}
        >
          {member.cf_handle}
        </Link>
      ),
    },
    {
      key: COLUMN_KEYS.ROLE,
      label: 'Role',
      sortable: true,
      render: (member) => <span style={{ textTransform: 'capitalize' }}>{member.role}</span>,
    },
    {
      key: COLUMN_KEYS.USER_GROUP_RATING,
      label: 'Rating',
      sortable: true,
      render: (member) => (
        <span style={{ color: getRatingColor(member.user_group_rating), fontWeight: 'bold' }}>
          {member.user_group_rating}
        </span>
      ),
    },
    {
      key: COLUMN_KEYS.USER_GROUP_MAX_RATING,
      label: 'Max Rating',
      sortable: true,
      render: (member) => (
        <span style={{ color: getRatingColor(member.user_group_max_rating), fontWeight: 'bold' }}>
          {member.user_group_max_rating}
        </span>
      ),
    },
    {
      key: COLUMN_KEYS.DATE_JOINED,
      label: 'Date Joined',
      sortable: true,
      render: (member) => formatDate(member.timestamp),
    },
  ];

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Error message */}
      
      
      {/* Loading indicator */}
      {loading ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : error ? (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      ) : membersData.length === 0 ? (
        <div className="api-feedback-container no-data-message">
          {API_MESSAGES.NO_DATA}
        </div>
      ) : (
        /* Members table */
        <div className={styles.membersTableWrapper}>
          <LazyLoadingSortablePagedTableBox
            columns={tableColumns}
            items={membersData}
            totalItems={totalMembers}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            sortConfig={sortConfig}
            onSortChange={handleSort} // handleSort expects columnKey, which onSortChange provides
            isLoading={loading}
            error={error}
            noDataMessage={API_MESSAGES.NO_DATA}
            // You can add a title prop if desired, e.g., title="Group Members"
            // className and tableBoxClassName can be used for further styling if needed
            // backgroundColor="rgb(230, 240, 255)" // If you want to restore this
          />
        </div>
      )}
    </div>
  );
} 