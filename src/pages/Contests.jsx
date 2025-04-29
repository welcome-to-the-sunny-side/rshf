import React from 'react';
import { Link } from 'react-router-dom';
import TableBox from '../components/TableBox';
import BasicTableBox from '../components/BasicTableBox';
import PagedTableBox from '../components/PagedTableBox';
import titleStyles from '../components/ContentBoxWithTitle.module.css';
import styles from './Contests.module.css';

export default function Contests() {
  // Dummy data for active/upcoming contests
  // Format: [name, link, platform, dateTime]
  const upcomingContests = [
    { 
      name: "Weekly Algorithm Contest #47", 
      link: "/contest/251", 
      platform: "CodeForces", 
      dateTime: "2024-04-06 14:00",
      id: "251"
    },
    { 
      name: "Front-End Development Challenge", 
      link: "/contest/252", 
      platform: "CodeForces", 
      dateTime: "2024-04-08 15:30",
      id: "252" 
    },
    { 
      name: "April CodeForces Round", 
      link: "/contest/253", 
      platform: "CodeForces", 
      dateTime: "2024-04-10 12:00",
      id: "253" 
    },
    { 
      name: "AtCoder Beginner Contest 345", 
      link: "/contest/255", 
      platform: "AtCoder", 
      dateTime: "2024-04-15 08:00",
      id: "255" 
    }
  ];

  // Dummy data for past contests
  // Format: [name, link, platform, dateTime]
  const pastContests = [
    { 
      name: "Weekly Algorithm Contest #46", 
      link: "/contest/246", 
      platform: "CodeForces", 
      dateTime: "2024-03-23 14:00",
      id: "246"
    },
    { 
      name: "Web Development Challenge", 
      link: "/contest/247", 
      platform: "AtCoder", 
      dateTime: "2024-03-25 15:00",
      id: "247"
    },
    { 
      name: "CodeForces Round #910", 
      link: "/contest/223", 
      platform: "CodeForces", 
      dateTime: "2024-03-20 12:00",
      id: "223"
    },
    { 
      name: "AtCoder Beginner Contest 344", 
      link: "/contest/224", 
      platform: "AtCoder", 
      dateTime: "2024-03-18 08:00",
      id: "224"
    },
    { 
      name: "Machine Learning Competition", 
      link: "/contest/248", 
      platform: "AtCoder", 
      dateTime: "2024-03-28 10:00",
      id: "248"
    },
    { 
      name: "CodeForces Educational Round", 
      link: "/contest/225", 
      platform: "CodeForces", 
      dateTime: "2024-03-15 14:00",
      id: "225"
    },
    { 
      name: "System Design Workshop", 
      link: "/contest/249", 
      platform: "CodeForces", 
      dateTime: "2024-03-30 16:00",
      id: "249"
    },
    { 
      name: "AtCoder Regular Contest 168", 
      link: "/contest/226", 
      platform: "AtCoder", 
      dateTime: "2024-03-10 09:00",
      id: "226"
    },
    { 
      name: "CodeForces Round #909", 
      link: "/contest/227", 
      platform: "CodeForces", 
      dateTime: "2024-03-08 18:00",
      id: "227"
    },
    { 
      name: "AtCoder Beginner Contest 343", 
      link: "/contest/228", 
      platform: "AtCoder", 
      dateTime: "2024-03-05 08:00",
      id: "228"
    },
    { 
      name: "Algorithm Fundamental Contest", 
      link: "/contest/229", 
      platform: "CodeForces", 
      dateTime: "2024-03-03 14:00",
      id: "229"
    },
    { 
      name: "AtCoder Programming Contest", 
      link: "/contest/230", 
      platform: "AtCoder", 
      dateTime: "2024-02-28 08:00",
      id: "230"
    },
    { 
      name: "CodeForces Round #908", 
      link: "/contest/231", 
      platform: "CodeForces", 
      dateTime: "2024-02-25 12:00",
      id: "231"
    },
    { 
      name: "Data Structures Challenge", 
      link: "/contest/232", 
      platform: "CodeForces", 
      dateTime: "2024-02-22 16:00",
      id: "232"
    },
    { 
      name: "AtCoder Beginner Contest 342", 
      link: "/contest/233", 
      platform: "AtCoder", 
      dateTime: "2024-02-20 08:00",
      id: "233"
    },
    { 
      name: "CodeForces Educational Round #2", 
      link: "/contest/234", 
      platform: "CodeForces", 
      dateTime: "2024-02-18 14:00",
      id: "234"
    },
    { 
      name: "Web Frontend Contest", 
      link: "/contest/235", 
      platform: "CodeForces", 
      dateTime: "2024-02-15 16:00",
      id: "235"
    },
    { 
      name: "AtCoder Regular Contest 167", 
      link: "/contest/236", 
      platform: "AtCoder", 
      dateTime: "2024-02-12 08:00",
      id: "236"
    },
    { 
      name: "CodeForces Round #907", 
      link: "/contest/237", 
      platform: "CodeForces", 
      dateTime: "2024-02-10 12:00",
      id: "237"
    },
    { 
      name: "Competitive Programming Kickstart", 
      link: "/contest/238", 
      platform: "CodeForces", 
      dateTime: "2024-02-08 10:00",
      id: "238"
    }
  ];

  // Transform the data for the TableBox component
  const columns = ["Contest", "Platform", "Date/Time"];
  
  // Function to create a Link component for all contests
  const createContestLink = (contest) => {
    return <Link to={`/contest/${contest.id}`} className="tableCellLink">{contest.name}</Link>;
  };

  // Function to format date for display
  const formatDateTime = (dateTimeStr) => {
    const dateTime = new Date(dateTimeStr);
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format data for upcoming contests
  const upcomingData = upcomingContests.map(contest => [
    createContestLink(contest),
    contest.platform,
    formatDateTime(contest.dateTime)
  ]);
  
  // Format data for past contests
  const pastData = pastContests.map(contest => [
    createContestLink(contest),
    contest.platform,
    formatDateTime(contest.dateTime)
  ]);

  return (
    <div className="page-container contestsPage">
      {/* Active/Upcoming Contests */}
      <TableBox 
        title={<span className={titleStyles.titleText}>Active/Upcoming Contests</span>}
        columns={columns}
        data={upcomingData}
        backgroundColor="rgb(230, 255, 230)" // Light green background
      />

      {/* Past Contests - Using PagedTableBox */}
      <PagedTableBox 
        title={<span className={titleStyles.titleText}>Past Contests</span>}
        columns={columns}
        data={pastData}
        backgroundColor="rgb(245, 245, 245)" // Light gray background
        itemsPerPage={15}
      />
    </div>
  );
}
