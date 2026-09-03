# Performance Pulse — Product Requirements Document

## Overview
**Performance Pulse** is an internal employee daily reporting and performance tracking system for a small company. Helps the boss and admin track daily work, missing reports, employee effort, and basic weekly performance.

**App URL**: https://daily-pulse-237.preview.emergentagent.com

---

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, React Router v7, Recharts
- **Backend**: FastAPI (Python 3.11), Motor (async MongoDB driver), openpyxl
- **Database**: MongoDB
- **Auth**: JWT in httpOnly cookies, bcrypt password hashing
- **Storage**: Emergent Object Storage (called via plain `requests`, no SDK)
- **Timezone**: Asia/Kuala_Lumpur (MYT) for all report date logic
- **Deployment**: Render — Root: `backend/`, Build: `pip install -r requirements.txt`, Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`, runtime: `python-3.11.9`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret used to sign JWT access/refresh tokens |
| `MONGO_URI` / `MONGODB_URI` | Yes | MongoDB connection string |
| `REACT_APP_BACKEND_URL` | Yes | Frontend build-time URL for the backend API |
| `EMERGENT_LLM_KEY` | Yes | API key for Emergent Object Storage initialization |
| `COOKIE_SECURE` | Yes (prod) | Set `true` on Render (HTTPS) for cross-origin cookies |
| `ULTRAMSG_INSTANCE_ID` | Yes | UltraMsg instance ID for WhatsApp notifications |
| `ULTRAMSG_TOKEN` | Yes | UltraMsg API token |
| `BOSS_WHATSAPP_NUMBER` | Yes | Boss's WhatsApp number (international format, e.g. `+60123456789`) |
| `CRON_SECRET` | Yes | Shared secret for `/api/cron/dispatch-reminders` endpoint |

---

## Core Users
1. **Employee** — submits daily Excel reports, views own history, edits own profile
2. **Admin** — manages users, reviews reports, edits own profile
3. **Boss** — views performance overview, monitors missing reports, sees Recharts analytics

---

## Status & Role Flow
- New signup → role=employee, status=pending → WaitingApproval page
- status=pending → /waiting-approval
- status=rejected or inactive → /access-denied
- status=active + role=employee → /dashboard
- status=active + role=admin → /admin
- status=active + role=boss → /boss

---

## What's Been Implemented

### Authentication
- [x] Email/password login with JWT (httpOnly cookies)
- [x] User registration (role=employee, status=pending by default)
- [x] Role-based routing and route protection
- [x] Logout
- [x] Brute-force lockout: 5 failed attempts → 15-minute lockout per email

### User Management (Admin)
- [x] List all users with filters (status, role)
- [x] Approve/Reject/Deactivate users
- [x] Change user role (employee/admin/boss)
- [x] View user profile

### Daily Reports — Excel Upload Flow (Employee)
- [x] Upload .xlsx daily report (Employee Dashboard)
- [x] Backend parses "Daily Report" sheet: rows 1-3 skipped, row 4 = headers, row 5+ = data
- [x] Preview table shown before confirmation
- [x] Employee confirms → report saved, Excel stored in Object Storage
- [x] One report per employee per day (Malaysia timezone, Mon-Sat only)
- [x] Download Excel template (/api/reports/template)
- [x] Manual form fallback (collapsible in employee dashboard)
- [x] XLS badge shown in: Employee Dashboard, My Reports page, Employee Profile Report History
- [x] Fields: morning_plan, afternoon_plan, final_report, task_category, task_status, calls_made, follow_ups, interested_leads, blockers, final_remarks

### My Profile (All Roles)
- [x] /my-profile accessible for employee, admin, boss
- [x] Edit: full_name, department, job_title, phone, profile_remarks
- [x] Changes persist and update auth context

### Meetings / Appointments (v1.5)
- [x] Employees schedule meetings via `/meetings` page
- [x] Fields: title, meeting_with, start_at (MYT), duration_minutes, location, purpose
- [x] `start_at` stored as UTC ISO string, displayed in MYT
- [x] Status: scheduled, cancelled, completed
- [x] Instant WhatsApp notification to boss on create (via UltraMsg)
- [x] In-app alert posted to "Meeting Alerts" public channel
- [x] Boss/admin upcoming meetings widget on `/boss` dashboard
- [x] 2-hour WhatsApp/in-app reminder cron endpoint (`/api/cron/dispatch-reminders`)
- [x] Cron auto-completes stale scheduled meetings older than 24 hours

### Admin Reports Management
- [x] View all reports with filters (employee, date range, status, review status)
- [x] Mark reports as: submitted, reviewed, needs_correction

### Boss Dashboard
- [x] 8 stats cards: total_employees, active_employees, reports_today, missing_today, pending_approvals, calls_week, followups_week, leads_week
- [x] Missing reports today (red flag section with employee cards)
- [x] Employee search bar
- [x] Click employee → view Employee Profile
- [x] **Recharts Charts** (Iteration 4):
  - Task Status Breakdown (BarChart) — this week's completed/in_progress/pending/delayed
  - Team Activity This Week (BarChart) — calls/follow-ups/leads
  - Submitted vs Missing Today (BarChart)
  - Weekly Performance Score Trend (LineChart) — last 6 weeks avg score
- [x] Weekly Summary Auto-Generate button

### Employee Profile (Admin + Boss)
- [x] Profile card with stats
- [x] Report history tab (expandable rows, late submission flag)
- [x] Weekly summaries tab
- [x] Generate weekly summary (for specific week or current week)

### Weekly Summaries & Scoring
- [x] Manual generation by admin/boss
- [x] Auto-generation trigger on Saturday >= 6 PM MYT
- [x] Fields: week range, reports submitted, missing days, task status counts, calls/followups/leads, compiled summary
- [x] Working days: Mon–Sat
- [x] Performance scoring: Submission 30%, Completion 25%, Call Effort 20%, Zero Delays 15%, Zero Missing 10%
- [x] Levels: Strong (>=80), Good (>=60), Average (>=40), Needs Improvement (<40)

### Boss Account Setup
- [x] Script: `/app/scripts/promote_account.py`
- [x] No auto-seeded accounts on startup

---

## Excel Parsing Rules
- File must be `.xlsx`
- Sheet name: "Daily Report"
- Rows 1-3: ignored
- Row 4: headers
- Row 5+: data
- Report date must match today in Asia/Kuala_Lumpur timezone

---

## API Key Endpoints
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/dashboard/stats
- GET /api/dashboard/missing-today
- GET /api/dashboard/boss-charts (NEW - returns task_breakdown + score_trend for Recharts)
- PUT /api/users/{user_id}
- POST /api/reports/upload-preview (parse Excel, return preview rows)
- POST /api/reports/upload-confirm (store in Object Storage, save report)
- GET /api/reports/template (download xlsx template)
- GET /api/reports/my
- GET /api/reports/today
- GET /api/weekly-summaries
- POST /api/weekly-summaries/generate
- POST /api/weekly-summaries/auto-generate
- GET /api/weekly-summaries/employee/{employee_id}
- POST /api/meetings
- GET /api/meetings/my
- GET /api/meetings/upcoming
- GET /api/meetings
- PUT /api/meetings/{id}/cancel
- POST /api/cron/dispatch-reminders

---

## Test Credentials
| Role     | Email              | Password       | Status  |
|----------|--------------------|----------------|---------|
| boss     | boss@test.com      | BossTest123!   | active  |
| admin    | admin@test.com     | AdminTest123!  | active  |
| employee | employee@test.com  | Employee@1234  | active  |
| employee | pending@test.com   | EmpTest123!    | pending |

Boss full_name: "Mr. Seelaan" (set in DB, shows dynamically in sidebar)

---

## Departments (Preset)
Sales, Marketing, Operations, IT, HR, Management, Other

## Task Categories
Admin Work, Letter Preparation, Client Calling, Digital Marketing, App Testing, Follow-up, Other

## Task Statuses
Completed, In Progress, Pending, Delayed

---

## P0/P1/P2 Backlog

### P0 (Immediate — Critical)
- Nothing blocking core functionality

### P1 (Next Phase)
- Cookie secure=True when behind HTTPS (currently secure=False for dev)

### P2 (Future / Backlog)
- PDF export of weekly summaries
- Email notifications for missing reports
- Monthly report compilation
- AI analysis of weekly/monthly reports
- Employee attendance tracking

---

## Pages Built
1. /login — Login + Signup tabs
2. /waiting-approval — Pending approval page
3. /access-denied — Rejected/Inactive page
4. /dashboard — Employee Dashboard (Excel upload + preview + report history)
5. /my-reports — Employee report history
6. /my-profile — Profile edit (all roles: employee, admin, boss)
7. /admin — Admin Dashboard (stats + pending approvals + recent reports)
8. /admin/employees — Employee Management table
9. /admin/reports — Reports Management with filters
10. /boss — Boss Dashboard (8 stats + 4 Recharts charts + missing today + employee search + upcoming meetings)
11. /employee/:id — Employee Profile (admin + boss, report history + weekly summaries)
12. /meetings — Schedule and manage meetings (employee + admin + boss)

---

## Cron Job Setup (cron-job.org)

Endpoint to trigger every 15 minutes:

```
POST https://<your-render-backend-url>/api/cron/dispatch-reminders
```

Required header:
```
X-Cron-Secret: <CRON_SECRET>
```

Suggested cron-job.org settings:
- **Title**: Performance Pulse — Meeting Reminders
- **URL**: `https://<your-render-backend-url>/api/cron/dispatch-reminders`
- **Schedule**: `*/15 * * * *` (every 15 minutes)
- **HTTP Method**: `POST`
- **Headers**: `X-Cron-Secret: <CRON_SECRET>`
- **Timeout**: 60 seconds

> Make sure `CRON_SECRET` is also added to the Render backend environment variables.
