import React from 'react';
import { useParams } from 'react-router-dom';

// Renamed component from Profile to User
export default function User() { 
  const { username } = useParams();
  return <p>user: {username}</p>; // Changed text slightly for clarity
} 