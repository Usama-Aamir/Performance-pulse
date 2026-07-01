# Performance Pulse — Auth Testing Guide

## Step 1: MongoDB Verification
```bash
mongosh
use test_database
db.profiles.find({}).pretty()
db.profiles.findOne({role: "boss"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`

## Step 2: Create Boss Account
```bash
cd /app/scripts
python create_boss.py
```
Follow prompts.

## Step 3: API Testing (using curl)
```bash
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Login
curl -c /tmp/cookies.txt -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"boss@test.com","password":"YourPassword"}'

# Check session
curl -b /tmp/cookies.txt "$API_URL/api/auth/me"

# Get stats
curl -b /tmp/cookies.txt "$API_URL/api/dashboard/stats"

# Logout
curl -b /tmp/cookies.txt -X POST "$API_URL/api/auth/logout"
```

## Step 4: Register Employee
```bash
curl -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Employee","email":"employee@test.com","password":"Test1234!","department":"Sales","job_title":"Sales Executive"}'
```
Expected: user with status=pending, role=employee

## Step 5: Approve Employee (as boss/admin)
```bash
# First login as boss, then:
EMPLOYEE_ID="<id from step 4>"
curl -b /tmp/cookies.txt -X PUT "$API_URL/api/users/$EMPLOYEE_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

## Step 6: Submit Daily Report (as employee)
```bash
# Login as employee
curl -c /tmp/emp_cookies.txt -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@test.com","password":"Test1234!"}'

# Submit report
curl -b /tmp/emp_cookies.txt -X POST "$API_URL/api/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "morning_plan": "Review client emails and prepare proposals",
    "afternoon_plan": "Client calls and follow-ups",
    "final_report": "Completed 3 proposals, made 5 client calls",
    "task_category": "Client Calling",
    "task_status": "Completed",
    "calls_made": 5,
    "follow_ups": 2,
    "interested_leads": 1,
    "blockers": "",
    "final_remarks": "Good progress today"
  }'
```
