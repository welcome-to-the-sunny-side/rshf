import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';

export default function GroupContests() {
  const { groupId } = useParams();
  
  // User state simulation (would come from auth context in real app)
  const userRole = "moderator"; // Options: "moderator", "member", null (not a member), undefined (logged out)
  const isLoggedInUserMember = userRole === "moderator" || userRole === "member";
  
  // Determine which buttons to show based on user role
  const showSettingsButton = userRole === "moderator";
  
  // Generate only past contests data - no upcoming contests
  // Added dummy rank, ratingChange, and finalRating for member/moderator view
  const pastContests = [
    { id: "246", name: "Weekly Algorithm Contest #46", platform: "CodeForces", dateTime: "2024-03-23 14:00", participants: 118, rank: 15, ratingChange: 35, finalRating: 1650 },
    { id: "247", name: "Web Development Challenge", platform: "AtCoder", dateTime: "2024-03-25 15:00", participants: 83, rank: 5, ratingChange: 50, finalRating: 1700 },
    { id: "223", name: "CodeForces Round #910", platform: "CodeForces", dateTime: "2024-03-20 12:00", participants: 145, rank: 22, ratingChange: 12, finalRating: 1712 },
    { id: "224", name: "AtCoder Beginner Contest 344", platform: "AtCoder", dateTime: "2024-03-18 08:00", participants: 92, rank: 30, ratingChange: -5, finalRating: 1707 },
    { id: "248", name: "Machine Learning Competition", platform: "AtCoder", dateTime: "2024-03-28 10:00", participants: 76, rank: 8, ratingChange: 40, finalRating: 1747 },
    { id: "225", name: "CodeForces Educational Round", platform: "CodeForces", dateTime: "2024-03-15 14:00", participants: 135, rank: 18, ratingChange: 25, finalRating: 1772 },
    { id: "249", name: "System Design Workshop", platform: "CodeForces", dateTime: "2024-03-30 16:00", participants: 64, rank: 3, ratingChange: 60, finalRating: 1832 },
    { id: "226", name: "AtCoder Regular Contest 168", platform: "AtCoder", dateTime: "2024-03-10 09:00", participants: 88, rank: 10, ratingChange: 38, finalRating: 1870 },
    { id: "227", name: "CodeForces Round #909", platform: "CodeForces", dateTime: "2024-03-08 18:00", participants: 137, rank: 25, ratingChange: 8, finalRating: 1878 },
    { id: "228", name: "AtCoder Beginner Contest 343", platform: "AtCoder", dateTime: "2024-03-05 08:00", participants: 96, rank: 40, ratingChange: -15, finalRating: 1863 },
    { id: "229", name: "Algorithm Fundamental Contest", platform: "CodeForces", dateTime: "2024-03-03 14:00", participants: 112, rank: 12, ratingChange: 30, finalRating: 1893 },
    { id: "230", name: "AtCoder Programming Contest", platform: "AtCoder", dateTime: "2024-02-28 08:00", participants: 79, rank: 6, ratingChange: 45, finalRating: 1938 },
    { id: "231", name: "CodeForces Round #908", platform: "CodeForces", dateTime: "2024-02-25 12:00", participants: 141, rank: 20, ratingChange: 18, finalRating: 1956 },
    { id: "232", name: "Data Structures Challenge", platform: "CodeForces", dateTime: "2024-02-22 16:00", participants: 108, rank: 9, ratingChange: 42, finalRating: 1998 },
    { id: "233", name: "AtCoder Beginner Contest 342", platform: "AtCoder", dateTime: "2024-02-20 08:00", participants: 91, rank: 35, ratingChange: -10, finalRating: 1988 },
    { id: "222", name: "Winter Challenge 2024", platform: "CodeForces", dateTime: "2024-02-18 10:00", participants: 120, rank: 14, ratingChange: 33, finalRating: 2021 },
    { id: "221", name: "Full Stack Coding Contest", platform: "AtCoder", dateTime: "2024-02-15 14:00", participants: 95, rank: 7, ratingChange: 48, finalRating: 2069 },
    { id: "220", name: "Algorithm Deep Dive", platform: "CodeForces", dateTime: "2024-02-12 11:00", participants: 128, rank: 16, ratingChange: 28, finalRating: 2097 },
    { id: "219", name: "Data Science Hackathon", platform: "AtCoder", dateTime: "2024-02-10 09:00", participants: 86, rank: 4, ratingChange: 55, finalRating: 2152 },
    { id: "218", name: "Security Challenge", platform: "CodeForces", dateTime: "2024-02-08 15:00", participants: 105, rank: 11, ratingChange: 39, finalRating: 2191 }
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
  let columns = ["Contest", "Platform", "Date/Time", "Participants"];
  if (isLoggedInUserMember) {
    columns = [...columns, "Rank", "Rating Change", "Final Rating"];
  }
  
  // Transform the data for the table component
  const tableRows = pastContests.map(contest => {
    const baseData = [
    <Link to={`/contest/${contest.id}`} className="tableCellLink">{contest.name}</Link>,
    contest.platform,
    formatDateTime(contest.dateTime),
    contest.participants
    ];
    
    if (isLoggedInUserMember) {
      const ratingChangeText = contest.ratingChange > 0 ? `+${contest.ratingChange}` : contest.ratingChange.toString();
      const ratingChangeColor = contest.ratingChange > 0 ? 'green' : (contest.ratingChange < 0 ? 'red' : 'gray');
      
      return [
        ...baseData,
        contest.rank,
        <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
        <span style={{ color: getRatingColor(contest.finalRating), fontWeight: 'bold' }}>{contest.finalRating}</span>
      ];
    }
    
    return baseData;
  });

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showSettingsButton={showSettingsButton} />
      
      {/* Contests table */}
      <SortablePagedTableBox 
        columns={columns}
        data={tableRows}
        backgroundColor="rgb(230, 255, 230)" // Light green
        itemsPerPage={15}
        initialSortColumnIndex={isLoggedInUserMember ? 6 : 2} // Date/Time or Final Rating column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
} 