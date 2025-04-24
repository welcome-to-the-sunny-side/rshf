import React from 'react';
import { useParams } from 'react-router-dom';

export default function Group() {
  const { groupId } = useParams();
  return <p>group: {groupId}</p>;
}
