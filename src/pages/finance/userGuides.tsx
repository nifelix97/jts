
import dashboardImg    from '../../assets/images/daf/dashboard.png';
import jobApprovalImg  from '../../assets/images/daf/jobapproval.png';
import employeesImg    from '../../assets/images/daf/employees.png';
import casualImg       from '../../assets/images/daf/casual.png';
import addWorkerImg    from '../../assets/images/daf/addWorker.png';
import payrollImg      from '../../assets/images/daf/payroll.png';
import createPayrollImg from '../../assets/images/daf/createPayroll.png';
import procurementImg  from '../../assets/images/daf/produrement.png';
import addMarketImg    from '../../assets/images/daf/addmarket.png';
import leaveImg        from '../../assets/images/daf/leave.png';
import requestLeaveImg from '../../assets/images/daf/requestleave.png';
import dafReportImg    from '../../assets/images/daf/dafreport.png';
import generateReportImg from '../../assets/images/daf/generatereport.png';
import myReportImg     from '../../assets/images/daf/myreport.png';
import receivedReportImg from '../../assets/images/daf/receivedreport.png';
import notificationImg from '../../assets/images/daf/notification.png';
import profileImg      from '../../assets/images/daf/profile.png';
import passwordImg     from '../../assets/images/daf/password.png';
import logoutImg       from '../../assets/images/daf/logout.png';

const imgStyle: React.CSSProperties = {
  maxWidth: '100%',
  height: 'auto',
  marginTop: '.6rem',
  borderRadius: '8px',
  border: '1px solid var(--color-custom-300)',
};

/* ── tiny reusable pieces ─────────────────────────────────────── */

function StepItem({ num, children }: { num?: number; children: React.ReactNode }) {
  return (
    <div className="step-item">
      {num !== undefined && <span className="step-num">{num}</span>}
      <span className="step-text">{children}</span>
    </div>
  );
}

/** Highlights a button / link name exactly as it appears in the UI */
function Btn({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{
      display: 'inline-block',
      background: 'var(--color-primary-100, #e0f2fe)',
      color: 'var(--color-primary-700, #0369a1)',
      borderRadius: '4px',
      padding: '0 5px',
      fontSize: '.78rem',
      fontWeight: 700,
      letterSpacing: '.01em',
    }}>
      {children}
    </strong>
  );
}

