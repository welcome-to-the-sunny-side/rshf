import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import styles from './ContestPage.module.css';

const GroupContestPage = () => {
  const { groupId, contestId } = useParams();
  
  // Set this to false to switch to completed contest view
  const isUpcoming = true;
  
  // User state for registration status
  const [isRegistered, setIsRegistered] = useState(true);
  
  // Dummy contest data
  const contestData = {
    name: "CodeForces Round #950",
    status: isUpcoming ? "active/upcoming" : "completed",
    link: `https://codeforces.com/contest/${contestId}`,
    date: "May 15, 2025",
    time: "14:00",
    platform: "codeforces"
  };
  
  // Dummy user status for this contest
  const userContestStatus = {
    isRegistered: true,
    rank: 42,
    participantCount: 1045,
    memberCount: 2543,
    ratingChange: 15,
    finalRating: 1680
  };
  
  // Dummy registration list data for upcoming contest
  const registrationListData = [
    { username: "alice", rating: 2185, ratedContests: 24 },
    { username: "bob", rating: 1890, ratedContests: 18 },
    { username: "charlie", rating: 1450, ratedContests: 32 },
    { username: "david", rating: 900, ratedContests: 12 },
    { username: "eve", rating: 1200, ratedContests: 8 },
    { username: "frank", rating: 2100, ratedContests: 15 },
    { username: "grace", rating: 1750, ratedContests: 20 },
    { username: "hank", rating: 1350, ratedContests: 16 },
    { username: "isabel", rating: 1020, ratedContests: 10 },
    { username: "jack", rating: 950, ratedContests: 7 },
    { username: "karen", rating: 1800, ratedContests: 25 },
    { username: "leo", rating: 1560, ratedContests: 14 },
    { username: "maria", rating: 1890, ratedContests: 21 },
    { username: "nathan", rating: 2250, ratedContests: 29 },
    { username: "olivia", rating: 1640, ratedContests: 17 },
    { username: "paul", rating: 1320, ratedContests: 9 },
    { username: "quinn", rating: 1750, ratedContests: 19 },
    { username: "ryan", rating: 1470, ratedContests: 13 },
    { username: "sarah", rating: 2040, ratedContests: 26 },
    { username: "tom", rating: 1590, ratedContests: 15 },
    { username: "ursula", rating: 1280, ratedContests: 7 },
    { username: "victor", rating: 1980, ratedContests: 23 },
    { username: "wendy", rating: 1690, ratedContests: 18 },
    { username: "xavier", rating: 1380, ratedContests: 11 },
    { username: "yara", rating: 1720, ratedContests: 14 },
    { username: "zack", rating: 1860, ratedContests: 22 }
  ];
  
  // Dummy rank list data for completed contest
  const rankListData = [
    { rank: 1, username: "alice", role: "moderator", ratingChange: 15, finalRating: 2200 },
    { rank: 2, username: "frank", role: "member", ratingChange: 12, finalRating: 2112 },
    { rank: 3, username: "bob", role: "moderator", ratingChange: 8, finalRating: 1898 },
    { rank: 4, username: "karen", role: "member", ratingChange: 5, finalRating: 1805 },
    { rank: 5, username: "grace", role: "member", ratingChange: 3, finalRating: 1753 },
    { rank: 6, username: "leo", role: "member", ratingChange: -2, finalRating: 1558 },
    { rank: 7, username: "charlie", role: "member", ratingChange: -4, finalRating: 1446 },
    { rank: 8, username: "hank", role: "member", ratingChange: -5, finalRating: 1345 },
    { rank: 9, username: "eve", role: "member", ratingChange: -6, finalRating: 1194 },
    { rank: 10, username: "isabel", role: "member", ratingChange: -8, finalRating: 1012 },
    { rank: 11, username: "jack", role: "member", ratingChange: -10, finalRating: 940 },
    { rank: 12, username: "david", role: "member", ratingChange: -12, finalRating: 888 },
    { rank: 13, username: "maria", role: "member", ratingChange: 7, finalRating: 1897 },
    { rank: 14, username: "nathan", role: "moderator", ratingChange: 10, finalRating: 2260 },
    { rank: 15, username: "olivia", role: "member", ratingChange: 2, finalRating: 1642 },
    { rank: 16, username: "paul", role: "member", ratingChange: -3, finalRating: 1317 },
    { rank: 17, username: "quinn", role: "member", ratingChange: 4, finalRating: 1754 },
    { rank: 18, username: "ryan", role: "member", ratingChange: -5, finalRating: 1465 },
    { rank: 19, username: "sarah", role: "moderator", ratingChange: 9, finalRating: 2049 },
    { rank: 20, username: "tom", role: "member", ratingChange: -1, finalRating: 1589 },
    { rank: 21, username: "ursula", role: "member", ratingChange: -7, finalRating: 1273 },
    { rank: 22, username: "victor", role: "member", ratingChange: 6, finalRating: 1986 },
    { rank: 23, username: "wendy", role: "member", ratingChange: 3, finalRating: 1693 },
    { rank: 24, username: "xavier", role: "member", ratingChange: -9, finalRating: 1371 },
    { rank: 25, username: "yara", role: "member", ratingChange: 1, finalRating: 1721 },
    { rank: 26, username: "zack", role: "member", ratingChange: 5, finalRating: 1865 }
  ];
  
  // Handle registration/unregistration button click
  const handleRegistrationClick = () => {
    // In a real app, this would send a request to the server
    console.log(`${isRegistered ? 'Unregistering' : 'Registering'} for contest ${contestId} in group ${groupId}`);
    // Toggle registration state (would be in a server call in a real app)
    setIsRegistered(!isRegistered);
    // Refresh the page after the operation
    window.location.reload();
  };
  
  // Update user contest status with the current registration state
  useEffect(() => {
    // Update the contest status with the current registration state
    // In a real app, this would come from the server
  }, [isRegistered]);
  
  // Define columns for the registration list table
  const registrationColumns = ["User", "Rating", "Rated Contests"];
  
  // Define columns for the rank list table
  const rankColumns = ["Rank", "User", "Role", "Rating Change", "Final Rating"];
  
  // Transform data for the registration list table
  const registrationRows = registrationListData.map(user => [
    <Link to={`/user/${user.username}`} className="tableCellLink" style={{ color: getRatingColor(user.rating), fontWeight: 'bold' }}>{user.username}</Link>,
    <span style={{ color: getRatingColor(user.rating), fontWeight: 'bold' }}>{user.rating}</span>,
    user.ratedContests
  ]);
  
  // Transform data for the rank list table
  const rankRows = rankListData.map(user => {
    const ratingChangeText = user.ratingChange > 0 ? `+${user.ratingChange}` : user.ratingChange.toString();
    const ratingChangeColor = user.ratingChange > 0 ? 'green' : (user.ratingChange < 0 ? 'red' : 'gray');
    
    return [
      <span style={{ fontWeight: 'bold' }}>{user.rank}</span>,
      <Link to={`/user/${user.username}`} className="tableCellLink" style={{ color: getRatingColor(user.finalRating), fontWeight: 'bold' }}>{user.username}</Link>,
      <span style={{ textTransform: 'capitalize' }}>{user.role}</span>,
      <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
      <span style={{ color: getRatingColor(user.finalRating), fontWeight: 'bold' }}>{user.finalRating}</span>
    ];
  });
  
  return (
    <div className="page-container">
      {/* Contest Info Box */}
      <ContentBoxWithTitle title="Contest Info" backgroundColor="rgb(240, 240, 255)">
        <div>
          {/* Contest name with group name */}
          <h2 className="profileName" style={{ margin: '2.5px 0 5px 0' }}>
            {contestData.name} (<Link to={`/group/${groupId}`}>{groupId}</Link>)
          </h2>
          
          {/* Information elements list */}
          <div className={`${styles.statsList}`}>
            <div className={`${styles.statItem} standardTextFont`}>
              Status: <span style={{ 
                color: contestData.status === "active/upcoming" ? 'green' : '#E6A700' 
              }}>
                {contestData.status}
              </span>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Link: <a href={contestData.link} target="_blank" rel="noopener noreferrer">{contestData.link}</a>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Date: <span>{contestData.date}</span>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Time: <span>{contestData.time}</span>
            </div>
            <div className={`${styles.statItem} standardTextFont`}>
              Platform: <span>{contestData.platform.charAt(0).toUpperCase() + contestData.platform.slice(1)}</span>
            </div>
            
            {/* For completed contests, show user performance */}
            {!isUpcoming && (
              <>
                <div className={`${styles.statItem} standardTextFont`}>
                  Rank/Participants/Members: <span style={{ fontWeight: 'bold' }}>{userContestStatus.rank}</span>
                  <span style={{ fontSize: '0.7rem' }}>
                    /{userContestStatus.participantCount}/{userContestStatus.memberCount}
                  </span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Rating Change: <span style={{ 
                    color: userContestStatus.ratingChange > 0 ? 'green' : (userContestStatus.ratingChange < 0 ? 'red' : 'gray'),
                    fontWeight: 'bold' 
                  }}>
                    {userContestStatus.ratingChange > 0 ? `+${userContestStatus.ratingChange}` : userContestStatus.ratingChange}
                  </span>
                </div>
                <div className={`${styles.statItem} standardTextFont`}>
                  Final Rating: <span style={{ 
                    color: getRatingColor(userContestStatus.finalRating),
                    fontWeight: 'bold' 
                  }}>
                    {userContestStatus.finalRating}
                  </span>
                </div>
              </>
            )}
            
            {/* No registration button in the list anymore */}
          </div>
          
          {/* Registration buttons for active/upcoming contests - now outside the list */}
          {isUpcoming && (
            <div style={{ marginTop: '15px' }}>
              <button 
                className={`global-button ${isRegistered ? 'red' : 'green'}`}
                onClick={handleRegistrationClick}
              >
                {isRegistered ? 'Unregister' : 'Register'}
              </button>
            </div>
          )}
        </div>
      </ContentBoxWithTitle>
      
      {/* Registration or Rank list Box */}
      <div style={{ marginTop: '20px' }}>
        <SortablePagedTableBox 
          title={isUpcoming ? "Registration List" : "Rank List"}
          columns={isUpcoming ? registrationColumns : rankColumns}
          data={isUpcoming ? registrationRows : rankRows}
          backgroundColor="rgb(230, 255, 230)"
          itemsPerPage={15}
          initialSortColumnIndex={isUpcoming ? 1 : 0} // Rating column for registrations, Rank for results
          initialSortDirection={isUpcoming ? "desc" : "asc"} // Descending for rating, ascending for rank
        />
      </div>
    </div>
  );
};

export default GroupContestPage;
