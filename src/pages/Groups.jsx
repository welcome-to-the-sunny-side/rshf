import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';

export default function Groups() {
  // Re-define the main group
  const mainGroup = useMemo(() => ({
    id: 1,
    name: "main",
    type: "restricted membership",
    created: "2022-01-01",
    memberCount: 2543,
    isPinned: true // Keep this for potential future use, though not directly used by table
  }), []);

  // Generate dummy group entries (excluding the main group again)
  const groupsData = useMemo(() => [
    { id: 2, name: "CompetitiveProgramming", type: "anyone can join", created: "2022-03-15", memberCount: 1247 },
    { id: 3, name: "WebDevelopment", type: "anyone can join", created: "2022-04-22", memberCount: 856 },
    { id: 4, name: "MachineLearning", type: "restricted membership", created: "2022-05-10", memberCount: 943 },
    { id: 5, name: "AlgorithmStudy", type: "anyone can join", created: "2022-06-05", memberCount: 621 },
    { id: 6, name: "SystemDesign", type: "restricted membership", created: "2022-07-18", memberCount: 734 },
    { id: 7, name: "DataStructures", type: "anyone can join", created: "2022-08-30", memberCount: 512 },
    { id: 8, name: "GameDevelopment", type: "anyone can join", created: "2022-09-12", memberCount: 389 },
    { id: 9, name: "UIUXDesign", type: "restricted membership", created: "2022-10-05", memberCount: 278 },
    { id: 10, name: "MobileAppDev", type: "anyone can join", created: "2022-11-18", memberCount: 456 },
    { id: 11, name: "CloudComputing", type: "restricted membership", created: "2022-12-07", memberCount: 321 },
    { id: 12, name: "DevOps", type: "anyone can join", created: "2023-01-19", memberCount: 298 },
    { id: 13, name: "Cybersecurity", type: "restricted membership", created: "2023-02-03", memberCount: 345 },
    { id: 14, name: "ArtificialIntelligence", type: "restricted membership", created: "2023-03-22", memberCount: 587 },
    { id: 15, name: "Blockchain", type: "anyone can join", created: "2023-04-11", memberCount: 203 },
    { id: 16, name: "DatabaseDesign", type: "anyone can join", created: "2023-05-29", memberCount: 312 },
    { id: 17, name: "FrontendMasters", type: "restricted membership", created: "2023-06-14", memberCount: 429 },
    { id: 18, name: "BackendEngineers", type: "restricted membership", created: "2023-07-26", memberCount: 385 },
    { id: 19, name: "QualityAssurance", type: "anyone can join", created: "2023-08-09", memberCount: 267 },
    { id: 20, name: "APIDesign", type: "anyone can join", created: "2023-09-30", memberCount: 318 },
    { id: 21, name: "SoftwareArchitecture", type: "restricted membership", created: "2023-10-17", memberCount: 502 }
  ], []);

  // Function to format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Re-add Pin icon SVG component
  const PinIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      style={{ marginRight: '6px', verticalAlign: 'middle', color: '#555' }}
    >
      <path 
        fill="currentColor" 
        d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" 
      />
    </svg>
  );

  // Define columns for the table
  const columns = ["Group", "Type", "Date of Creation", "Members"];
  
  // Create main group row using useMemo for stability
  const mainGroupRow = useMemo(() => [
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <PinIcon />
      <Link to={`/group/${mainGroup.name}`} className="tableCellLink" style={{ fontWeight: 600 }}>{mainGroup.name}</Link>
    </div>,
    <span style={{ fontWeight: 500 }}>{mainGroup.type}</span>,
    <span style={{ fontWeight: 500 }}>{formatDate(mainGroup.created)}</span>,
    <span style={{ fontWeight: 500 }}>{mainGroup.memberCount.toLocaleString()}</span>
  ], [mainGroup]); // Depend on mainGroup object
  
  // Transform the rest of the data using useMemo
  const otherGroupsRows = useMemo(() => {
    return groupsData.map(group => [
      <Link to={`/group/${group.name}`} className="tableCellLink">{group.name}</Link>,
      group.type,
      formatDate(group.created),
      group.memberCount.toLocaleString()
    ]);
  }, [groupsData]); // Depend on groupsData array

  return (
    <div className="page-container">
      <SortablePagedTableBox 
        title={<span className={titleStyles.titleText}>Groups</span>}
        columns={columns}
        data={otherGroupsRows} // Pass the sortable rows
        pinnedRows={[mainGroupRow]} // Pass the pinned row(s) in an array
        backgroundColor="rgb(230, 240, 255)"
        itemsPerPage={15}
        initialSortColumnIndex={3} // Member Count column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
}
