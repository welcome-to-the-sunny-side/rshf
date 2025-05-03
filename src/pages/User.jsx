import React from 'react';
import { useParams, Link } from 'react-router-dom';

// Renamed component from Profile to User
import styles from './User.module.css';
import RatingGraph from '../components/RatingGraph'; // Import the new component
import UserNavBar from '../components/UserNavBar'; // Import the new component

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

// Social platform icons components
const CodeforcesIcon = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    style={{ opacity: active ? 1 : 0.4, marginRight: '10px' }}
  >
    <path 
      fill="#2196F3" 
      d="M4,5A1,1 0 0,0 3,6V18A1,1 0 0,0 4,19H5A1,1 0 0,0 6,18V6A1,1 0 0,0 5,5H4M7,5A1,1 0 0,0 6,6V18A1,1 0 0,0 7,19H8A1,1 0 0,0 9,18V6A1,1 0 0,0 8,5H7M12,5A1,1 0 0,0 11,6V18A1,1 0 0,0 12,19H13A1,1 0 0,0 14,18V6A1,1 0 0,0 13,5H12Z" 
    />
  </svg>
);

const AtCoderIcon = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 200 200"
    style={{ opacity: active ? 1 : 0.4, marginRight: '10px' }}
  >
    <path
      fill="#222222"
      d="M156,28H90c-5,0-9,4-9,9v25c0,5,4,9,9,9h17v11h-3c-5,0-9,4-9,9v3c0,5,4,9,9,9h35c5,0,9-4,9-9v-3c0-5-4-9-9-9h-3V71h20c5,0,9-4,9-9V37C165,32,161,28,156,28z M125,82h-5V71h5V82z"
    />
    <path
      fill="#222222"
      d="M65,82H46V53h19c3,0,5-2,5-5v-9c0-3-2-5-5-5H36c-3,0-5,2-5,5v86c0,3,2,5,5,5h29c3,0,5-2,5-5v-38C70,84,68,82,65,82z"
    />
  </svg>
);

