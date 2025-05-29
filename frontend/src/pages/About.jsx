import React from 'react';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

export default function About() {
  return (
    <div className="page-container">
      <ContentBoxWithTitle title="About">
        <p>This is the about page.</p>
        {/* Add more content here */}
      </ContentBoxWithTitle>

      <ContentBoxWithTitle title="Contact Us" backgroundColor="rgb(230, 255, 230)">
        <p>
          Feel free to email us at:{' '}
          <a href="mailto:rshf.net@gmail.com">rshf.net@gmail.com</a>.
        </p>
      </ContentBoxWithTitle>
    </div>
  );
} 