import React from 'react';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

export default function Contests() {
  return (
    <div className="page-container">
      <ContentBoxWithTitle 
        title="Current/Upcoming Contests"
        backgroundColor="rgb(230, 255, 230)" // Light green
      >
        {/* Contest listings or related content will go here */}
      </ContentBoxWithTitle>
      
      <ContentBoxWithTitle 
        title="Past Contests"
        backgroundColor="rgb(240, 240, 240)" // Grey
      >
        {/* Past contest listings will go here */}
      </ContentBoxWithTitle>
    </div>
  );
} 