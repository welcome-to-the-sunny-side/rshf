import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SortablePagedTableBox from '../components/SortablePagedTableBox';
import { getRatingColor } from '../utils/ratingUtils';
import GroupNavBar from '../components/GroupNavBar';
import ContentBoxWithTitle from '../components/ContentBoxWithTitle';

export default function GroupReports() {
  const { groupId } = useParams();
  
  // State for report form
  const [respondent, setRespondent] = useState('');
  const [contestIds, setContestIds] = useState('');
  const [reportText, setReportText] = useState('');
  
  // Handle report creation (just a placeholder function)
  const handleCreateReport = () => {
    console.log('Creating report:', { respondent, contestIds, reportText });
    // In a real app, this would call an API to create the report
    alert('Report created!');
    setRespondent('');
    setContestIds('');
    setReportText('');
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Sample report data - in real app this would come from backend
  const reportsData = [
    { 
      id: 1, 
      contestId: 246,
      reporter: {
        username: "alice",
        rating: 2185,
        reportAccuracy: { accepted: 12, total: 15 }
      },
      respondent: {
        username: "frank",
        rating: 2100,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-20",
      status: "active"
    },
    { 
      id: 2, 
      contestId: null,
      reporter: {
        username: "bob",
        rating: 1890,
        reportAccuracy: { accepted: 7, total: 10 }
      },
      respondent: {
        username: "david",
        rating: 900,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [101, 203]
      },
      reportDate: "2024-03-19",
      status: "active"
    },
    { 
      id: 3, 
      contestId: 247,
      reporter: {
        username: "charlie",
        rating: 1450,
        reportAccuracy: { accepted: 5, total: 5 }
      },
      respondent: {
        username: "eric",
        rating: 1920,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-18",
      status: "processed",
      handledBy: {
        username: "moderator1",
        rating: 2300
      },
      responseDate: "2024-03-19"
    },
    { 
      id: 4, 
      contestId: null,
      reporter: {
        username: "diana",
        rating: 2050,
        reportAccuracy: { accepted: 8, total: 12 }
      },
      respondent: {
        username: "grace",
        rating: 1750,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [157]
      },
      reportDate: "2024-03-17",
      status: "active"
    },
    { 
      id: 5, 
      contestId: 245,
      reporter: {
        username: "evan",
        rating: 1780,
        reportAccuracy: { accepted: 3, total: 9 }
      },
      respondent: {
        username: "henry",
        rating: 1350,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-16",
      status: "processed",
      handledBy: {
        username: "moderator2",
        rating: 2250
      },
      responseDate: "2024-03-17"
    },
    // Additional 20 dummy entries
    { 
      id: 6, 
      contestId: 244,
      reporter: {
        username: "fiona",
        rating: 1650,
        reportAccuracy: { accepted: 10, total: 14 }
      },
      respondent: {
        username: "oscar",
        rating: 1680,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-15",
      status: "active"
    },
    { 
      id: 7, 
      contestId: null,
      reporter: {
        username: "george",
        rating: 1920,
        reportAccuracy: { accepted: 9, total: 11 }
      },
      respondent: {
        username: "peter",
        rating: 1520,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [142]
      },
      reportDate: "2024-03-14",
      status: "processed",
      handledBy: {
        username: "moderator3",
        rating: 2150
      },
      responseDate: "2024-03-15"
    },
    { 
      id: 8, 
      contestId: 243,
      reporter: {
        username: "hannah",
        rating: 2150,
        reportAccuracy: { accepted: 15, total: 18 }
      },
      respondent: {
        username: "quinn",
        rating: 1310,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-13",
      status: "active"
    },
    { 
      id: 9, 
      contestId: 242,
      reporter: {
        username: "isaac",
        rating: 1800,
        reportAccuracy: { accepted: 6, total: 8 }
      },
      respondent: {
        username: "rachel",
        rating: 2050,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-12",
      status: "processed",
      handledBy: {
        username: "moderator1",
        rating: 2300
      },
      responseDate: "2024-03-13"
    },
    { 
      id: 10, 
      contestId: null,
      reporter: {
        username: "julia",
        rating: 1550,
        reportAccuracy: { accepted: 11, total: 16 }
      },
      respondent: {
        username: "steve",
        rating: 1780,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [178]
      },
      reportDate: "2024-03-11",
      status: "active"
    },
    { 
      id: 11, 
      contestId: 241,
      reporter: {
        username: "kevin",
        rating: 1720,
        reportAccuracy: { accepted: 8, total: 13 }
      },
      respondent: {
        username: "taylor",
        rating: 1150,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-10",
      status: "processed",
      handledBy: {
        username: "moderator2",
        rating: 2250
      },
      responseDate: "2024-03-11"
    },
    { 
      id: 12, 
      contestId: 240,
      reporter: {
        username: "laura",
        rating: 2010,
        reportAccuracy: { accepted: 14, total: 17 }
      },
      respondent: {
        username: "ursula",
        rating: 1470,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-09",
      status: "active"
    },
    { 
      id: 13, 
      contestId: null,
      reporter: {
        username: "mike",
        rating: 1600,
        reportAccuracy: { accepted: 4, total: 7 }
      },
      respondent: {
        username: "victor",
        rating: 1830,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [132, 165]
      },
      reportDate: "2024-03-08",
      status: "processed",
      handledBy: {
        username: "moderator3",
        rating: 2150
      },
      responseDate: "2024-03-09"
    },
    { 
      id: 14, 
      contestId: 239,
      reporter: {
        username: "natalie",
        rating: 1850,
        reportAccuracy: { accepted: 10, total: 15 }
      },
      respondent: {
        username: "wendy",
        rating: 1250,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-07",
      status: "active"
    },
    { 
      id: 15, 
      contestId: 238,
      reporter: {
        username: "oliver",
        rating: 1980,
        reportAccuracy: { accepted: 12, total: 14 }
      },
      respondent: {
        username: "xavier",
        rating: 1580,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-06",
      status: "processed",
      handledBy: {
        username: "moderator1",
        rating: 2300
      },
      responseDate: "2024-03-07"
    },
    { 
      id: 16, 
      contestId: null,
      reporter: {
        username: "patricia",
        rating: 1520,
        reportAccuracy: { accepted: 9, total: 12 }
      },
      respondent: {
        username: "yvonne",
        rating: 1420,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [189]
      },
      reportDate: "2024-03-05",
      status: "active"
    },
    { 
      id: 17, 
      contestId: 237,
      reporter: {
        username: "quentin",
        rating: 1750,
        reportAccuracy: { accepted: 7, total: 9 }
      },
      respondent: {
        username: "zach",
        rating: 1950,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-04",
      status: "processed",
      handledBy: {
        username: "moderator2",
        rating: 2250
      },
      responseDate: "2024-03-05"
    },
    { 
      id: 18, 
      contestId: 236,
      reporter: {
        username: "robert",
        rating: 2120,
        reportAccuracy: { accepted: 16, total: 20 }
      },
      respondent: {
        username: "amanda",
        rating: 1680,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-03",
      status: "active"
    },
    { 
      id: 19, 
      contestId: null,
      reporter: {
        username: "sarah",
        rating: 1840,
        reportAccuracy: { accepted: 6, total: 10 }
      },
      respondent: {
        username: "brandon",
        rating: 1370,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [145]
      },
      reportDate: "2024-03-02",
      status: "processed",
      handledBy: {
        username: "moderator3",
        rating: 2150
      },
      responseDate: "2024-03-03"
    },
    { 
      id: 20, 
      contestId: 235,
      reporter: {
        username: "thomas",
        rating: 1900,
        reportAccuracy: { accepted: 11, total: 13 }
      },
      respondent: {
        username: "cathy",
        rating: 2080,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-03-01",
      status: "active"
    },
    { 
      id: 21, 
      contestId: 234,
      reporter: {
        username: "uma",
        rating: 1670,
        reportAccuracy: { accepted: 8, total: 11 }
      },
      respondent: {
        username: "derek",
        rating: 1560,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-02-29",
      status: "processed",
      handledBy: {
        username: "moderator1",
        rating: 2300
      },
      responseDate: "2024-03-01"
    },
    { 
      id: 22, 
      contestId: null,
      reporter: {
        username: "vincent",
        rating: 2000,
        reportAccuracy: { accepted: 13, total: 16 }
      },
      respondent: {
        username: "emily",
        rating: 1790,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [167, 192]
      },
      reportDate: "2024-02-28",
      status: "active"
    },
    { 
      id: 23, 
      contestId: 233,
      reporter: {
        username: "walter",
        rating: 1930,
        reportAccuracy: { accepted: 9, total: 12 }
      },
      respondent: {
        username: "felix",
        rating: 1640,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-02-27",
      status: "processed",
      handledBy: {
        username: "moderator2",
        rating: 2250
      },
      responseDate: "2024-02-28"
    },
    { 
      id: 24, 
      contestId: 232,
      reporter: {
        username: "xander",
        rating: 1720,
        reportAccuracy: { accepted: 7, total: 10 }
      },
      respondent: {
        username: "gina",
        rating: 1510,
        previouslyRemovedFromThisGroup: false,
        previousReportIds: []
      },
      reportDate: "2024-02-26",
      status: "active"
    },
    { 
      id: 25, 
      contestId: null,
      reporter: {
        username: "yolanda",
        rating: 1880,
        reportAccuracy: { accepted: 10, total: 14 }
      },
      respondent: {
        username: "harry",
        rating: 1970,
        previouslyRemovedFromThisGroup: true,
        previousReportIds: [138]
      },
      reportDate: "2024-02-25",
      status: "processed",
      handledBy: {
        username: "moderator3",
        rating: 2150
      },
      responseDate: "2024-02-26"
    }
  ];

  // Split reports into active and processed
  const activeReports = reportsData.filter(report => report.status === "active");
  const processedReports = reportsData.filter(report => report.status === "processed");

  // Function to transform report data into table rows
  const transformReportsData = (reports, includeHandledBy = false) => {
    return reports.map(report => {
      // Create the "Contest ID" content
      const contestContent = report.contestId ? (
        <Link to={`/group/${groupId}/contest/${report.contestId}`} className="tableCellLink">
          {report.contestId}
        </Link>
      ) : (
        <span>-</span>
      );
      
      // Calculate report accuracy percentage
      const accuracyPercentage = Math.round((report.reporter.reportAccuracy.accepted / report.reporter.reportAccuracy.total) * 100);
      
      // Create the "Previously Removed" content
      let previouslyRemovedContent;
      if (report.respondent.previouslyRemovedFromThisGroup) {
        // If previously removed, show links to reports
        previouslyRemovedContent = (
          <div style={{ color: 'red' }}>
            Yes - 
            {report.respondent.previousReportIds.map((reportId, index) => (
              <span key={reportId}>
                {index > 0 && ", "}
                <Link to={`/group/${groupId}/report/${reportId}`} className="tableCellLink">
                  {reportId}
                </Link>
              </span>
            ))}
          </div>
        );
      } else {
        // If not previously removed, show "No" in green
        previouslyRemovedContent = <div style={{ color: 'green' }}>No</div>;
      }
      
      // Create the row data
      const rowData = [
        report.id,
        contestContent,
        <Link to={`/user/${report.reporter.username}`} className="tableCellLink" style={{ color: getRatingColor(report.reporter.rating), fontWeight: 'bold' }}>
          {report.reporter.username}
        </Link>,
        <span title={`${report.reporter.reportAccuracy.accepted} accepted out of ${report.reporter.reportAccuracy.total} reports`}>
          {accuracyPercentage}% ({report.reporter.reportAccuracy.accepted}/{report.reporter.reportAccuracy.total})
        </span>,
        <Link to={`/user/${report.respondent.username}`} className="tableCellLink" style={{ color: getRatingColor(report.respondent.rating), fontWeight: 'bold' }}>
          {report.respondent.username}
        </Link>,
        previouslyRemovedContent,
        formatDate(report.reportDate),
        <Link 
          to={`/group/${groupId}/report/${report.id}`}
          style={{
            display: 'inline-block',
            backgroundColor: '#4a90e2',
            padding: '6px 12px',
            borderRadius: '4px',
            textDecoration: 'none',
            color: 'white',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
        >
          View →
        </Link>
      ];
      
      // Add additional columns for processed reports
      if (includeHandledBy && report.handledBy) {
        // Add reportee (previously "Handled by")
        rowData.push(
          <Link to={`/user/${report.handledBy.username}`} className="tableCellLink" style={{ color: getRatingColor(report.handledBy.rating), fontWeight: 'bold' }}>
            {report.handledBy.username}
          </Link>
        );
        
        // Add response date
        rowData.push(
          formatDate(report.responseDate)
        );
      }
      
      return rowData;
    });
  };

  // Define columns for the tables
  const activeColumns = ["Report ID", "Contest ID", "Reporter", "Report Accuracy", "Respondent", "Previously Removed", "Report Date", "Action"];
  const processedColumns = [...activeColumns.slice(0, -1), "Action", "Reportee", "Response Date"];
  
  // Transform the data for the table components
  const activeTableRows = transformReportsData(activeReports);
  const processedTableRows = transformReportsData(processedReports, true);

  return (
    <div className="page-container">
      {/* Floating button box */}
      <GroupNavBar groupId={groupId} showModViewButton={true} />
      
      {/* Create Report Box */}
      <ContentBoxWithTitle title="Create Report" backgroundColor="rgb(240, 240, 255)">
        <div className="contentBox standardTextFont" style={{ border: 'none', boxShadow: 'none', minHeight: 'auto', padding: '15px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="respondent" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Respondent:
            </label>
            <input
              id="respondent"
              type="text"
              value={respondent}
              onChange={(e) => setRespondent(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="contest-ids" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Contest ID(s):
            </label>
            <input
              id="contest-ids"
              type="text"
              value={contestIds}
              onChange={(e) => setContestIds(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="report-text" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Report (Max 500 characters):
            </label>
            <textarea
              id="report-text"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              maxLength={500}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <button
            onClick={handleCreateReport}
            className="global-button blue"
          >
            Create
          </button>
        </div>
      </ContentBoxWithTitle>
      
      {/* Active Reports Table */}
      <SortablePagedTableBox 
        title="Active Reports"
        columns={activeColumns}
        data={activeTableRows}
        backgroundColor="rgb(255, 245, 230)" // Light orange
        itemsPerPage={10}
        initialSortColumnIndex={0} // Report ID column
        initialSortDirection="desc" // Descending order
      />
      
      {/* Processed Reports Table */}
      <SortablePagedTableBox 
        title="Processed Reports"
        columns={processedColumns}
        data={processedTableRows}
        backgroundColor="rgb(230, 255, 240)" // Light green
        itemsPerPage={10}
        initialSortColumnIndex={0} // Report ID column
        initialSortDirection="desc" // Descending order
      />
    </div>
  );
} 