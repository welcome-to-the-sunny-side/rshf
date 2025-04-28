import React from 'react';
import { useParams, Link } from 'react-router-dom';

// Renamed component from Profile to User
import styles from './User.module.css';
import RatingGraph from '../components/RatingGraph'; // Import the new component

// Generate varied dummy rating data for different groups
const generateDummyData = (startRating, numPoints, volatility, groupName) => {
  const data = [];
  let currentRating = startRating;
  let currentDate = new Date(2023, 0, 1); // Start date Jan 1, 2023

  for (let i = 0; i < numPoints; i++) {
    // Simulate rating change
    const change = (Math.random() - 0.45) * volatility * (i + 1); // Tend to increase slightly over time
    currentRating += change;
    currentRating = Math.max(0, Math.round(currentRating)); // Ensure rating doesn't go below 0

    // Simulate time passing (1-3 months)
    currentDate.setMonth(currentDate.getMonth() + Math.floor(Math.random() * 3) + 1);
    // Add some day variation
    currentDate.setDate(Math.floor(Math.random() * 28) + 1);

    // Format date as YYYY-MM-DD
    const dateString = currentDate.toISOString().split('T')[0];
    // Add random contest ID (integer between 1 and 10000)
    const contest_id = Math.floor(Math.random() * 10000) + 1;
    data.push({ date: dateString, rating: currentRating, contest_id });
  }
  // Add one more point closer to today for better visualization
  const today = new Date();
  const lastChange = (Math.random() - 0.4) * volatility;
  currentRating += lastChange;
  currentRating = Math.max(0, Math.round(currentRating));
  const last_contest_id = Math.floor(Math.random() * 10000) + 1;
  data.push({ date: today.toISOString().split('T')[0], rating: currentRating, contest_id: last_contest_id });
  
  // Ensure data is sorted by date just in case
  data.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return data;
};

const dummyRatingData = {
  'root_group': generateDummyData(2100, 8, 100, 'root_group'),
  'Global': generateDummyData(1400, 10, 80, 'Global'),
  'Math_Club': generateDummyData(1850, 12, 120, 'Math_Club'),
  'Chess_Enthusiasts': generateDummyData(850, 15, 60, 'Chess_Enthusiasts'),
  'Developers': generateDummyData(1150, 7, 90, 'Developers'),
  'Writers_Group': generateDummyData(2050, 9, 110, 'Writers_Group')
};

