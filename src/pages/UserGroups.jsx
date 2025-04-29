import React from 'react';
import { useParams, Link } from 'react-router-dom';
import BasicTableBox from '../components/BasicTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';

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
      colorRating: 'rgb(255, 140, 0)', 
      colorMaxRating: 'rgb(255, 140, 0)', 
      rankName: 'Master',
      maxRankName: 'Master',
      joined: '2022-09-15' 
    },
    { 
      name: 'Global', 
      rating: 1450, 
      maxRating: 1500, 
      colorRating: 'rgb(30, 150, 255)', 
      colorMaxRating: 'rgb(30, 150, 255)', 
      rankName: 'Specialist',
      maxRankName: 'Specialist',
      joined: '2022-09-15' 
    },
    { 
      name: 'Math_Club', 
      rating: 1890, 
      maxRating: 1950, 
      colorRating: 'rgb(170, 0, 170)', 
      colorMaxRating: 'rgb(170, 0, 170)', 
      rankName: 'Candidate Master',
      maxRankName: 'Candidate Master',
      joined: '2022-10-03' 
    },
    { 
      name: 'Chess_Enthusiasts', 
      rating: 900, 
      maxRating: 1000, 
      colorRating: 'rgb(0, 180, 0)', 
      colorMaxRating: 'rgb(0, 180, 0)', 
      rankName: 'Pupil',
      maxRankName: 'Pupil',
      joined: '2022-11-22' 
    },
    { 
      name: 'Developers', 
      rating: 1200, 
      maxRating: 1250, 
      colorRating: 'rgb(170, 170, 170)', 
      colorMaxRating: 'rgb(170, 170, 170)', 
      rankName: 'Apprentice',
      maxRankName: 'Apprentice',
      joined: '2023-01-07' 
    },
    { 
      name: 'Writers_Group', 
      rating: 2100, 
      maxRating: 2170, 
      colorRating: 'rgb(170, 0, 170)', 
      colorMaxRating: 'rgb(255, 140, 0)', 
      rankName: 'Candidate Master',
      maxRankName: 'Master',
      joined: '2023-02-14' 
    }
  ];
  
  // Function to format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Transform the data for the TableBox component
  const columns = ["Group", "Rating", "Date Joined"];
  const data = userGroups.map(group => [
    <Link to={`/group/${group.name}`} className="tableCellLink">{group.name}</Link>,
    <div>
      <span style={{ color: group.colorRating, fontWeight: 'bold' }}>
        {group.rating}
      </span>
      {' '}
      (Max: <span style={{ color: group.colorMaxRating, fontWeight: 'bold' }}>
        {group.maxRating}
      </span>)
    </div>,
    formatDate(group.joined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box - same as in User.jsx */}
      <div className="floatingButtonBox">
        <Link to={`/user/${username}`}>{username}</Link>
        <Link to={`/user/${username}/groups`}>groups</Link>
        <Link to={`/user/${username}/settings`}>settings</Link>
      </div>
      
      {/* Use BasicTableBox component instead of TableBox */}
      <BasicTableBox 
        columns={columns}
        data={data}
      />
    </div>
  );
} 