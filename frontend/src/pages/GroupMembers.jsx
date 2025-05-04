import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';

export default function GroupMembers() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Determine which buttons to show based on user role
  const showModViewButton = userRole === "moderator";
  
  // Generate dummy members data
  const membersData = [
    { username: "alice", role: "moderator", rating: 2185, maxRating: 2300, ratedContests: 24, reportAccuracy: { accepted: 12, total: 15 }, dateJoined: "2022-01-15" },
    { username: "bob", role: "moderator", rating: 1890, maxRating: 2050, ratedContests: 18, reportAccuracy: { accepted: 7, total: 10 }, dateJoined: "2022-02-10" },
    { username: "charlie", role: "member", rating: 1450, maxRating: 1700, ratedContests: 32, reportAccuracy: { accepted: 5, total: 5 }, dateJoined: "2022-01-15" },
    { username: "david", role: "member", rating: 900, maxRating: 1200, ratedContests: 12, reportAccuracy: { accepted: 2, total: 7 }, dateJoined: "2022-03-22" },
    { username: "eve", role: "member", rating: 1200, maxRating: 1350, ratedContests: 8, reportAccuracy: { accepted: 4, total: 8 }, dateJoined: "2022-04-07" },
    { username: "frank", role: "member", rating: 2100, maxRating: 2250, ratedContests: 15, reportAccuracy: { accepted: 6, total: 9 }, dateJoined: "2022-05-14" },
    { username: "grace", role: "member", rating: 1750, maxRating: 1900, ratedContests: 20, reportAccuracy: { accepted: 11, total: 13 }, dateJoined: "2022-06-20" },
    { username: "hank", role: "member", rating: 1350, maxRating: 1550, ratedContests: 16, reportAccuracy: { accepted: 3, total: 6 }, dateJoined: "2022-07-05" },
    { username: "isabel", role: "member", rating: 1020, maxRating: 1220, ratedContests: 10, reportAccuracy: { accepted: 8, total: 12 }, dateJoined: "2022-08-12" },
    { username: "jack", role: "member", rating: 950, maxRating: 1150, ratedContests: 7, reportAccuracy: { accepted: 2, total: 4 }, dateJoined: "2022-09-03" },
    { username: "karen", role: "member", rating: 1800, maxRating: 1950, ratedContests: 25, reportAccuracy: { accepted: 15, total: 18 }, dateJoined: "2022-10-17" },
    { username: "leo", role: "member", rating: 1560, maxRating: 1700, ratedContests: 14, reportAccuracy: { accepted: 6, total: 11 }, dateJoined: "2022-11-29" },
    { username: "monica", role: "member", rating: 2250, maxRating: 2400, ratedContests: 30, reportAccuracy: { accepted: 14, total: 17 }, dateJoined: "2022-12-08" },
    { username: "nina", role: "member", rating: 1100, maxRating: 1300, ratedContests: 9, reportAccuracy: { accepted: 3, total: 5 }, dateJoined: "2023-01-15" },
    { username: "oscar", role: "member", rating: 1680, maxRating: 1850, ratedContests: 22, reportAccuracy: { accepted: 10, total: 14 }, dateJoined: "2023-02-23" },
    // Additional dummy data to show pagination
    { username: "peter", role: "member", rating: 1520, maxRating: 1700, ratedContests: 19, reportAccuracy: { accepted: 9, total: 12 }, dateJoined: "2023-03-05" },
    { username: "quinn", role: "member", rating: 1310, maxRating: 1450, ratedContests: 11, reportAccuracy: { accepted: 4, total: 7 }, dateJoined: "2023-03-18" },
    { username: "rachel", role: "member", rating: 2050, maxRating: 2150, ratedContests: 27, reportAccuracy: { accepted: 13, total: 16 }, dateJoined: "2023-04-02" },
    { username: "steve", role: "member", rating: 1780, maxRating: 1900, ratedContests: 23, reportAccuracy: { accepted: 11, total: 15 }, dateJoined: "2023-04-15" },
    { username: "taylor", role: "member", rating: 1150, maxRating: 1320, ratedContests: 8, reportAccuracy: { accepted: 2, total: 6 }, dateJoined: "2023-05-01" }
  ];
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Define columns for the table
  const columns = ["User", "Role", "Rating", "Max Rating", "Rated Contests", "Report Accuracy", "Date Joined"];
  
  // Transform the data for the table component
  const tableRows = membersData.map(member => [
    <Link to={`/user/${member.username}`} className="tableCellLink" style={{ color: getRatingColor(member.rating), fontWeight: 'bold' }}>{member.username}</Link>,
    <span style={{ textTransform: 'capitalize' }}>{member.role}</span>,
    <span style={{ color: getRatingColor(member.rating), fontWeight: 'bold' }}>{member.rating}</span>,
    <span style={{ color: getRatingColor(member.maxRating), fontWeight: 'bold' }}>{member.maxRating}</span>,
    member.ratedContests,
    <span title={`${member.reportAccuracy.accepted} accepted out of ${member.reportAccuracy.total} reports`}>
      {Math.round((member.reportAccuracy.accepted / member.reportAccuracy.total) * 100)}% ({member.reportAccuracy.accepted}/{member.reportAccuracy.total})
    </span>,
    formatDate(member.dateJoined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Members table */}
      <SortablePagedTableBox 
        columns={columns}
        data={tableRows}
        backgroundColor="rgb(230, 240, 255)"
        itemsPerPage={15}
        initialSortColumnIndex={2} // Rating column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
} 