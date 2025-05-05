import React from 'react';
import { Link } from 'react-router-dom';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';
import PagedTableBox from '../components/PagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import styles from './ContestPage.module.css';

const ContestPage = () => {
  // Set this to false to switch to completed contest view
  const isUpcoming = false;
  
  // Dummy contest data
  const contestData = {
    name: "CodeForces Round #950",
    status: isUpcoming ? "active/upcoming" : "completed",
    link: "https://codeforces.com/contest/950",
    date: "May 15, 2025",
    time: "14:00",
    platform: "codeforces"
  };
  
  // Dummy group data for upcoming contest
  const upcomingGroupsData = [
    { id: 1, name: "main", registeredUsers: 1045, totalUsers: 2543, isRegistered: true },
    { id: 2, name: "CompetitiveProgramming", registeredUsers: 345, totalUsers: 1247, isRegistered: false },
    { id: 3, name: "WebDevelopment", registeredUsers: 120, totalUsers: 856, isRegistered: false },
    { id: 4, name: "MachineLearning", registeredUsers: 235, totalUsers: 943, isRegistered: true },
    { id: 5, name: "AlgorithmStudy", registeredUsers: 205, totalUsers: 621, isRegistered: false },
    { id: 6, name: "SystemDesign", registeredUsers: 180, totalUsers: 734, isRegistered: false },
    { id: 7, name: "DataStructures", registeredUsers: 158, totalUsers: 512, isRegistered: true },
    { id: 8, name: "GameDevelopment", registeredUsers: 92, totalUsers: 389, isRegistered: false },
    { id: 9, name: "UIUXDesign", registeredUsers: 56, totalUsers: 278, isRegistered: false },
    { id: 10, name: "MobileAppDev", registeredUsers: 123, totalUsers: 456, isRegistered: false },
    { id: 11, name: "CloudComputing", registeredUsers: 87, totalUsers: 321, isRegistered: false },
    { id: 12, name: "DevOps", registeredUsers: 65, totalUsers: 298, isRegistered: false }
  ];
  
  // Dummy group data for completed contest
  const completedGroupsData = [
    { id: 1, name: "main", participatedUsers: 950, totalUsers: 2543, rank: 1, ratingChange: 15, finalRating: 2050 },
    { id: 2, name: "CompetitiveProgramming", participatedUsers: 340, totalUsers: 1247, rank: 3, ratingChange: 8, finalRating: 1800 },
    { id: 3, name: "WebDevelopment", participatedUsers: 110, totalUsers: 856, rank: 8, ratingChange: -5, finalRating: 1350 },
    { id: 4, name: "MachineLearning", participatedUsers: 230, totalUsers: 943, rank: 2, ratingChange: 12, finalRating: 1950 },
    { id: 5, name: "AlgorithmStudy", participatedUsers: 200, totalUsers: 621, rank: 4, ratingChange: 5, finalRating: 1750 },
    { id: 6, name: "SystemDesign", participatedUsers: 170, totalUsers: 734, rank: 6, ratingChange: -2, finalRating: 1650 },
    { id: 7, name: "DataStructures", participatedUsers: 150, totalUsers: 512, rank: 5, ratingChange: 3, finalRating: 1725 },
    { id: 8, name: "GameDevelopment", participatedUsers: 85, totalUsers: 389, rank: 10, ratingChange: -8, finalRating: 1250 },
    { id: 9, name: "UIUXDesign", participatedUsers: 50, totalUsers: 278, rank: 12, ratingChange: -12, finalRating: 1100 },
    { id: 10, name: "MobileAppDev", participatedUsers: 120, totalUsers: 456, rank: 7, ratingChange: 2, finalRating: 1550 },
    { id: 11, name: "CloudComputing", participatedUsers: 80, totalUsers: 321, rank: 9, ratingChange: -6, finalRating: 1475 },
    { id: 12, name: "DevOps", participatedUsers: 60, totalUsers: 298, rank: 11, ratingChange: -10, finalRating: 1300 }
  ];
  
  // Handle registration/unregistration button click
  const handleRegistrationClick = (groupId, currentStatus) => {
    // In a real app, this would send a request to the server
    console.log(`${currentStatus ? 'Unregistering' : 'Registering'} for group ID ${groupId}`);
    // Refresh the page or update the state after the operation
    window.location.reload();
  };
  
  // Define columns for the upcoming contest table
  const upcomingColumns = ["Group", "Registered", "Action"];
  
  // Define columns for the completed contest table
  const completedColumns = ["Group", "Rank/Participants/Members", "Rating Change", "Final Rating"];
  
  // Transform data for the upcoming contest table
  const upcomingRows = upcomingGroupsData.map(group => [
    <Link to={`/group/${group.name}/contest/${contestData.link.split('/').pop()}`} className="tableCellLink">{group.name}</Link>,
    `${group.registeredUsers}/${group.totalUsers}`,
    <button 
      className={`global-button ${group.isRegistered ? 'red' : 'green'}`}
      onClick={() => handleRegistrationClick(group.id, group.isRegistered)}
    >
      {group.isRegistered ? 'Unregister' : 'Register'}
    </button>
  ]);
  
  // Transform data for the completed contest table
  const completedRows = completedGroupsData.map(group => {
    const ratingChangeText = group.ratingChange > 0 ? `+${group.ratingChange}` : group.ratingChange.toString();
    const ratingChangeColor = group.ratingChange > 0 ? 'green' : (group.ratingChange < 0 ? 'red' : 'gray');
    
    return [
      <Link to={`/group/${group.name}/contest/${contestData.link.split('/').pop()}`} className="tableCellLink">{group.name}</Link>,
      <>
        <span style={{ fontWeight: 'bold' }}>{group.rank}</span>
        <span style={{ fontSize: '0.7rem' }}>
          /{group.participatedUsers}/{group.totalUsers}
        </span>
      </>,
      <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
      <span style={{ color: getRatingColor(group.finalRating), fontWeight: 'bold' }}>{group.finalRating}</span>
    ];
  });
  
  return (
    <div className="page-container">
      {/* Contest Info Box */}
      <ContentBoxWithTitle title="Contest Info" backgroundColor="rgb(240, 240, 255)">
        <div>
          {/* Contest name with drastically reduced padding */}
          <h2 className="profileName" style={{ margin: '2.5px 0 5px 0' }}>{contestData.name}</h2>
          
          {/* Information elements list with standard font - applied to parent */}
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
          </div>
        </div>
      </ContentBoxWithTitle>
      
      {/* Group View Box */}
      <div style={{ marginTop: '20px' }}>
        <PagedTableBox 
          title="Group View"
          columns={isUpcoming ? upcomingColumns : completedColumns}
          data={isUpcoming ? upcomingRows : completedRows}
          backgroundColor="rgb(230, 255, 230)"
          itemsPerPage={5}
        />
      </div>
    </div>
  );
};

export default ContestPage;