const CodeChefIcon = ({ active }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 32 32"
    style={{ opacity: active ? 1 : 0.4 }}
  >
    <path
      fill="#5B4638"
      d="M 16 0 C 11.277344 0 7.359375 2.460938 7.359375 5.414062 C 7.359375 6.226562 7.597656 6.976562 8.054688 7.671875 C 7.683594 8.234375 7.460938 8.875 7.460938 9.574219 C 7.460938 10.46875 7.804688 11.1875 8.183594 11.90625 C 7.824219 12.511719 7.621094 13.207031 7.621094 13.949219 C 7.621094 14.621094 7.789062 15.234375 8.082031 15.78125 C 7.828125 16.246094 7.679688 16.761719 7.679688 17.316406 C 7.679688 19.667969 11.425781 21.566406 16 21.566406 C 20.574219 21.566406 24.320312 19.667969 24.320312 17.316406 C 24.320312 16.761719 24.171875 16.246094 23.917969 15.78125 C 24.210938 15.234375 24.378906 14.621094 24.378906 13.949219 C 24.378906 13.210938 24.175781 12.511719 23.816406 11.90625 C 24.195312 11.1875 24.539062 10.46875 24.539062 9.574219 C 24.539062 8.875 24.316406 8.234375 23.945312 7.671875 C 24.402344 6.976562 24.640625 6.226562 24.640625 5.414062 C 24.640625 2.460938 20.722656 0 16 0 Z M 16 1.449219 C 20.046875 1.449219 23.335938 3.304688 23.335938 5.578125 C 23.335938 7.851562 20.046875 9.707031 16 9.707031 C 11.953125 9.707031 8.664062 7.851562 8.664062 5.578125 C 8.664062 3.304688 11.953125 1.449219 16 1.449219 Z M 12.964844 3.011719 C 12.554688 3.011719 12.144531 3.210938 11.914062 3.609375 C 11.46875 4.40625 11.734375 5.558594 12.5 6.089844 C 12.730469 6.230469 12.964844 6.304688 13.199219 6.304688 C 13.605469 6.304688 14.019531 6.109375 14.246094 5.714844 C 14.695312 4.917969 14.425781 3.769531 13.664062 3.234375 C 13.433594 3.089844 13.195312 3.011719 12.964844 3.011719 Z M 19.035156 3.011719 C 18.804688 3.011719 18.566406 3.089844 18.339844 3.234375 C 17.574219 3.769531 17.304688 4.917969 17.753906 5.714844 C 17.980469 6.109375 18.394531 6.304688 18.800781 6.304688 C 19.035156 6.304688 19.269531 6.230469 19.5 6.089844 C 20.265625 5.558594 20.53125 4.40625 20.085938 3.609375 C 19.855469 3.210938 19.445312 3.011719 19.035156 3.011719 Z M 16 3.707031 C 15.582031 3.707031 15.234375 3.933594 15.085938 4.296875 C 14.882812 4.800781 15.136719 5.402344 15.679688 5.664062 C 15.785156 5.714844 15.894531 5.738281 16 5.738281 C 16.417969 5.738281 16.765625 5.511719 16.917969 5.148438 C 17.117188 4.640625 16.863281 4.042969 16.320312 3.78125 C 16.214844 3.730469 16.105469 3.707031 16 3.707031 Z M 13.894531 10.503906 C 13.777344 10.507812 13.65625 10.535156 13.539062 10.578125 C 13.15625 10.726562 12.964844 11.128906 13.023438 11.554688 C 13.140625 12.3125 14.207031 12.761719 14.8125 12.296875 C 15.25 11.953125 15.113281 11.261719 14.535156 10.882812 C 14.335938 10.753906 14.128906 10.691406 13.894531 10.503906 Z M 18.105469 10.503906 C 17.871094 10.691406 17.664062 10.753906 17.464844 10.882812 C 16.886719 11.261719 16.75 11.953125 17.1875 12.296875 C 17.792969 12.761719 18.859375 12.3125 18.976562 11.554688 C 19.035156 11.128906 18.84375 10.726562 18.460938 10.578125 C 18.34375 10.535156 18.226562 10.507812 18.105469 10.503906 Z M 12.027344 13.996094 C 11.917969 14.015625 11.804688 14.054688 11.695312 14.113281 C 10.9375 14.539062 10.972656 15.605469 11.742188 15.992188 C 12.109375 16.167969 12.546875 16.101562 12.835938 15.84375 C 13.214844 15.507812 13.253906 14.894531 12.921875 14.503906 C 12.695312 14.230469 12.355469 14.035156 12.027344 13.996094 Z M 19.972656 13.996094 C 19.644531 14.035156 19.304688 14.230469 19.078125 14.503906 C 18.746094 14.894531 18.785156 15.507812 19.164062 15.84375 C 19.453125 16.101562 19.890625 16.167969 20.257812 15.992188 C 21.027344 15.605469 21.0625 14.539062 20.304688 14.113281 C 20.195312 14.054688 20.082031 14.015625 19.972656 13.996094 Z M 16 14.78125 C 15.695312 14.78125 15.390625 14.921875 15.199219 15.199219 C 14.855469 15.671875 15.003906 16.339844 15.554688 16.628906 C 15.695312 16.710938 15.847656 16.742188 16 16.742188 C 16.304688 16.742188 16.609375 16.601562 16.800781 16.324219 C 17.144531 15.851562 16.996094 15.183594 16.445312 14.894531 C 16.304688 14.8125 16.152344 14.78125 16 14.78125 Z M 13.738281 17.738281 C 13.328125 17.742188 13 18.074219 13 18.488281 C 13 20.316406 14.347656 21.800781 16 21.800781 C 17.652344 21.800781 19 20.316406 19 18.488281 C 19 18.074219 18.671875 17.742188 18.261719 17.738281 C 17.851562 17.742188 17.523438 18.074219 17.523438 18.488281 C 17.523438 19.507812 16.847656 20.320312 16 20.320312 C 15.152344 20.320312 14.476562 19.507812 14.476562 18.488281 C 14.476562 18.074219 14.148438 17.742188 13.738281 17.738281 Z M 15 23 C 13.585938 25.65625 11.507812 28.148438 9.421875 30 L 22.578125 30 C 20.492188 28.148438 18.414062 25.65625 17 23 Z"
    />
  </svg>
);

