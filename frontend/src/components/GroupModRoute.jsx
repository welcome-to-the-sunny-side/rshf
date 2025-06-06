import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

/**
 * Route wrapper that restricts access to group moderators and admins only.
 * Usage:
 *   <GroupModRoute><TargetComponent /></GroupModRoute>
 */
export default function GroupModRoute({ children }) {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isModOrAdmin, setIsModOrAdmin] = useState(false);

  useEffect(() => {
    if (!groupId || !token || !user) {
      setLoading(false);
      setIsModOrAdmin(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        // Fetch group membership for this user and group (correct endpoint and params)
        const res = await axios.get(`/api/membership`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { group_id: groupId, user_id: user.user_id },
        });
        const role = res.data?.role;
        setIsModOrAdmin(role === 'moderator' || role === 'admin');
      } catch (err) {
        // On any error, just render nothing
        setIsModOrAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId, token, user]);

  if (loading) {
    return null;
  }

  if (!isModOrAdmin) {
    return null;
  }

  return <>{children}</>;
}
