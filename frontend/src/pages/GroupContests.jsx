import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './GroupContests.module.css';

export default function GroupContests() {
  const { groupId } = useParams();
  const { user, token } = useAuth();
  
  // State variables
  const [contests, setContests] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showModViewButton, setShowModViewButton] = useState(false);
  
  // Check if user is a member or moderator
  const isLoggedInUserMember = userRole === "moderator" || userRole === "member" || userRole === "admin";
  
  // Check user's membership in the group to determine role
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !token) {
        setUserRole(null);
        setShowModViewButton(false);
        return;
      }
      
      try {
        const response = await axios.get(`/api/membership`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId, user_id: user.user_id }
        });
        
        if (response.data && response.data.role) {
          setUserRole(response.data.role);
          setShowModViewButton(response.data.role === "moderator" || response.data.role === "admin");
        } else {
          setUserRole(null);
          setShowModViewButton(false);
        }
      } catch (err) {
        console.error('Failed to check membership:', err);
        setUserRole(null);
        setShowModViewButton(false);
      }
    };
    
    if (groupId) {
      checkMembership();
    }
  }, [groupId, user, token]);
  
  // Fetch contests data
  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get only finished contests
        const contestsResponse = await axios.get(`/api/contests`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          params: { finished: true }
        });
        
        // Sort contests by start time (newest first)
        const sortedContests = contestsResponse.data.sort((a, b) => 
          b.start_time_posix - a.start_time_posix
        );
        
        setContests(sortedContests);
        
        // If user is logged in and a member, fetch their participation data
        if (user && isLoggedInUserMember) {
          const participationsResponse = await axios.get(`/api/contest_participations`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { gid: groupId, uid: user.user_id }
          });
          console.log(participationsResponse.data);
          
          // Create a map for quick lookup by contest_id
          const participationsMap = {};
          participationsResponse.data.forEach(p => {
            participationsMap[p.contest_id] = p;
          });
          
          setParticipations(participationsMap);
        }
      } catch (err) {
        console.error('Failed to fetch contests data:', err);
        setError('Failed to load contests. Please try again later.');
        setContests([]);
        setParticipations({});
      } finally {
        setLoading(false);
      }
    };
    
    fetchContests();
  }, [groupId, user, token, isLoggedInUserMember]);
  
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
  const tableRows = contests.map(contest => {
    // Base data for all users (logged in or not)
    const baseData = [
      <Link to={`/group/${groupId}/contest/${contest.contest_id}`} className="tableCellLink">{contest.contest_name}</Link>,
      contest.platform,
      formatDateTime(new Date(contest.start_time_posix * 1000).toISOString()),
      "-" // Placeholder for participants count
    ];
    
    // Add participation data for members
    if (isLoggedInUserMember && user) {
      const participation = participations[contest.contest_id];
      
      if (participation) {
        // Calculate rating change
        const ratingBefore = participation.rating_before || 0;
        const ratingAfter = participation.rating_after || 0;
        const ratingChange = ratingAfter - ratingBefore;
        const ratingChangeText = ratingChange > 0 ? `+${ratingChange}` : ratingChange.toString();
        const ratingChangeColor = ratingChange > 0 ? 'green' : (ratingChange < 0 ? 'red' : 'gray');
        
        return [
          ...baseData,
          participation.rank || "-",
          <span style={{ color: ratingChangeColor, fontWeight: 'bold' }}>{ratingChangeText}</span>,
          <span style={{ color: getRatingColor(ratingAfter), fontWeight: 'bold' }}>{ratingAfter}</span>
        ];
      } else {
        // No participation data for this contest
        return [
          ...baseData,
          "-",
          "-",
          "-"
        ];
      }
    }
    
    return baseData;
  });

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={showModViewButton} />
      
      {/* Error message */}
      {error && (
        <div className="error-message" style={{ color: 'red', margin: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator" style={{ textAlign: 'center', margin: '50px' }}>
          Loading contests...
        </div>
      ) : (
        /* Contests table */
        <div className>
          <SortablePagedTableBox 
            columns={columns}
            data={tableRows}
            backgroundColor="rgb(230, 255, 230)" // Light green
            itemsPerPage={15}
            initialSortColumnIndex={isLoggedInUserMember ? 6 : 2} // Date/Time or Final Rating column
            initialSortDirection="desc" // Descending order
            className="groupContestsTable"
          />
        </div>
      )}
    </div>
  );
} 