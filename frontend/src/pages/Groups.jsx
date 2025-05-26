import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './Groups.module.css';

export default function Groups() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Check if the user is authenticated
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch groups when component mounts
    fetchGroups();
  }, [navigate, token]);
  
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/groups', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setGroups(response.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups. Please try again later.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Pin icon SVG component
  const PinIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      style={{ marginRight: '6px', verticalAlign: 'middle', color: '#555' }}
    >
      <path 
        fill="currentColor" 
        d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" 
      />
    </svg>
  );

  // Define columns for the table
  const columns = ["Group", "Type", "Members", "Date of Creation"];
  
  // Find the main group and other groups
  const mainGroup = useMemo(() => groups.find(group => group.group_id === 'main'), [groups]);
  const otherGroups = useMemo(() => groups.filter(group => group.group_id !== 'main'), [groups]);
  
  // Create main group row if it exists
  const mainGroupRow = useMemo(() => {
    if (!mainGroup) return null;
    
    return [
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <PinIcon />
        <Link to={`/group/${mainGroup.group_id}`} className="tableCellLink" style={{ fontWeight: 600 }}>{mainGroup.group_name}</Link>
      </div>,
      <span style={{ fontWeight: 500 }}>{mainGroup.is_private ? 'private' : 'public'}</span>,
      <span style={{ fontWeight: 500 }}>{mainGroup.member_count.toLocaleString()}</span>,
      <span style={{ fontWeight: 500 }}>{formatDate(mainGroup.create_date)}</span>
    ];
  }, [mainGroup]);
  
  // Transform other groups data
  const otherGroupsRows = useMemo(() => {
    if (otherGroups.length === 0) {
      return [];
    }
    
    return otherGroups.map(group => [
      <Link to={`/group/${group.group_id}`} className="tableCellLink">{group.group_name}</Link>,
      group.is_private ? 'private' : 'public',
      group.member_count.toLocaleString(),
      formatDate(group.timestamp)
    ]);
  }, [otherGroups]);

  // Find if we have any pinnedRows to show
  const pinnedRows = useMemo(() => {
    return mainGroupRow ? [mainGroupRow] : [];
  }, [mainGroupRow]);

  return (
    <div className="page-container">
      {/* Error message */}
      {error && (
        <div className="error-message" style={{ color: 'red', margin: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator" style={{ textAlign: 'center', margin: '50px' }}>
          Loading groups...
        </div>
      ) : (
        <>
          {groups.length === 0 ? (
            <ContentBoxWithTitle title="No Groups">
              <p>No groups found.</p>
            </ContentBoxWithTitle>
          ) : (
            <div className={styles.groupsTableWrapper}>
              <SortablePagedTableBox 
                columns={columns}
                data={otherGroupsRows}
                pinnedRows={pinnedRows}
                backgroundColor="rgb(230, 240, 255)"
                itemsPerPage={15}
                initialSortColumnIndex={2} // Member Count column
                initialSortDirection="desc" // Descending order
                className="groupsTable"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
