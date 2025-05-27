import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

import styles from './User.module.css';
import RatingGraph from '../components/RatingGraph';
import UserNavBar from '../components/UserNavBar';
import { API_MESSAGES } from '../constants/apiMessages';
import '../styles/apiFeedbackStyles.css';
import { getRatingColor, getRankName } from '../utils/ratingUtils';

// Import platform icon images
import codeforcesIconPath from '../assets/codeforces-icon-180x180.png';
import atcoderIconPath from '../assets/atcoder-icon.png';
import codechefIconPath from '../assets/codechef-icon.ico';

// Social platform icons components
const CodeforcesIcon = ({ active }) => (
  <img
    src={codeforcesIconPath}
    alt="Codeforces"
    width="20"
    height="20"
    style={{ opacity: active ? 1 : 0.4, marginRight: '10px' }}
  />
);

const AtCoderIcon = ({ active }) => (
  <img
    src={atcoderIconPath}
    alt="AtCoder"
    width="20"
    height="20"
    style={{ opacity: active ? 1 : 0.4, marginRight: '10px' }}
  />
);

const CodeChefIcon = ({ active }) => (
  <img
    src={codechefIconPath}
    alt="CodeChef"
    width="20"
    height="20"
    style={{ opacity: active ? 1 : 0.4, marginRight: '10px' }}
  />
);

