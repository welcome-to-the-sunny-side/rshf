import React from 'react';
import { useParams } from 'react-router-dom';

export default function Post() {
  const { postId } = useParams();
  // This would eventually fetch the post by id
  return (
    <div>
      <h1>Post ID: {postId}</h1>
      <p>This is the post page for post ID {postId}.</p>
    </div>
  );
}
