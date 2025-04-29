import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';

export default function GroupContests() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  
  // Determine which buttons to show based on user role
  const showSettingsButton = userRole === "moderator";
  
  // Generate only past contests data - no upcoming contests
  const pastContests = [
    { id: "246", name: "Weekly Algorithm Contest #46", platform: "CodeForces", dateTime: "2024-03-23 14:00", participants: 118 },
    { id: "247", name: "Web Development Challenge", platform: "AtCoder", dateTime: "2024-03-25 15:00", participants: 83 },
    { id: "223", name: "CodeForces Round #910", platform: "CodeForces", dateTime: "2024-03-20 12:00", participants: 145 },
    { id: "224", name: "AtCoder Beginner Contest 344", platform: "AtCoder", dateTime: "2024-03-18 08:00", participants: 92 },
    { id: "248", name: "Machine Learning Competition", platform: "AtCoder", dateTime: "2024-03-28 10:00", participants: 76 },
    { id: "225", name: "CodeForces Educational Round", platform: "CodeForces", dateTime: "2024-03-15 14:00", participants: 135 },
    { id: "249", name: "System Design Workshop", platform: "CodeForces", dateTime: "2024-03-30 16:00", participants: 64 },
    { id: "226", name: "AtCoder Regular Contest 168", platform: "AtCoder", dateTime: "2024-03-10 09:00", participants: 88 },
    { id: "227", name: "CodeForces Round #909", platform: "CodeForces", dateTime: "2024-03-08 18:00", participants: 137 },
    { id: "228", name: "AtCoder Beginner Contest 343", platform: "AtCoder", dateTime: "2024-03-05 08:00", participants: 96 },
    { id: "229", name: "Algorithm Fundamental Contest", platform: "CodeForces", dateTime: "2024-03-03 14:00", participants: 112 },
    { id: "230", name: "AtCoder Programming Contest", platform: "AtCoder", dateTime: "2024-02-28 08:00", participants: 79 },
    { id: "231", name: "CodeForces Round #908", platform: "CodeForces", dateTime: "2024-02-25 12:00", participants: 141 },
    { id: "232", name: "Data Structures Challenge", platform: "CodeForces", dateTime: "2024-02-22 16:00", participants: 108 },
    { id: "233", name: "AtCoder Beginner Contest 342", platform: "AtCoder", dateTime: "2024-02-20 08:00", participants: 91 },
    { id: "222", name: "Winter Challenge 2024", platform: "CodeForces", dateTime: "2024-02-18 10:00", participants: 120 },
    { id: "221", name: "Full Stack Coding Contest", platform: "AtCoder", dateTime: "2024-02-15 14:00", participants: 95 },
    { id: "220", name: "Algorithm Deep Dive", platform: "CodeForces", dateTime: "2024-02-12 11:00", participants: 128 },
    { id: "219", name: "Data Science Hackathon", platform: "AtCoder", dateTime: "2024-02-10 09:00", participants: 86 },
    { id: "218", name: "Security Challenge", platform: "CodeForces", dateTime: "2024-02-08 15:00", participants: 105 }
  ];
  
  // Function to format date
  const formatDateTime = (dateTimeStr) => {
    const dateTime = new Date(dateTimeStr);
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Define columns for the table
  const columns = ["Contest", "Platform", "Date/Time", "Participants"];
  
  // Transform the data for the table component
  const tableRows = pastContests.map(contest => [
    <Link to={`/contest/${contest.id}`} className="tableCellLink">{contest.name}</Link>,
    contest.platform,
    formatDateTime(contest.dateTime),
    contest.participants
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
      
      {/* Contests table */}
      <SortablePagedTableBox 
        columns={columns}
        data={tableRows}
        backgroundColor="rgb(230, 255, 230)" // Light green
        itemsPerPage={15}
        initialSortColumnIndex={2} // Date/Time column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
} 