export default function User() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);
  const [ratingHistoryData, setRatingHistoryData] = useState({});
  const [currentRatingHistory, setCurrentRatingHistory] = useState([]);
  const [loadingRatingData, setLoadingRatingData] = useState(false);
  const [ratingError, setRatingError] = useState(null);
  const [socialLinks, setSocialLinks] = useState({
    codeforces: "",
    atcoder: "",
    codechef: ""
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const { username } = useParams();

  useEffect(() => {
    if (user && username && user.user_id === username) {
      setIsOwnProfile(true);
    } else {
      setIsOwnProfile(false);
    }
  }, [user, username]);

  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!token || !username) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/user?user_id=${username}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setUserData(response.data);
        
        // Process group memberships into the required format
        // [group_name, group_rating, group_rank, group_rank_color, max_group_rating, max_group_rank, max_group_rank_color, member_since, role, rated_contests, report_accuracy_accepted, report_accuracy_total]
        if (response.data.group_memberships && response.data.group_memberships.length > 0) {
          const formattedGroups = response.data.group_memberships.map(membership => {
            // Get rank name and color based on rating using the utility functions
            const getRankInfo = (rating) => {
              return [getRankName(rating), getRatingColor(rating)];
            };
            
            const currentRank = getRankInfo(membership.user_group_rating);
            const maxRank = getRankInfo(membership.user_group_max_rating);
            
            // For now, we're using placeholders for some values that may not be directly available from the API
            return [
              membership.group_id,
              membership.user_group_rating,
              currentRank[0],
              currentRank[1],
              membership.user_group_max_rating,
              maxRank[0],
              maxRank[1],
              membership.timestamp,
              membership.role,
              0, // rated_contests - placeholder
              0, // report_accuracy_accepted - placeholder
              1  // report_accuracy_total - placeholder
            ];
          });
          
          setGroups(formattedGroups);
        }
        
        // Set social links
        const newSocialLinks = {
          codeforces: response.data.cf_handle ? `https://codeforces.com/profile/${response.data.cf_handle}` : "",
          atcoder: response.data.atcoder_handle ? `https://atcoder.jp/users/${response.data.atcoder_handle}` : "",
          codechef: response.data.codechef_handle ? `https://www.codechef.com/users/${response.data.codechef_handle}` : ""
        };
        setSocialLinks(newSocialLinks);
        
      } catch (err) {
        setError('Failed to load user data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [token, username]);
  
  // Selected group based on the current index
  const selectedGroup = groups.length > 0 ? groups[selectedGroupIdx] : null;
  
  // Calculate derived values from the fetched data
  const numberOfGroups = groups.length;
  const removedNumberOfGroups = 0; // This would need to come from the API if available
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

  // Fetch rating data for the selected group when it changes
  useEffect(() => {
    const fetchRatingData = async () => {
      if (!token || !username || !selectedGroup) return;
      
      const groupId = selectedGroup[0];
      
      // If we already have data for this group, use it
      if (ratingHistoryData[groupId]) {
        // Filter cached data as well to ensure only completed contests are shown
        const cachedCompletedContests = ratingHistoryData[groupId].filter(item => item.finished === true);
        setCurrentRatingHistory(cachedCompletedContests);
        return;
      }
      
      try {
        setLoadingRatingData(true);
        setRatingError(null);
        
        const response = await axios.get(`/api/contest_participations?gid=${groupId}&uid=${username}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(response.data);
        
        // Let's try different date formats for debugging
        const formattedRatingData = response.data.map(participation => {
          // Check if contest exists and has start_time_posix
          if (!participation.contest || typeof participation.contest.start_time_posix === 'undefined') {
            console.warn('Participation missing contest data:', participation);
            return null; // We'll filter these out below
          }
          
          // Create a timestamp in milliseconds
          const timestamp = participation.contest.start_time_posix * 1000;
          // Format as ISO string date (YYYY-MM-DD)
          const isoDate = new Date(timestamp).toISOString().split('T')[0];
          
          const rating_before = participation.rating_before;
          const rating_after = participation.rating_after;
          const rank = participation.rank;

          let rating_delta = null;
          if (typeof rating_after === 'number' && typeof rating_before === 'number') {
            rating_delta = rating_after - rating_before;
          }

          return {
            date: timestamp,
            // The main 'rating' for the graph point should be the rating *after* the contest.
            // If rating_after is null (e.g. contest not processed yet), use rating_before or 0 as fallback for plotting.
            rating: rating_after !== null ? rating_after : (rating_before !== null ? rating_before : 0),
            contest_id: participation.contest_id,
            group_id: groupId, // Add the group_id from selectedGroup[0]
            contest_name: participation.contest.contest_name || 'Unknown Contest',
            finished: participation.contest.finished || false, // Ensure 'finished' status is carried over
            rank: rank, // Add rank from participation
            rating_delta: rating_delta // Add calculated rating_delta
          };
        }).filter(item => item !== null); // Filter out any null items
        console.log(formattedRatingData); 
        // Sort by date (using raw timestamps now, so just compare them directly)
        formattedRatingData.sort((a, b) => a.date - b.date);
        
        // Filter for completed contests
        const completedContestsHistory = formattedRatingData.filter(item => item.finished === true);
        // Store the formatted and sorted (but unfiltered) data in the cache
        setRatingHistoryData(prevData => ({
          ...prevData,
          [groupId]: formattedRatingData
        }));
        // Set the filtered data (completed contests only) for the graph
        setCurrentRatingHistory(completedContestsHistory);
      } catch (err) {
        setRatingError('Failed to load rating data. Please try again later.');
        setCurrentRatingHistory([]);
      } finally {
        setLoadingRatingData(false);
      }
    };
    
    fetchRatingData();
  }, [token, username, selectedGroup, ratingHistoryData]);

  return (
    <div className="page-container">
      {/* Error message */}
      {error && (
        <div className="api-feedback-container error-message">
          {API_MESSAGES.ERROR}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="api-feedback-container loading-message">
          {API_MESSAGES.LOADING}
        </div>
      ) : !userData ? (
        <div className="api-feedback-container no-data-message">
          User data not found.
        </div>
      ) : (
        <>
          {/* Updated floating button box with Links */}
          <UserNavBar username={username} isOwnProfile={isOwnProfile} />
          
          {/* Two content boxes side by side */}
          <div className={styles.contentBoxRow}>
            {/* Left content box with user info */}
            <div className={`contentBox ${styles.contentBoxLeft}`}>
              <div className={styles.profileInfo}>
                {/* Rank and group name above username */}
                {selectedGroup && (
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
                )}
                {/* Username - Now displays cf_handle and links to Codeforces profile */}
                <span
                  className={styles.usernameLink}
                  style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    display: 'inline-block',
                    color: selectedGroup ? selectedGroup[3] : getRatingColor(userData.group_memberships?.[0]?.user_group_rating || 0)
                  }}
                >
                  {userData.user_id}
                </span>
                {/* Add margin between username and stats list */}
                <div style={{ marginBottom: '7px' }}></div>
                {/* Stats List */}
                <div className={`${styles.statsList}`}>
                  {selectedGroup && (
                    <div className={`${styles.statItem} standardTextFont`}>
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
                  )}
                  {userData.trusted_score !== undefined && (
                    <div className={`${styles.statItem} standardTextFont`}>
                      Trust Score: <span className={styles.trustScore} style={{ color: getTrustScoreColor(userData.trusted_score) }}>{userData.trusted_score}%</span>
                    </div>
                  )}
                  <div className={`${styles.statItem} standardTextFont`}>
                    Member of: <span>{numberOfGroups} groups</span>
                  </div>
                  <div className={`${styles.statItem} standardTextFont`}>
                    Removed from: <span>{removedNumberOfGroups} groups</span>
                  </div>
                  {/* Social platforms section */}
                  <div className={`${styles.statItem} standardTextFont`}>
                    <div className={styles.socialContainer}>
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
            </div>
            
            {/* Right content box with group details */}
            <div className={`contentBox ${styles.contentBoxRight}`}>
              {/* Group dropdown moved to top of right box */}
              <div className={`${styles.groupRatingRow}`} style={{ marginBottom: '15px' }}>
                <h3 className="standardTextFont" style={{ margin: 0, marginRight: '10px' }}>Group: </h3>
                <select 
                  className={`${styles.groupDropdown} standardTextFont`} 
                  value={selectedGroupIdx} 
                  onChange={handleGroupChange}
                  disabled={groups.length === 0}
                >
                  {groups.map((group, idx) => (
                    <option key={group[0] + idx} value={idx}>{group[0]}</option>
                  ))}
                </select>
              </div>
              
              {/* Group information with the same styling as the left box */}
              {selectedGroup ? (
                <div className={`${styles.statsList}`}>
                  <div className={`${styles.statItem} standardTextFont`}>
                    Role: <span style={{ textTransform: 'capitalize' }}>{selectedGroup[8]}</span>
                  </div>
                  <div className={`${styles.statItem} standardTextFont`}>
                    Rated Contests: <span>{selectedGroup[9]}</span>
                  </div>
                  <div className={`${styles.statItem} standardTextFont`}>
                    Report Accuracy: <span title={`${selectedGroup[10]} accepted out of ${selectedGroup[11]} reports`}>
                      {selectedGroup[11] > 0 ? Math.round((selectedGroup[10] / selectedGroup[11]) * 100) : 0}% ({selectedGroup[10]}/{selectedGroup[11]})
                    </span>
                  </div>
                  <div className={`${styles.statItem} standardTextFont`}>
                    Member Since: <span>{formatDate(selectedGroup[7])}</span>
                  </div>
                </div>
              ) : (
                <div className="api-feedback-container no-data-message">No group data available</div>
              )}
            </div>
          </div>
          
          {/* Rating Graph box (full width) */}
          <div className="contentBox standardTextFont" style={{ padding: '0.1rem' }}>
            {loadingRatingData ? (
              <div className="api-feedback-container loading-message">
                {API_MESSAGES.LOADING}
              </div>
            ) : ratingError ? (
              <div className="api-feedback-container error-message">
                {API_MESSAGES.ERROR}
              </div>
            ) : currentRatingHistory.length > 0 ? (
              <RatingGraph ratingHistory={currentRatingHistory} />
            ) : (
              <div className="api-feedback-container no-data-message">
                No rating history available for this group.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}