/** Sidebar link label badge */
function SideLink({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      background: 'var(--color-custom-100, #f1f5f9)',
      color: 'var(--color-secondary-100, #1e293b)',
      border: '1px solid var(--color-custom-300, #cbd5e1)',
      borderRadius: '6px',
      padding: '1px 7px',
      fontSize: '.78rem',
      fontWeight: 600,
    }}>
      {children}
    </strong>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-amber-50, #fffbeb)',
      border: '1px solid var(--color-amber-200, #fde68a)',
      borderRadius: '8px',
      padding: '.5rem .75rem',
      fontSize: '.8rem',
      color: 'var(--color-amber-800, #92400e)',
      marginTop: '.4rem',
    }}>
      ⚠️ {children}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export default function DAFUserGuide() {
  return (
    <div>

      {/* ══════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════ */}
      <div className="sec-title" id="daf">
        <div className="sec-icon sec-icon-blue">🏦</div>
        <div className="sec-text">
          <h2>DAF — Finance Controller</h2>
          <p>Complete guide to every page in your DAF dashboard</p>
        </div>
      </div>
      <div className="sec-divider" />

      <div className="info-box" style={{ marginBottom: '1.2rem' }}>
        <span className="box-icon">📌</span>
        <div className="box-content">
          <p>
            <strong>Your sidebar (in order):</strong>{' '}
            <SideLink>Dashboard</SideLink>{' '}·{' '}
            <SideLink>Job Approvals</SideLink>{' '}·{' '}
            <SideLink>Employees</SideLink>{' '}·{' '}
            <SideLink>Casual Workers</SideLink>{' '}·{' '}
            <SideLink>Payroll</SideLink>{' '}·{' '}
            <SideLink>Procurement</SideLink>{' '}·{' '}
            <SideLink>Leave Management</SideLink>{' '}·{' '}
            <SideLink>Reports ▾</SideLink>{' '}
            (sub-items: <SideLink>Generate Reports</SideLink> / <SideLink>Reports</SideLink>){' '}·{' '}
            <SideLink>Notifications</SideLink>{' '}·{' '}
            <SideLink>User Guide</SideLink>{' '}·{' '}
            <SideLink>Settings</SideLink>
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          1. DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--blue-100)' }}>📊</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">1. Dashboard</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Dashboard</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={dashboardImg} alt="DAF Dashboard" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            The dashboard is your <strong>overview hub</strong>. When you open the system this is the first page you land on.
          </p>
          <div className="step-box" style={{ marginTop: '.6rem' }}>
            <div className="step-box-title">What you see on the Dashboard</div>
            <StepItem>KPI cards at the top — <strong>Total Revenue, Pending Approvals, Active Employees, Confirmed Jobs</strong>.</StepItem>
            <StepItem>A <strong>Pending Job Approvals</strong> list showing job number, client name, amount and priority — so you can act quickly.</StepItem>
            <StepItem>A <strong>Recent Payments</strong> feed.</StepItem>
            <StepItem>A <strong>Job Status Overview</strong> bar (Pending / Confirmed / Rejected counts).</StepItem>
            <StepItem>An <strong>HR Summary by Department</strong> showing headcount per department.</StepItem>
          </div>
          <Note>The dashboard is read-only. To take action on a job go to <SideLink>Job Approvals</SideLink>.</Note>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. JOB APPROVALS
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--gold-pale)' }}>✅</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">2. Job Approvals</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Job Approvals</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={jobApprovalImg} alt="Job Approvals" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            This page lists every job submitted by the Sales team. You review them financially and decide to <strong>confirm</strong> or <strong>reject</strong> each one before production starts.
          </p>

          <div className="step-box" style={{ marginTop: '.8rem' }}>
            <div className="step-box-title">What you see</div>
            <StepItem>Summary cards: <strong>Pending · Confirmed · Rejected · Pending Value (RWF)</strong>.</StepItem>
            <StepItem>A searchable table with columns: <strong>Job # · Title &amp; Client · Amount · Priority · Status · Deadline · Actions</strong>.</StepItem>
            <StepItem>Pending jobs are highlighted in yellow.</StepItem>
            <StepItem>Each row has a 👁 eye icon to view full details, and a <strong>⋮</strong> menu on pending jobs for Confirm / Reject actions.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">✅ How to Confirm a job</div>
            <StepItem num={1}>Find the pending job (yellow row) in the table. Use the search box if needed.</StepItem>
            <StepItem num={2}>Click the <strong>⋮</strong> icon at the end of that row.</StepItem>
            <StepItem num={3}>Click <Btn>Confirm</Btn> in the dropdown menu.</StepItem>
            <StepItem num={4}>A modal opens showing job details (client, amount, status, deadline).</StepItem>
            <StepItem num={5}>Optionally type approval notes in the text area.</StepItem>
            <StepItem num={6}>Click <Btn>Confirm Job</Btn>. The job moves to production automatically.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">❌ How to Reject a job</div>
            <StepItem num={1}>Click the <strong>⋮</strong> icon on a pending job row.</StepItem>
            <StepItem num={2}>Click <Btn>Reject</Btn> in the dropdown menu.</StepItem>
            <StepItem num={3}>Type a <strong>reason for rejection</strong> in the field — this is required.</StepItem>
            <StepItem num={4}>Click <Btn>Confirm Rejection</Btn>. The job is marked rejected and the sales team is notified.</StepItem>
            <Note>You cannot reject a job without entering a reason.</Note>
          </div>

          <div className="step-box">
            <div className="step-box-title">👁 How to view full job details</div>
            <StepItem num={1}>Click the <strong>👁 eye icon</strong> on any job row.</StepItem>
            <StepItem num={2}>
              A detail panel opens showing: <strong>Client info · Job information · Materials needed · Financial data · Department position · Assigned workers</strong>.
            </StepItem>
            <StepItem num={3}>Click <Btn>Close</Btn> when done.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">🔍 How to search jobs</div>
            <StepItem num={1}>Type a job number, client name, or title in the <strong>Search jobs…</strong> box at the top-right of the table.</StepItem>
            <StepItem num={2}>The table filters instantly as you type.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3. EMPLOYEES
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--teal-100)' }}>👥</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">3. Employees</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Employees</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={employeesImg} alt="Employees" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            Manage the full-time and contract employee list — view profiles, edit details, and activate or deactivate staff accounts.
          </p>

          <div className="step-box" style={{ marginTop: '.8rem' }}>
            <div className="step-box-title">What you see</div>
            <StepItem>A table of all employees: <strong>Full Name · Phone · Gender · Contract Type · Salary · Status · Hired At</strong>.</StepItem>
            <StepItem>Filter controls: <strong>contract type dropdown, status dropdown, date range pickers</strong>.</StepItem>
            <StepItem>Summary box (bottom-right) showing totals and payroll.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">👤 How to find an employee</div>
            <StepItem num={1}>Click <SideLink>Employees</SideLink> in the sidebar.</StepItem>
            <StepItem num={2}>Use the <strong>All contracts</strong> dropdown to filter by contract type (Full Time, Part Time, Contract, Intern).</StepItem>
            <StepItem num={3}>Use the <strong>All statuses</strong> dropdown to show only Active or Inactive employees.</StepItem>
            <StepItem num={4}>Use the date pickers to filter by hire date range.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">📄 How to export the employee list</div>
            <StepItem num={1}>Apply the filters you want.</StepItem>
            <StepItem num={2}>Click <Btn>PDF</Btn> to download a PDF report of the current filtered list.</StepItem>
            <StepItem num={3}>Or click <Btn>Generate Report</Btn> to send a report to a recipient.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. CASUAL WORKERS
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--orange-100, #fff7ed)' }}>🧑‍🔧</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">4. Casual Workers (Abanyabiraka)</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Casual Workers</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={casualImg} alt="Casual Workers" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            Track temporary workers (abanyabiraka) — record their work period, daily rate, and total payment.
          </p>

          <div className="step-box" style={{ marginTop: '.8rem' }}>
            <div className="step-box-title">What you see</div>
            <StepItem>Stat cards: <strong>Total Workers · Total Days · Avg Daily Rate · Total Amount</strong>.</StepItem>
            <StepItem>Table: <strong>Full Name · Phone · Job Done · Start · End · Days · Daily Rate · Total</strong>.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">➕ How to add a casual worker</div>
            <StepItem num={1}>Click <Btn>Add Worker</Btn> (top-right of the page).</StepItem>
            <img src={addWorkerImg} alt="Add Casual Worker" style={imgStyle} />
            <StepItem num={2}>Fill in: <strong>Full Name, Phone (optional), Job Done, Start Date, End Date, Daily Rate (RWF), Notes (optional)</strong>.</StepItem>
            <StepItem num={3}>The system calculates <strong>Days Worked</strong> and <strong>Total Amount</strong> automatically.</StepItem>
            <StepItem num={4}>Click <Btn>Save</Btn> to record the worker.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">🗑 How to delete a casual worker record</div>
            <StepItem num={1}>Find the worker in the table.</StepItem>
            <StepItem num={2}>Click the <strong>🗑 delete icon</strong> on that row and confirm.</StepItem>
            <Note>Deletion is permanent. Make sure you no longer need the record before deleting.</Note>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          5. PAYROLL
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--green-100, #dcfce7)' }}>💵</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">5. Payroll</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Payroll</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={payrollImg} alt="Payroll" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            View, create, approve, and mark payroll records as paid — for both permanent employees and casual workers.
          </p>

          <div className="step-box" style={{ marginTop: '.8rem' }}>
            <div className="step-box-title">What you see</div>
            <StepItem>Stat cards: <strong>Total Records · Draft · Approved · Paid</strong>.</StepItem>
            <StepItem>Table: <strong>Employee / Worker · Type · Period · Salary · Overtime · Deductions · Net · Status</strong>.</StepItem>
            <StepItem>Filter by <strong>month</strong> and <strong>status</strong> (Draft / Approved / Paid).</StepItem>
            <StepItem>Summary box showing total Base Salary, Overtime, Deductions, and NET TOTAL.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">➕ How to create a payroll record</div>
            <StepItem num={1}>Click <Btn>Create Payroll</Btn>.</StepItem>
            <img src={createPayrollImg} alt="Create Payroll" style={imgStyle} />
            <StepItem num={2}>Select <strong>Worker Type</strong>: Employee or Casual Worker.</StepItem>
            <StepItem num={3}>Select the <strong>employee / casual worker</strong> from the list.</StepItem>
            <StepItem num={4}>Enter the <strong>Period</strong> (YYYY-MM format, e.g. 2025-06), <strong>Base Salary</strong>, <strong>Overtime</strong>, <strong>Deductions</strong>, and optional <strong>Notes</strong>.</StepItem>
            <StepItem num={5}>Click <Btn>Create Payroll</Btn>. The record is saved as <strong>Draft</strong>.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">✅ How to approve a payroll</div>
            <StepItem num={1}>Find a Draft payroll in the table.</StepItem>
            <StepItem num={2}>Click the <strong>✓ Approve</strong> action button on that row.</StepItem>
            <StepItem num={3}>The status changes from <strong>Draft → Approved</strong>.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">💳 How to mark a payroll as Paid</div>
            <StepItem num={1}>Find an Approved payroll in the table.</StepItem>
            <StepItem num={2}>Click the <strong>Mark Paid</strong> action button.</StepItem>
            <StepItem num={3}>The status changes from <strong>Approved → Paid</strong>.</StepItem>
            <Note>Only Approved payrolls can be marked as Paid.</Note>
          </div>

          <div className="step-box">
            <div className="step-box-title">📄 Export payroll report</div>
            <StepItem num={1}>Set the month filter and/or status filter as needed.</StepItem>
            <StepItem num={2}>Click <Btn>PDF</Btn> to download the filtered payroll list as a PDF.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          6. PROCUREMENT
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--purple-100)' }}>📦</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">6. Procurement / Market Leads</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Procurement</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={procurementImg} alt="Procurement" style={imgStyle} />
          <p style={{ fontSize: '.85rem', marginTop: '.6rem' }}>
            Track potential clients and sales opportunities through a pipeline of stages from first contact to deal closed.
          </p>

          <div className="step-box" style={{ marginTop: '.8rem' }}>
            <div className="step-box-title">What you see</div>
            <StepItem>Pipeline overview cards by stage: <strong>Prospect · Contacted · Negotiating · Won · Lost</strong> — click a card to filter the table to that stage.</StepItem>
            <StepItem>KPI cards: <strong>Total Leads · In Progress · Won · Overdue Follow-ups · Won Value (RWF)</strong>.</StepItem>
            <StepItem>Table: <strong>Company · Contact · Sector · Stage · Est. Value · Location · Next Follow-up · Added</strong>.</StepItem>
            <StepItem>A stage filter bar (All / Prospect / Contacted / Negotiating / Won / Lost).</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">➕ How to add a market lead</div>
            <StepItem num={1}>Click <Btn>Add Market Lead</Btn> (top-right of the page).</StepItem>
            <img src={addMarketImg} alt="Add Market Lead" style={imgStyle} />
            <StepItem num={2}>Fill in: <strong>Company name, Contact Person, Phone, Sector, Stage, Estimated Value (RWF), Location, Next Follow-up date</strong>.</StepItem>
            <StepItem num={3}>Click <Btn>Save</Btn>. The lead appears in the table under the selected stage.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">🔄 How to update a lead's stage</div>
            <StepItem num={1}>Find the lead in the table. Click the <strong>✏️ edit icon</strong> on that row.</StepItem>
            <StepItem num={2}>Change the <strong>Stage</strong> to reflect the deal's current status (Contacted → Negotiating → Won / Lost).</StepItem>
            <StepItem num={3}>Update the <strong>Next Follow-up</strong> date and any other fields. Click <Btn>Save</Btn>.</StepItem>
            <Note>Follow-up dates that have passed show a ⚠ warning in red — update them regularly.</Note>
          </div>

          <div className="step-box">
            <div className="step-box-title">🗑 How to delete a lead</div>
            <StepItem num={1}>Click the <strong>🗑 delete icon</strong> on the lead row.</StepItem>
            <StepItem num={2}>Confirm the deletion in the prompt that appears.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          7. LEAVE MANAGEMENT
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--gold-pale)' }}>🌴</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">7. Permissions</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Permissions</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">
          <p style={{ fontSize: '.85rem' }}>
            View your personal leave history and submit new leave requests. You can also see the status of any request you have sent.
          </p>

          <div className="step-box" style={{ marginTop: '.6rem' }}>
            <div className="step-box-title">📋 How to view your leave history</div>
            <StepItem num={1}>Click <SideLink>Permissions</SideLink> in the sidebar.</StepItem>
            <img src={leaveImg} alt="Leave page" style={imgStyle} />
            <StepItem num={2}>Your leave requests are listed with type, dates, status (Pending / Approved / Rejected), and reason.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">➕ How to request leave</div>
            <StepItem num={1}>Click <Btn>Request Leave</Btn>.</StepItem>
            <img src={requestLeaveImg} alt="Request Leave" style={imgStyle} />
            <StepItem num={2}>Choose a <strong>Leave Type</strong>: Annual, Sick, Maternity, Paternity, Emergency, Unpaid, or Other.</StepItem>
            <StepItem num={3}>Set the <strong>Start Date</strong> and <strong>End Date</strong>.</StepItem>
            <StepItem num={4}>Enter your <strong>Reason</strong> for the leave.</StepItem>
            <StepItem num={5}>Optionally attach a supporting document (e.g. medical certificate).</StepItem>
            <StepItem num={6}>Click <Btn>Submit Request</Btn>. Your request is sent for HR approval.</StepItem>
            <Note>You cannot cancel an already-approved leave. Cancel only while it is still Pending.</Note>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          8. REPORTS
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--blue-100)' }}>📋</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">8. Reports</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar: <SideLink>Reports ▾</SideLink> → <SideLink>Generate Reports</SideLink> · <SideLink>Reports</SideLink>
            </p>
          </div>
        </div>
        <div className="pc-body">

          <div className="step-box">
            <div className="step-box-title">📊 DAF Reports — Generate Reports tab</div>
            <p style={{ fontSize: '.83rem', marginBottom: '.5rem' }}>
              Click <SideLink>Reports</SideLink> → <SideLink>Generate Reports</SideLink> in the sidebar. This opens the full DAF report page with <strong>6 tabs</strong>:
            </p>
            <img src={dafReportImg} alt="DAF Reports" style={imgStyle} />
            <StepItem><strong>Job Approval</strong> — jobs filtered by day / week / month / year or custom date range.</StepItem>
            <StepItem><strong>Procurement</strong> — market leads pipeline filtered by stage.</StepItem>
            <StepItem><strong>Employees</strong> — employee list with contract, salary and status filters.</StepItem>
            <StepItem><strong>Payroll</strong> — payroll records filtered by month and status.</StepItem>
            <StepItem><strong>Leave</strong> — leave requests filtered by period and status.</StepItem>
            <StepItem><strong>Casual Workers</strong> — casual worker records filtered by period.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">📥 How to download a PDF report</div>
            <StepItem num={1}>Go to the desired tab (e.g. Employees).</StepItem>
            <StepItem num={2}>Apply any filters (period, status, contract type, etc.).</StepItem>
            <StepItem num={3}>Click the red <Btn>PDF</Btn> button. The PDF downloads immediately to your computer.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">📤 How to generate and send a report</div>
            <StepItem num={1}>Click the blue <Btn>Generate Report</Btn> button on any tab.</StepItem>
            <img src={generateReportImg} alt="Generate Report" style={imgStyle} />
            <StepItem num={2}>Fill in the report form — title, description, and <strong>select the recipient(s)</strong> who should receive it.</StepItem>
            <StepItem num={3}>Click <Btn>Submit</Btn>. The report is saved and sent to the selected recipients.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">🗂 My Reports — view reports you have sent</div>
            <StepItem num={1}>In the sidebar, click <SideLink>Reports</SideLink> → <SideLink>Reports</SideLink>.</StepItem>
            <img src={myReportImg} alt="My Reports" style={imgStyle} />
            <StepItem num={2}>This lists all reports <strong>you have generated</strong>, with title, date, and status.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">📬 Received Reports — view reports sent to you</div>
            <img src={receivedReportImg} alt="Received Reports" style={imgStyle} />
            <StepItem>This tab shows reports that other users have assigned/sent to you. You can read and download them here.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          9. NOTIFICATIONS
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--blue-100)' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">9. Notifications</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Notifications</SideLink> (bottom of sidebar — shows a red badge when unread)
            </p>
          </div>
        </div>
        <div className="pc-body">
          <img src={notificationImg} alt="Notifications" style={imgStyle} />
          <div className="step-box" style={{ marginTop: '.6rem' }}>
            <div className="step-box-title">How to use Notifications</div>
            <StepItem num={1}>Click <SideLink>Notifications</SideLink> in the bottom of the sidebar.</StepItem>
            <StepItem num={2}>All system alerts appear here — new job submissions, leave request updates, report arrivals, etc.</StepItem>
            <StepItem num={3}>Click a notification to mark it as read and navigate to the related page.</StepItem>
            <StepItem num={4}>Use <Btn>Mark all as read</Btn> to clear the unread badge at once.</StepItem>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          10. SETTINGS (Profile & Password)
      ══════════════════════════════════════════════════════════ */}
      <div className="page-card">
        <div className="pc-header">
          <div className="pc-icon" style={{ background: 'var(--gray-100, #f3f4f6)' }}>⚙️</div>
          <div style={{ flex: 1 }}>
            <div className="pc-title">10. Settings</div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-custom-700)', margin: '.2rem 0 0' }}>
              Sidebar link: <SideLink>Settings</SideLink> (bottom of sidebar)
            </p>
          </div>
        </div>
        <div className="pc-body">

          <div className="step-box">
            <div className="step-box-title">👤 How to update your profile</div>
            <StepItem num={1}>Click <SideLink>Settings</SideLink> in the sidebar.</StepItem>
            <StepItem num={2}>Click the <Btn>Profile</Btn> tab.</StepItem>
            <img src={profileImg} alt="Profile Settings" style={imgStyle} />
            <StepItem num={3}>Edit your <strong>name, email, phone number</strong> and any other personal details.</StepItem>
            <StepItem num={4}>Click <Btn>Save Changes</Btn> to apply the update.</StepItem>
          </div>

          <div className="step-box">
            <div className="step-box-title">🔑 How to change your password</div>
            <StepItem num={1}>Click <SideLink>Settings</SideLink> in the sidebar.</StepItem>
            <StepItem num={2}>Click the <Btn>Password</Btn> tab.</StepItem>
            <img src={passwordImg} alt="Change Password" style={imgStyle} />
            <StepItem num={3}>Enter your <strong>Current Password</strong>.</StepItem>
            <StepItem num={4}>Enter a <strong>New Password</strong> and repeat it in the <strong>Confirm Password</strong> field.</StepItem>
            <StepItem num={5}>Click <Btn>Update Password</Btn>.</StepItem>
            <Note>Choose a strong password. You will be asked to log in again after changing it.</Note>
          </div>

          <div className="step-box">
            <div className="step-box-title">🚪 How to log out</div>
            <StepItem num={1}>Click your <strong>avatar / name</strong> in the top-right corner of the page header. A dropdown menu opens.</StepItem>
            <img src={logoutImg} alt="Logout dropdown" style={imgStyle} />
            <StepItem num={2}>Click <Btn>Logout</Btn> (shown in red at the bottom of the dropdown).</StepItem>
            <StepItem num={3}>You are immediately signed out and redirected to the login page.</StepItem>
          </div>
        </div>
      </div>

    </div>
  );
}
