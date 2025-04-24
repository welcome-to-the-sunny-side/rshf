import React from 'react';
import { useParams } from 'react-router-dom';

export default function ContestPage() {
  const { contest_id } = useParams();

  return (
    <div>
      <h1>Contest Details</h1>
      <p>Displaying information for Contest ID: <strong>{contest_id}</strong></p>
      {/* Add more contest details here later */}
    </div>
  );
} 