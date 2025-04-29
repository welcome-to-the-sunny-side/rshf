import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';

export default function GroupMembers() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Determine which buttons to show based on user role
  const showSettingsButton = userRole === "moderator";
  
  // Generate dummy members data
  const membersData = [
    { username: "alice", role: "moderator", rating: 2185, color: "rgb(255, 140, 0)", ratedContests: 24, dateJoined: "2022-01-15" },
    { username: "bob", role: "moderator", rating: 1890, color: "rgb(170, 0, 170)", ratedContests: 18, dateJoined: "2022-02-10" },
    { username: "charlie", role: "member", rating: 1450, color: "rgb(30, 150, 255)", ratedContests: 32, dateJoined: "2022-01-15" },
    { username: "david", role: "member", rating: 900, color: "rgb(0, 180, 0)", ratedContests: 12, dateJoined: "2022-03-22" },
    { username: "eve", role: "member", rating: 1200, color: "rgb(170, 170, 170)", ratedContests: 8, dateJoined: "2022-04-07" },
    { username: "frank", role: "member", rating: 2100, color: "rgb(170, 0, 170)", ratedContests: 15, dateJoined: "2022-05-14" },
    { username: "grace", role: "member", rating: 1750, color: "rgb(170, 0, 170)", ratedContests: 20, dateJoined: "2022-06-20" },
    { username: "hank", role: "member", rating: 1350, color: "rgb(30, 150, 255)", ratedContests: 16, dateJoined: "2022-07-05" },
    { username: "isabel", role: "member", rating: 1020, color: "rgb(0, 180, 0)", ratedContests: 10, dateJoined: "2022-08-12" },
    { username: "jack", role: "member", rating: 950, color: "rgb(0, 180, 0)", ratedContests: 7, dateJoined: "2022-09-03" },
    { username: "karen", role: "member", rating: 1800, color: "rgb(170, 0, 170)", ratedContests: 25, dateJoined: "2022-10-17" },
    { username: "leo", role: "member", rating: 1560, color: "rgb(30, 150, 255)", ratedContests: 14, dateJoined: "2022-11-29" },
    { username: "monica", role: "member", rating: 2250, color: "rgb(255, 140, 0)", ratedContests: 30, dateJoined: "2022-12-08" },
    { username: "nina", role: "member", rating: 1100, color: "rgb(170, 170, 170)", ratedContests: 9, dateJoined: "2023-01-15" },
    { username: "oscar", role: "member", rating: 1680, color: "rgb(170, 0, 170)", ratedContests: 22, dateJoined: "2023-02-23" },
    // Additional dummy data to show pagination
    { username: "peter", role: "member", rating: 1520, color: "rgb(30, 150, 255)", ratedContests: 19, dateJoined: "2023-03-05" },
    { username: "quinn", role: "member", rating: 1310, color: "rgb(30, 150, 255)", ratedContests: 11, dateJoined: "2023-03-18" },
    { username: "rachel", role: "member", rating: 2050, color: "rgb(170, 0, 170)", ratedContests: 27, dateJoined: "2023-04-02" },
    { username: "steve", role: "member", rating: 1780, color: "rgb(170, 0, 170)", ratedContests: 23, dateJoined: "2023-04-15" },
    { username: "taylor", role: "member", rating: 1150, color: "rgb(170, 170, 170)", ratedContests: 8, dateJoined: "2023-05-01" }
  ];
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Define columns for the table
  const columns = ["User", "Role", "Rating", "Rated Contests", "Date Joined"];
  
  // Transform the data for the table component
  const tableRows = membersData.map(member => [
    <Link to={`/user/${member.username}`} className="tableCellLink" style={{ color: member.color, fontWeight: 'bold' }}>{member.username}</Link>,
    <span style={{ textTransform: 'capitalize' }}>{member.role}</span>,
    <span style={{ color: member.color, fontWeight: 'bold' }}>{member.rating}</span>,
    member.ratedContests,
    formatDate(member.dateJoined)
  ]);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <div className="floatingButtonBox">
        <Link to={`/group/${groupId}`}>{groupId}</Link>
        <Link to={`/group/${groupId}/members`}>members</Link>
        <Link to={`/group/${groupId}/contests`}>contests</Link>
        {showSettingsButton && <Link to={`/group/${groupId}/settings`}>settings</Link>}
      </div>
      
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