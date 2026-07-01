# Performance Pulse — Product Requirements Document

## Overview
**Performance Pulse** is an internal employee daily reporting and performance tracking system for a small company. It helps the boss and admin track daily work, missing reports, employee effort, and basic weekly performance.

**App URL**: https://daily-pulse-237.preview.emergentagent.com

---

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, React Router v7
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT in httpOnly cookies, bcrypt password hashing
- **Timezone**: Asia/Kuala_Lumpur (MYT) for all report date logic

---

## Core Users
1. **Employee** — submits daily reports, views own history
2. **Admin** — manages users, reviews reports  
3. **Boss** — views performance overview, monitors missing reports

---

## Status & Role Flow
- New signup → role=employee, status=pending → WaitingApproval page
- status=pending → /waiting-approval
- status=rejected or inactive → /access-denied
- status=active + role=employee → /dashboard
- status=active + role=admin → /admin
- status=active + role=boss → /boss

---

## What's Been Implemented (Jul 2025)

### Authentication
- [x] Email/password login with JWT (httpOnly cookies)
- [x] User registration (role=employee, status=pending by default)
- [x] Role-based routing and route protection
- [x] Logout

### User Management (Admin)
- [x] List all users with filters (status, role)
- [x] Approve/Reject/Deactivate users
- [x] Change user role (employee/admin/boss)
- [x] View user profile

### Daily Reports (Employee)
- [x] Submit today's report (Malaysia timezone, Mon-Sat only)
- [x] One report per employee per day
- [x] Fields: morning_plan, afternoon_plan, final_report, task_category, task_status, calls_made, follow_ups, interested_leads, blockers, final_remarks
- [x] View own report history (expandable)

### Admin Reports Management
- [x] View all reports with filters (employee, date range, status, review status)
- [x] Mark reports as: submitted, reviewed, needs_correction

### Boss Dashboard
- [x] 8 stats cards: total_employees, active_employees, reports_today, missing_today, pending_approvals, calls_week, followups_week, leads_week
- [x] Missing reports today (red flag section with employee cards)
- [x] Employee search bar
- [x] Click employee → view Employee Profile

### Employee Profile (Admin + Boss)
- [x] Profile card with stats
- [x] Report history tab (expandable rows, late submission flag)
- [x] Weekly summaries tab
- [x] Generate weekly summary (for specific week or current week)

### Weekly Summaries
- [x] Manual generation by admin/boss
- [x] Auto-generation trigger on Saturday >= 6 PM MYT
- [x] Fields: week range, reports submitted, missing days, task status counts, calls/followups/leads, compiled summary
- [x] Working days: Mon–Sat

### Boss Account Creation
- [x] Secure interactive script: `/app/scripts/create_boss.py`
- [x] One-time creation, checks for existing boss
- [x] No auto-seeded accounts on startup

---

## Test Credentials
| Role     | Email            | Password       | Status  |
|----------|------------------|----------------|---------|
| boss     | boss@test.com    | BossTest123!   | active  |
| admin    | admin@test.com   | AdminTest123!  | active  |
| employee | emp@test.com     | EmpTest123!    | active  |
| employee | pending@test.com | EmpTest123!    | pending |

---

## Departments (Preset)
Sales, Marketing, Operations, IT, HR, Management, Other

## Task Categories
Admin Work, Letter Preparation, Client Calling, Digital Marketing, App Testing, Follow-up, Other

## Task Statuses
Completed, In Progress, Pending, Delayed

---

## P0/P1/P2 Backlog

### P0 (Immediate - Critical)
- Nothing blocking core functionality

### P1 (Next Phase)
- Brute force protection (lockout after 5 failed login attempts)
- Cookie secure=True when behind HTTPS (currently secure=False)

### P2 (Future)
- AI analysis of weekly/monthly reports
- PDF export of weekly summaries
- Email notifications for missing reports
- Monthly report compilation
- File upload support
- Employee attendance tracking
- Leave management

---

## Pages Built
1. /login — Login + Signup tabs
2. /waiting-approval — Pending approval page
3. /access-denied — Rejected/Inactive page
4. /dashboard — Employee Dashboard (report form + history)
5. /my-reports — Employee report history
6. /admin — Admin Dashboard (stats + pending approvals + recent reports)
7. /admin/employees — Employee Management table
8. /admin/reports — Reports Management with filters
9. /boss — Boss Dashboard (8 stats + missing today + employee search)
10. /employee/:id — Employee Profile (admin + boss, report history + weekly summaries)
