import React from 'react';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

export default function About() {
  // Inject page-specific style override for .contentBox
  // This will only affect this page
  return (
    <>
      <style>{`
        .page-container .contentBox {
          min-height: 0 !important;
          height: auto !important;
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }
      `}</style>
      <div className="page-container">
        <div className="standardTextFont">
      <ContentBoxWithTitle title="About" contentPadding="0.1rem 1rem" style={{ contentBox: { marginTop: 0, marginBottom: 0 } }}>
        <p>Nothing to see here.</p>
        {/* Add more content here */}
      </ContentBoxWithTitle>

      <ContentBoxWithTitle title="Contact Us" backgroundColor="rgb(230, 255, 230)" contentPadding="0.1rem 1rem" style={{ contentBox: { marginTop: 0, marginBottom: 0 } }}>
        <p>
          Email:{' '}
          <a href="mailto:rshf.net@gmail.com">rshf.net@gmail.com</a>.
        </p>
      </ContentBoxWithTitle>
        </div>
    </div>
    </>
  );
} 