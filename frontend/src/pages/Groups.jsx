import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

// Backend URL
const BACKEND_URL = 'http://localhost:8000/api';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Check if the user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Fetch groups when component mounts
    fetchGroups();
  }, [navigate]);
  
  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/group`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Groups data:', data);
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(err.message);
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
      <span style={{ fontWeight: 500 }}>restricted membership</span>,
      <span style={{ fontWeight: 500 }}>{mainGroup.memberships.length.toLocaleString()}</span>,
      <span style={{ fontWeight: 500 }}>-</span> // Creation date might not be available from API
    ];
  }, [mainGroup]);
  
  // Transform other groups data
  const otherGroupsRows = useMemo(() => {
    if (loading) {
      return [["Loading groups...", "", "", ""]];
    }
    
    if (error) {
      return [[`Error: ${error}`, "", "", ""]];
    }
    
    if (otherGroups.length === 0) {
      return [["No groups found", "", "", ""]];
    }
    
    return otherGroups.map(group => [
      <Link to={`/group/${group.group_id}`} className="tableCellLink">{group.group_name}</Link>,
      "restricted membership", // Group type not directly provided in API
      group.memberships.length.toLocaleString(), // Use membership count as member count
      "-" // Creation date not available from API
    ]);
  }, [otherGroups, loading, error]);

  // Find if we have any pinnedRows to show
  const pinnedRows = useMemo(() => {
    return mainGroupRow ? [mainGroupRow] : [];
  }, [mainGroupRow]);

  return (
    <div className="page-container">
      {loading && !otherGroupsRows.length && (
        <ContentBoxWithTitle title="Loading...">
          <p>Fetching groups data...</p>
        </ContentBoxWithTitle>
      )}
      
      {error && !otherGroupsRows.length && (
        <ContentBoxWithTitle title="Error">
          <p>{error}</p>
        </ContentBoxWithTitle>
      )}
      
      {!loading && !error && groups.length === 0 && (
        <ContentBoxWithTitle title="No Groups">
          <p>No groups found.</p>
        </ContentBoxWithTitle>
      )}
      
      {otherGroupsRows.length > 0 && (
        <SortablePagedTableBox 
          columns={columns}
          data={otherGroupsRows}
          pinnedRows={pinnedRows}
          backgroundColor="rgb(230, 240, 255)"
          itemsPerPage={15}
          initialSortColumnIndex={2} // Member Count column
          initialSortDirection="desc" // Descending order
        />
      )}
    </div>
  );
}
