import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';

// Sample group data - in real app this would come from backend
const sampleGroups = [
  { id: 1, name: "CompetitiveProgramming", memberCount: 1247 },
  { id: 2, name: "WebDevelopment", memberCount: 856 },
  { id: 3, name: "MachineLearning", memberCount: 943 },
  { id: 4, name: "AlgorithmStudy", memberCount: 621 },
  { id: 5, name: "SystemDesign", memberCount: 734 }
];

// Sample posts data - in real app this would come from backend
const samplePosts = [
  { date: "2024-03-20", link: "/post/135", title: "New Rating System Announcement" },
  { date: "2024-03-20", link: "/post/134", title: "Important: Server Maintenance Schedule" },
  { date: "2024-03-19", link: "/post/133", title: "March Contest Results" },
  { date: "2024-03-19", link: "/post/132", title: "Weekly Challenge Winners" },
  { date: "2024-03-18", link: "/post/131", title: "Interview Preparation Guide" },
  { date: "2024-03-18", link: "/post/130", title: "New Learning Resources Added" },
  { date: "2024-03-17", link: "/post/129", title: "Weekly Algorithm Challenge #45" },
  { date: "2024-03-17", link: "/post/128", title: "Community Spotlight: Top Contributors" },
  { date: "2024-03-16", link: "/post/127", title: "Community Highlights: February" },
  { date: "2024-03-16", link: "/post/126", title: "Upcoming Contest Schedule" },
  { date: "2024-03-15", link: "/post/125", title: "Site Update: New Features Released" },
  { date: "2024-03-15", link: "/post/124", title: "Group Study Session Recordings" },
  { date: "2024-03-14", link: "/post/123", title: "Monthly Programming Challenge Results" },
  { date: "2024-03-14", link: "/post/122", title: "New Learning Paths Launched" },
  { date: "2024-03-13", link: "/post/121", title: "Community Guidelines Update" },
  { date: "2024-03-12", link: "/post/120", title: "Coding Contest Winners April" },
  { date: "2024-03-11", link: "/post/119", title: "New Platform Feature: Rating Charts" },
  { date: "2024-03-10", link: "/post/118", title: "Top Performers of the Month" },
  { date: "2024-03-09", link: "/post/117", title: "API Documentation Update" },
  { date: "2024-03-08", link: "/post/116", title: "Women in Tech: Special Event" }
].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

// Sample contests data - in real app this would come from backend and be sorted
const sampleContests = [
  { name: "Weekly Algorithm Contest #46", link: "/contest/246", date: "2024-03-23 14:00" },
  { name: "Web Development Challenge", link: "/contest/247", date: "2024-03-25 15:00" },
  { name: "Machine Learning Competition", link: "/contest/248", date: "2024-03-28 10:00" },
  { name: "System Design Workshop", link: "/contest/249", date: "2024-03-30 16:00" },
  { name: "Code Sprint Challenge", link: "/contest/250", date: "2024-04-01 13:00" }
];

// Transform the data for the TableBox components
const groupColumns = ["Group", "Members"];
const groupData = sampleGroups.map(group => [
  <Link to={`/group/${group.name}`} className="tableCellLink">{group.name}</Link>,
  group.memberCount.toLocaleString()
]);

const postColumns = ["Post", "Date"];
const postData = samplePosts.map(post => [
  <Link to={post.link} className="tableCellLink">{post.title}</Link>,
  new Date(post.date).toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
]);

const contestColumns = ["Contest", "Date"];
const contestData = sampleContests.map(contest => [
  <Link to={contest.link} className="tableCellLink">{contest.name}</Link>,
  new Date(contest.date).toLocaleString('en-US', { 
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
]);

export default function Home() {
  return (
    <div className="page-container">
      <div className={styles['content-container']}>
        <div className={styles['left-sidebar']}>
          <TableBox 
            title={<Link to="/groups" className={titleStyles.titleLink}>Top Groups</Link>}
            columns={groupColumns}
            data={groupData}
            backgroundColor="rgb(230, 240, 255)"
          />

          <TableBox 
            title={<Link to="/contests" className={titleStyles.titleLink}>Active/Upcoming Contests</Link>}
            columns={contestColumns}
            data={contestData}
            backgroundColor="rgb(230, 255, 230)"
          />
        </div>
        
        {/* Using PagedTableBox for Posts */}
        <PagedTableBox 
          title="Announcements"
          columns={postColumns}
          data={postData}
          backgroundColor="rgb(255, 230, 230)"
          className={styles['main-content']}
          itemsPerPage={15}
        />
      </div>
    </div>
  );
}