export default function User() {
  const { username } = useParams();
  // Assume cf_username is the same as username for now. In a real app, these might differ.
  const cf_username = username;
  
  // Dummy social platform links (in a real app, these would come from backend)
  // Empty string means no link provided by user
  const socialLinks = {
    codeforces: `https://codeforces.com/profile/${username}`,
    atcoder: `https://atcoder.jp/users/${username}`,
    codechef: "" // Example of user not providing this link
  };
  
  // Enhanced group data: 
  // [group_name, group_rating, group_rank, group_rank_color, max_group_rating, max_group_rank, max_group_rank_color, member_since, role, rated_contests]
  const groups = [
    ['root_group', 2185, 'Master', 'rgb(255, 140, 0)', 2185, 'Master', 'rgb(255, 140, 0)', '2022-01-15', 'moderator', 24],
    ['Global', 1450, 'Specialist', 'rgb(30, 150, 255)', 1500, 'Specialist', 'rgb(30, 150, 255)', '2022-01-15', 'member', 32],
    ['Math_Club', 1890, 'Candidate Master', 'rgb(170, 0, 170)', 1950, 'Candidate Master', 'rgb(170, 0, 170)', '2022-02-10', 'member', 18],
    ['Chess_Enthusiasts', 900, 'Pupil', 'rgb(0, 180, 0)', 1000, 'Pupil', 'rgb(0, 180, 0)', '2022-03-22', 'moderator', 12],
    ['Developers', 1200, 'Apprentice', 'rgb(170, 170, 170)', 1250, 'Apprentice', 'rgb(170, 170, 170)', '2022-04-07', 'member', 8],
    ['Writers_Group', 2100, 'Candidate Master', 'rgb(170, 0, 170)', 2170, 'Master', 'rgb(255, 140, 0)', '2022-05-14', 'member', 15]
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
  const removedNumberOfGroups = 0;
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
  
  // Function to format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get the rating history for the currently selected group
  const currentRatingHistory = dummyRatingData[selectedGroup[0]] || [];

  return (
    <div className="page-container">
      {/* Updated floating button box with Links */}
      <UserNavBar username={username} />
      
      {/* Two content boxes side by side */}
      <div className={styles.contentBoxRow}>
        {/* Left content box with user info */}
        <div className={`contentBox ${styles.contentBoxLeft}`}>
          <div className={styles.profileInfo}>
            {/* Rank and group name above username */}
            <div style={{ fontSize: '1rem', marginBottom: '0.08rem' }}>
              <span style={{ color: selectedGroup[3], fontWeight: 'bold' }}>{selectedGroup[2]}</span>{' '}
              {/* Group name is now a link */}
              <Link 
                to={`/group/${selectedGroup[0]}`} 
                className="tableCellLink"
              >
                [{selectedGroup[0]}]
              </Link>
            </div>
            {/* Username - Now displays cf_username and links to Codeforces profile */}
            <a 
              href={`https://codeforces.com/profile/${cf_username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.usernameLink}
            >
              <span 
                className={styles.username} 
                style={{ color: selectedGroup[3], marginBottom: '0.76rem', display: 'inline-block' }}
              >
                {cf_username}
              </span>
            </a>
            {/* Stats List */}
            <div className={`${styles.statsList} standardTextFont`}>
              <div className={styles.statItem}>
                {/* Contest Rating group name is now a link */}
                Contest Rating [
                <Link 
                  to={`/group/${selectedGroup[0]}`} 
                  className="tableCellLink"
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
                Removed from: <span>{removedNumberOfGroups} groups</span>
              </div>
              <div className={styles.statItem}>
                Registered: <span>{registrationDate}</span>
              </div>
              {/* Social platforms section */}
              <div className={styles.statItem}>
                Social: 
                <span className={styles.socialIcons}>
                  {socialLinks.codeforces ? (
                    <a 
                      href={socialLinks.codeforces} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Codeforces profile"
                    >
                      <CodeforcesIcon active={true} />
                    </a>
                  ) : (
                    <CodeforcesIcon active={false} />
                  )}
                  
                  {socialLinks.atcoder ? (
                    <a 
                      href={socialLinks.atcoder} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="AtCoder profile"
                    >
                      <AtCoderIcon active={true} />
                    </a>
                  ) : (
                    <AtCoderIcon active={false} />
                  )}
                  
                  {socialLinks.codechef ? (
                    <a 
                      href={socialLinks.codechef} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="CodeChef profile"
                    >
                      <CodeChefIcon active={true} />
                    </a>
                  ) : (
                    <CodeChefIcon active={false} />
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right content box with group details */}
        <div className={`contentBox ${styles.contentBoxRight}`}>
          {/* Group dropdown moved to top of right box */}
          <div className={`${styles.groupRatingRow} standardTextFont`} style={{ marginBottom: '15px' }}>
            <h3 style={{ margin: 0, marginRight: '10px' }}>Group: </h3>
            <select className={styles.groupDropdown} value={selectedGroupIdx} onChange={handleGroupChange}>
              {groups.map((group, idx) => (
                <option key={group[0] + idx} value={idx}>{group[0]}</option>
              ))}
            </select>
          </div>
          
          {/* Group information with the same styling as the left box */}
          <div className={`${styles.statsList} standardTextFont`}>
            <div className={styles.statItem}>
              Role: <span style={{ textTransform: 'capitalize' }}>{selectedGroup[8]}</span>
            </div>
            <div className={styles.statItem}>
              Rated Contests: <span>{selectedGroup[9]}</span>
            </div>
            <div className={styles.statItem}>
              Member Since: <span>{formatDate(selectedGroup[7])}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rating Graph box (full width) */}
      <div className="contentBox">
        <RatingGraph ratingHistory={currentRatingHistory} />
      </div>
    </div>
  );
}