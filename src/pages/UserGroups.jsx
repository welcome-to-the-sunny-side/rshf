import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SortableTableBox from '../components/SortableTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';
import UserNavBar from '../components/UserNavBar';

// Import styles if needed
import styles from './UserGroups.module.css';

export default function UserGroups() {
  const { username } = useParams();
  
  // Updated dummy group data with rating, max rating, and join date
  const userGroups = [
    { 
      name: 'root_group', 
      rating: 2185, 
      maxRating: 2200, 
      joined: '2022-09-15' 
    },
    { 
      name: 'Global', 
      rating: 1450, 
      maxRating: 1500, 
      joined: '2022-09-15' 
    },
    { 
      name: 'Math_Club', 
      rating: 1890, 
      maxRating: 1950, 
      joined: '2022-10-03' 
    },
    { 
      name: 'Chess_Enthusiasts', 
      rating: 900, 
      maxRating: 1000, 
      joined: '2022-11-22' 
    },
    { 
      name: 'Developers', 
      rating: 1200, 
      maxRating: 1250, 
      joined: '2023-01-07' 
    },
    { 
      name: 'Writers_Group', 
      rating: 2100, 
      maxRating: 2170, 
      joined: '2023-02-14' 
    }
  ];
  
  // Function to format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Transform the data for the TableBox component
  const columns = ["Group", "Rating", "Max Rating", "Date Joined"];
  const data = userGroups.map(group => [
    <Link to={`/group/${group.name}`} className="tableCellLink">{group.name}</Link>,
    <span style={{ color: getRatingColor(group.rating), fontWeight: 'bold' }}>
      {group.rating}
    </span>,
    <span style={{ color: getRatingColor(group.maxRating), fontWeight: 'bold' }}>
      {group.maxRating}
    </span>,
    formatDate(group.joined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box - same as in User.jsx */}
      <UserNavBar username={username} />
      
      {/* Use SortableTableBox component for sortable columns */}
      <SortableTableBox 
        columns={columns}
        data={data}
        initialSortColumnIndex={1} // Sort by rating initially
        initialSortDirection="desc" // Highest ratings first
      />
    </div>
  );
} 