export default function User() {
  const { username } = useParams();
  // Assume cf_username is the same as username for now. In a real app, these might differ.
  const cf_username = username;
  
  // Dummy group data: [group_name, group_rating, group_rank, group_rank_color, max_group_rating, max_group_rank, max_group_rank_color]
  // Group names updated to use underscores instead of spaces
  const groups = [
    ['root_group', 2185, 'Master', 'rgb(255, 140, 0)', 2185, 'Master', 'rgb(255, 140, 0)'],
    ['Global', 1450, 'Specialist', 'rgb(30, 150, 255)', 1500, 'Specialist', 'rgb(30, 150, 255)'],
    ['Math_Club', 1890, 'Candidate Master', 'rgb(170, 0, 170)', 1950, 'Candidate Master', 'rgb(170, 0, 170)'],
    ['Chess_Enthusiasts', 900, 'Pupil', 'rgb(0, 180, 0)', 1000, 'Pupil', 'rgb(0, 180, 0)'],
    ['Developers', 1200, 'Apprentice', 'rgb(170, 170, 170)', 1250, 'Apprentice', 'rgb(170, 170, 170)'],
    ['Writers_Group', 2100, 'Candidate Master', 'rgb(170, 0, 170)', 2170, 'Master', 'rgb(255, 140, 0)']
  ];
  // Use React state for selected group index
  const [selectedGroupIdx, setSelectedGroupIdx] = React.useState(0);
  const selectedGroup = groups[selectedGroupIdx];

  // Sample trust score (in a real app, this would come from API)
  const trustScore = 82;
  
  // Dummy registration date
  const registrationDate = "Sep 15, 2022";
  
  // Number of groups the user is a member of
  const numberOfGroups = groups.length;

  const handleGroupChange = (e) => {
    setSelectedGroupIdx(Number(e.target.value));
  };
  
  // Function to determine trust score color based on value
  const getTrustScoreColor = (score) => {
    if (score >= 95) return 'rgb(0, 150, 0)';      // Dark green for very high
    if (score >= 85) return 'rgb(50, 180, 0)';     // Green
    if (score >= 75) return 'rgb(120, 180, 0)';    // Light green
    if (score >= 65) return 'rgb(180, 180, 0)';    // Yellow
    if (score >= 50) return 'rgb(220, 150, 0)';    // Orange
    if (score >= 35) return 'rgb(230, 100, 0)';    // Dark orange
    if (score >= 20) return 'rgb(220, 50, 0)';     // Light red
    return 'rgb(180, 0, 0)';                      // Dark red for very low
  };

  // Get the rating history for the currently selected group
  const currentRatingHistory = dummyRatingData[selectedGroup[0]] || [];

  return (
    <div className="page-container">
      <div className={styles.contentBox}>
        <div className={styles.profileContent}>
          <div className={styles.profileInfo}>
            {/* Rank and group name above username */}
            <div style={{ fontSize: '1rem', marginBottom: '0.08rem' }}>
              <span style={{ color: selectedGroup[3], fontWeight: 'bold' }}>{selectedGroup[2]}</span>{' '}
              {/* Group name is now a link */}
              <Link 
                to={`/group/${selectedGroup[0]}`} 
                style={{ color: '#111', textDecoration: 'none' }}
              >
                [{selectedGroup[0]}]
              </Link>
            </div>
            {/* Username - Now displays cf_username and links to Codeforces profile */}
            <a 
              href={`https://codeforces.com/profile/${cf_username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.usernameLink} // Add a class for styling if needed
            >
              <span 
                className={styles.username} 
                style={{ color: selectedGroup[3], marginBottom: '0.76rem', display: 'inline-block' }} // changed display to inline-block
              >
                {cf_username}
              </span>
            </a>
            {/* Stats List */}
            <div className={styles.statsList}>
              <div className={styles.statItem}>
                {/* Contest Rating group name is now a link */}
                Contest Rating [
                <Link 
                  to={`/group/${selectedGroup[0]}`} 
                  style={{ color: 'inherit', textDecoration: 'none' }} // Remove underline
                >
                  {selectedGroup[0]}
                </Link>
                ]: <span style={{ color: selectedGroup[3], fontWeight: 'bold' }}>{selectedGroup[1]}</span> (max. <span style={{ color: selectedGroup[6], fontWeight: 'bold' }}>{selectedGroup[5]}</span>, <span style={{ color: selectedGroup[6], fontWeight: 'bold' }}>{selectedGroup[4]}</span>)
              </div>
              <div className={styles.statItem}>
                Trust Score: <span className={styles.trustScore} style={{ color: getTrustScoreColor(trustScore) }}>{trustScore}%</span>
              </div>
              <div className={styles.statItem}>
                Member of: <span>{numberOfGroups} groups</span>
              </div>
              <div className={styles.statItem}>
                Registered: <span>{registrationDate}</span>
              </div>
            </div>
            {/* Group dropdown */}
            <div className={styles.groupRatingRow}>
              <span style={{ fontSize: '0.95rem', color: '#444' }}> Group: </span>
              <select className={styles.groupDropdown} value={selectedGroupIdx} onChange={handleGroupChange}>
                {groups.map((group, idx) => (
                  <option key={group[0] + idx} value={idx}>{group[0]}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Profile Picture Container */}
          <div className={styles.profilePictureContainer}>
            <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="35" r="25" fill="#ccc" />
              <circle cx="50" cy="100" r="50" fill="#ccc" />
              <text x="50" y="42" fontSize="12" textAnchor="middle" fill="#888">Profile</text>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Second content box with the Rating Graph */}
      <div className={styles.contentBox}>
             <RatingGraph ratingHistory={currentRatingHistory} />
      </div>
    </div>
  );
}