from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timedelta, timezone, date
from zoneinfo import ZoneInfo
from typing import Optional, List
import os
import bcrypt
import jwt
import logging
import uuid
import io
import requests as http_requests
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation

# ─────────────────────────────────────────────
# Constants / Config
# ─────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent
MYT = ZoneInfo("Asia/Kuala_Lumpur")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = "HS256"
LOCKOUT_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# ─────────────────────────────────────────────
# OBJECT STORAGE
# ─────────────────────────────────────────────
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_STORAGE_PREFIX = "performance-pulse"
_storage_key = None

def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ─────────────────────────────────────────────
# EXCEL HELPERS
# ─────────────────────────────────────────────
REPORT_COL_HEADERS = [
    "Date", "Employee Name", "Department", "Job Title",
    "Morning Planned Tasks 9 AM – 12/1 PM", "Afternoon Planned Tasks 1/2 PM – 6 PM",
    "Final Completed Work Submit by 6 PM", "Task Category", "Task Status",
    "Calls Made", "Follow-ups", "Interested Leads", "Blockers / Issues",
    "Final Remarks", "Morning Plan Matched?", "Afternoon Plan Matched?",
    "Overall Tally Status", "Submitted By 6 PM?", "Review Status", "Manager Notes"
]

def generate_excel_template(employee_name: str = "", department: str = "") -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Daily Report"

    ws.merge_cells("A1:T1")
    ws["A1"] = "Employee Daily Reporting Template — Morning Plan, Afternoon Plan & 6 PM Final Report"
    ws["A1"].font = Font(bold=True, size=13, color="FFFFFF")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws["A1"].fill = PatternFill("solid", fgColor="1E3A5F")
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:T2")
    ws["A2"] = "Rule: Employees plan tasks before/after lunch and submit the final daily report by 6 PM. Final report must tally with the planned tasks."
    ws["A2"].font = Font(italic=True, size=10, color="444444")
    ws["A2"].fill = PatternFill("solid", fgColor="EFF6FF")

    header_fill = PatternFill("solid", fgColor="2563EB")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    for idx, header in enumerate(REPORT_COL_HEADERS, start=1):
        cell = ws.cell(row=4, column=idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
    ws.row_dimensions[4].height = 45

    today_str = get_myt_today()
    ws["A5"] = date.fromisoformat(today_str)
    ws["A5"].number_format = "YYYY-MM-DD"
    ws["B5"] = employee_name
    ws["C5"] = department

    col_widths = [14, 20, 15, 15, 35, 35, 35, 20, 15, 10, 10, 12, 25, 25, 18, 18, 18, 16, 15, 25]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w

    cat_vals = '"Admin Work,Letter Preparation,Client Calling,Digital Marketing,App Testing,Follow-up,Other"'
    dv_cat = DataValidation(type="list", formula1=cat_vals, allow_blank=True)
    dv_cat.sqref = "H5:H100"
    ws.add_data_validation(dv_cat)

    status_vals = '"Completed,In Progress,Pending,Delayed"'
    dv_status = DataValidation(type="list", formula1=status_vals, allow_blank=True)
    dv_status.sqref = "I5:I100"
    ws.add_data_validation(dv_status)

    # Add Weekly Summary sheet (placeholder)
    ws2 = wb.create_sheet("Weekly Summary")
    ws2["A1"] = "Weekly Summary — auto-generated by system"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

def parse_daily_report_excel(file_bytes: bytes) -> list:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    if "Daily Report" not in wb.sheetnames:
        raise ValueError("Excel file must contain a 'Daily Report' sheet")
    ws = wb["Daily Report"]
    rows_data = []

    for row in ws.iter_rows(min_row=5, values_only=True):
        row = list(row) + [None] * (20 - len(row))
        a, b, c, d, e, f, g, h, i, j, k, leads_val, m, n, o, p, q, r, s, t = row[:20]

        if all(v is None or str(v).strip() == "" for v in [a, b, e, f, g]):
            break
        if a is None:
            continue

        if hasattr(a, "strftime"):
            report_date = a.strftime("%Y-%m-%d")
        else:
            try:
                report_date = datetime.strptime(str(a).strip(), "%Y-%m-%d").strftime("%Y-%m-%d")
            except Exception:
                report_date = str(a).strip()

        def safe_int(v):
            try:
                return max(0, int(float(str(v)))) if v is not None and str(v).strip() else 0
            except Exception:
                return 0

        rows_data.append({
            "report_date": report_date,
            "employee_name": str(b or "").strip(),
            "department": str(c or "").strip(),
            "job_title": str(d or "").strip(),
            "morning_plan": str(e or "").strip(),
            "afternoon_plan": str(f or "").strip(),
            "final_report": str(g or "").strip(),
            "task_category": str(h or "Other").strip() or "Other",
            "task_status": str(i or "Completed").strip() or "Completed",
            "calls_made": safe_int(j),
            "follow_ups": safe_int(k),
            "interested_leads": safe_int(leads_val),
            "blockers": str(m or "").strip(),
            "final_remarks": str(n or "").strip(),
            "morning_plan_matched": str(o or "").strip(),
            "afternoon_plan_matched": str(p or "").strip(),
            "overall_tally_status": str(q or "").strip(),
            "submitted_by_6pm_excel": str(r or "").strip(),
            "review_status_from_excel": str(s or "").strip(),
            "manager_notes": str(t or "").strip(),
        })
    return rows_data

# ─────────────────────────────────────────────
# PERFORMANCE SCORE
# ─────────────────────────────────────────────

def calculate_performance_score(submitted: int, working_days: int, completed: int,
                                  delayed: int, missing: int, total_calls: int) -> dict:
    sub_rate = submitted / max(1, working_days)
    submission_score = round(min(30, sub_rate * 30))

    comp_rate = completed / max(1, submitted)
    completion_score = round(min(25, comp_rate * 25))

    avg_calls = total_calls / max(1, submitted)
    call_score = min(20, round((avg_calls / 5) * 20))

    delay_score = max(0, 15 - delayed * 3)
    missing_score = max(0, 10 - missing * 2)

    total = submission_score + completion_score + call_score + delay_score + missing_score

    if total >= 80:
        level = "Strong"
    elif total >= 60:
        level = "Good"
    elif total >= 40:
        level = "Average"
    else:
        level = "Needs Improvement"

    red_flags = []
    if missing > 2:
        red_flags.append(f"{missing} missing report days")
    if delayed > 3:
        red_flags.append(f"{delayed} delayed tasks")
    if sub_rate < 0.7 and working_days > 0:
        red_flags.append(f"Submission rate only {round(sub_rate * 100)}%")
    if avg_calls < 2 and submitted > 0:
        red_flags.append(f"Low call activity (avg {avg_calls:.1f}/day)")

    return {
        "performance_score": total,
        "performance_level": level,
        "red_flags": red_flags,
        "score_breakdown": {
            "submission": submission_score,
            "completion": completion_score,
            "calls": call_score,
            "delays": delay_score,
            "missing": missing_score,
        }
    }

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App
app = FastAPI()
api_router = APIRouter(prefix="/api")

# CORS
cors_origins_raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
cors_origins = [o.strip() for o in cors_origins_raw if o.strip() and o.strip() != "*"]
if not cors_origins:
    cors_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEPARTMENTS = ["Sales", "Marketing", "Operations", "IT", "HR", "Management", "Other"]
TASK_CATEGORIES = ["Admin Work", "Letter Preparation", "Client Calling", "Digital Marketing", "App Testing", "Follow-up", "Other"]
TASK_STATUSES = ["Completed", "In Progress", "Pending", "Delayed"]
REVIEW_STATUSES = ["submitted", "reviewed", "needs_correction"]

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def doc_to_dict(doc: dict) -> dict:
    if doc is None:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# Malaysia timezone helpers
def get_myt_today() -> str:
    return datetime.now(MYT).strftime("%Y-%m-%d")

def get_myt_now() -> datetime:
    return datetime.now(MYT)

def is_working_day(d: date) -> bool:
    return d.weekday() < 6  # Mon=0 ... Sat=5

def get_working_days_in_range(start: date, end: date) -> List[date]:
    days, current = [], start
    while current <= end:
        if is_working_day(current):
            days.append(current)
        current += timedelta(days=1)
    return days

def get_current_week_range():
    today = datetime.now(MYT).date()
    monday = today - timedelta(days=today.weekday())
    saturday = monday + timedelta(days=5)
    return monday, saturday

# ─────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.profiles.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        result = doc_to_dict(user)
        result.pop("password_hash", None)
        return result
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_active(current_user: dict = Depends(get_current_user)):
    if current_user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Account not active")
    return current_user

async def require_admin(current_user: dict = Depends(require_active)):
    if current_user.get("role") not in ["admin", "boss"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ─────────────────────────────────────────────
# Startup / Shutdown
# ─────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await db.profiles.create_index("email", unique=True)
    await db.daily_reports.create_index([("employee_id", 1), ("report_date", 1)], unique=True)
    await db.login_attempts.create_index("email")
    await db.login_attempts.create_index("attempted_at")
    logger.info("Performance Pulse backend started.")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ─────────────────────────────────────────────
# BRUTE FORCE HELPERS
# ─────────────────────────────────────────────

async def check_brute_force(email: str):
    """Raise 429 if this email has 5+ failed attempts in the last 15 minutes."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
    count = await db.login_attempts.count_documents({
        "email": email,
        "attempted_at": {"$gt": cutoff}
    })
    if count >= LOCKOUT_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Please try again after 15 minutes."
        )

async def record_failed_attempt(email: str):
    await db.login_attempts.insert_one({
        "email": email,
        "attempted_at": datetime.now(timezone.utc).isoformat()
    })

async def clear_failed_attempts(email: str):
    await db.login_attempts.delete_many({"email": email})

# ─────────────────────────────────────────────
# AUTH ROUTES
# ─────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(request: Request, response: Response):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    full_name = body.get("full_name", "").strip()
    department = body.get("department", "")
    job_title = body.get("job_title", "").strip()

    if not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="Email, password, and full name are required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing = await db.profiles.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "full_name": full_name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "employee",
        "status": "pending",
        "department": department,
        "job_title": job_title,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.profiles.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {"id": user_id, "full_name": full_name, "email": email,
            "role": "employee", "status": "pending", "department": department, "job_title": job_title}

@api_router.post("/auth/login")
async def login(request: Request, response: Response):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    # Brute force check — before any DB user lookup
    await check_brute_force(email)

    user = await db.profiles.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        await record_failed_attempt(email)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Successful login — clear any previous failed attempts
    await clear_failed_attempts(email)

    user_dict = doc_to_dict(user)
    user_dict.pop("password_hash", None)
    user_id = user_dict["id"]

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return user_dict

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.profiles.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        email = user.get("email", "")
        new_token = create_access_token(user_id, email)
        response.set_cookie("access_token", new_token, httponly=True, secure=False, samesite="lax", max_age=28800, path="/")
        return {"message": "Token refreshed"}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─────────────────────────────────────────────
# USER ROUTES
# ─────────────────────────────────────────────

@api_router.get("/users")
async def list_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    users = await db.profiles.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [doc_to_dict(u) for u in users]

@api_router.get("/users/departments")
async def get_departments(current_user: dict = Depends(get_current_user)):
    return {"departments": DEPARTMENTS}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(require_active)):
    if current_user["id"] != user_id and current_user["role"] not in ["admin", "boss"]:
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        user = await db.profiles.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return doc_to_dict(user)

@api_router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, request: Request, current_user: dict = Depends(require_admin)):
    body = await request.json()
    new_status = body.get("status")
    if new_status not in ["active", "inactive", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    try:
        result = await db.profiles.update_one({"_id": ObjectId(user_id)}, {"$set": {"status": new_status}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Status updated to {new_status}"}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, current_user: dict = Depends(require_admin)):
    body = await request.json()
    new_role = body.get("role")
    if new_role not in ["employee", "admin", "boss"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    try:
        result = await db.profiles.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": new_role}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {new_role}"}

@api_router.put("/users/{user_id}")
async def update_user_profile(user_id: str, request: Request, current_user: dict = Depends(require_active)):
    if current_user["id"] != user_id and current_user["role"] not in ["admin", "boss"]:
        raise HTTPException(status_code=403, detail="Access denied")
    body = await request.json()
    allowed = ["full_name", "department", "job_title", "phone", "profile_remarks"]
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    try:
        await db.profiles.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    return {"message": "Profile updated"}

# ─────────────────────────────────────────────
# REPORT ROUTES
# ─────────────────────────────────────────────

@api_router.get("/reports/template")
async def download_template(current_user: dict = Depends(require_active)):
    xlsx = generate_excel_template(current_user.get("full_name", ""), current_user.get("department", ""))
    return Response(
        content=xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=daily_report_{get_myt_today()}.xlsx"}
    )

@api_router.post("/reports/upload-preview")
async def upload_report_preview(file: UploadFile = File(...), current_user: dict = Depends(require_active)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can upload reports")
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted")

    content = await file.read()
    try:
        rows = parse_daily_report_excel(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=400, detail="No data found. Ensure row 5 onwards contains report data.")

    today_str = get_myt_today()
    today_date = date.fromisoformat(today_str)

    if not is_working_day(today_date):
        raise HTTPException(status_code=400, detail="Reports can only be submitted on working days (Monday to Saturday).")

    for row in rows:
        if row["report_date"] != today_str:
            raise HTTPException(
                status_code=400,
                detail=f"Report date '{row['report_date']}' does not match today ({today_str} MYT). Upload rejected."
            )

    existing = await db.daily_reports.find_one({"employee_id": current_user["id"], "report_date": today_str})
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted a report for today.")

    return {"preview": rows, "today": today_str, "filename": file.filename, "row_count": len(rows)}

@api_router.post("/reports/upload-confirm")
async def upload_report_confirm(file: UploadFile = File(...), current_user: dict = Depends(require_active)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can upload reports")
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are accepted")

    content = await file.read()
    try:
        rows = parse_daily_report_excel(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=400, detail="No data found in the Excel file.")

    today_str = get_myt_today()
    today_date = date.fromisoformat(today_str)

    if not is_working_day(today_date):
        raise HTTPException(status_code=400, detail="Reports can only be submitted on working days.")

    for row in rows:
        if row["report_date"] != today_str:
            raise HTTPException(status_code=400, detail=f"Report date mismatch. Expected {today_str}.")

    existing = await db.daily_reports.find_one({"employee_id": current_user["id"], "report_date": today_str})
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted a report for today.")

    # Upload file to object storage
    file_path = f"{APP_STORAGE_PREFIX}/reports/{current_user['id']}/{today_str}_{uuid.uuid4().hex[:8]}.xlsx"
    stored_path = None
    try:
        result = put_object(file_path, content,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        stored_path = result.get("path", file_path)
    except Exception as exc:
        logger.warning(f"Storage upload failed (proceeding without file): {exc}")

    # Aggregate multiple rows into one report
    primary = rows[0]
    if len(rows) > 1:
        morning_plan = "\n".join(r["morning_plan"] for r in rows if r["morning_plan"])
        afternoon_plan = "\n".join(r["afternoon_plan"] for r in rows if r["afternoon_plan"])
        final_report = "\n".join(r["final_report"] for r in rows if r["final_report"])
        statuses = [r["task_status"] for r in rows]
        for worst in ["Delayed", "Pending", "In Progress", "Completed"]:
            if worst in statuses:
                combined_status = worst
                break
        else:
            combined_status = "Completed"
    else:
        morning_plan = primary["morning_plan"]
        afternoon_plan = primary["afternoon_plan"]
        final_report = primary["final_report"]
        combined_status = primary["task_status"]

    report_doc = {
        "employee_id": current_user["id"],
        "employee_name": current_user.get("full_name", ""),
        "report_date": today_str,
        "morning_plan": morning_plan,
        "afternoon_plan": afternoon_plan,
        "final_report": final_report,
        "task_category": primary["task_category"],
        "task_status": combined_status,
        "calls_made": sum(r.get("calls_made", 0) for r in rows),
        "follow_ups": sum(r.get("follow_ups", 0) for r in rows),
        "interested_leads": sum(r.get("interested_leads", 0) for r in rows),
        "blockers": primary.get("blockers", ""),
        "final_remarks": primary.get("final_remarks", ""),
        "morning_plan_matched": primary.get("morning_plan_matched", ""),
        "afternoon_plan_matched": primary.get("afternoon_plan_matched", ""),
        "overall_tally_status": primary.get("overall_tally_status", ""),
        "review_status": "submitted",
        "upload_source": "excel",
        "original_filename": file.filename,
        "file_path": stored_path,
        "submitted_after_6pm": get_myt_now().hour >= 18,
        "raw_rows": rows,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    ins = await db.daily_reports.insert_one(report_doc)
    report_doc["id"] = str(ins.inserted_id)
    report_doc.pop("_id", None)
    return report_doc

@api_router.get("/files/{file_path:path}")
async def serve_file(file_path: str, current_user: dict = Depends(require_active)):
    try:
        data, content_type = get_object(file_path)
        return Response(content=data, media_type=content_type,
                        headers={"Content-Disposition": "attachment; filename=report.xlsx"})
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

@api_router.get("/reports/my")
async def get_my_reports(current_user: dict = Depends(require_active)):
    reports = await db.daily_reports.find(
        {"employee_id": current_user["id"]}
    ).sort("report_date", -1).to_list(200)
    return [doc_to_dict(r) for r in reports]

@api_router.get("/reports/today")
async def get_today_report(current_user: dict = Depends(require_active)):
    today_str = get_myt_today()
    report = await db.daily_reports.find_one({"employee_id": current_user["id"], "report_date": today_str})
    return {"report": doc_to_dict(report), "today": today_str, "is_working_day": is_working_day(date.fromisoformat(today_str))}

@api_router.get("/reports/employee/{employee_id}")
async def get_employee_reports(employee_id: str, current_user: dict = Depends(require_admin)):
    reports = await db.daily_reports.find(
        {"employee_id": employee_id}
    ).sort("report_date", -1).to_list(200)
    return [doc_to_dict(r) for r in reports]

@api_router.post("/reports")
async def submit_report(request: Request, current_user: dict = Depends(require_active)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Only employees can submit reports")

    body = await request.json()
    today_str = get_myt_today()
    today = date.fromisoformat(today_str)

    if not is_working_day(today):
        raise HTTPException(status_code=400, detail="Reports can only be submitted on working days (Monday to Saturday)")

    existing = await db.daily_reports.find_one({"employee_id": current_user["id"], "report_date": today_str})
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted a report for today")

    if not body.get("morning_plan") or not body.get("final_report"):
        raise HTTPException(status_code=400, detail="Morning plan and final report are required")

    task_category = body.get("task_category", "Other")
    task_status_val = body.get("task_status", "Completed")
    if task_category not in TASK_CATEGORIES:
        task_category = "Other"
    if task_status_val not in TASK_STATUSES:
        task_status_val = "Completed"

    report_doc = {
        "employee_id": current_user["id"],
        "employee_name": current_user.get("full_name", ""),
        "report_date": today_str,
        "morning_plan": body.get("morning_plan", ""),
        "afternoon_plan": body.get("afternoon_plan", ""),
        "final_report": body.get("final_report", ""),
        "task_category": task_category,
        "task_status": task_status_val,
        "calls_made": max(0, int(body.get("calls_made", 0))),
        "follow_ups": max(0, int(body.get("follow_ups", 0))),
        "interested_leads": max(0, int(body.get("interested_leads", 0))),
        "blockers": body.get("blockers", ""),
        "final_remarks": body.get("final_remarks", ""),
        "review_status": "submitted",
        "submitted_after_6pm": get_myt_now().hour >= 18,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.daily_reports.insert_one(report_doc)
    report_doc["id"] = str(result.inserted_id)
    report_doc.pop("_id", None)
    return report_doc

@api_router.get("/reports")
async def get_all_reports(
    employee_id: Optional[str] = None,
    report_date: Optional[str] = None,
    task_category: Optional[str] = None,
    task_status: Optional[str] = None,
    review_status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if report_date:
        query["report_date"] = report_date
    if task_category:
        query["task_category"] = task_category
    if task_status:
        query["task_status"] = task_status
    if review_status:
        query["review_status"] = review_status
    if date_from or date_to:
        date_q = {}
        if date_from:
            date_q["$gte"] = date_from
        if date_to:
            date_q["$lte"] = date_to
        query["report_date"] = date_q

    reports = await db.daily_reports.find(query).sort("report_date", -1).to_list(1000)
    return [doc_to_dict(r) for r in reports]

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user: dict = Depends(require_active)):
    try:
        report = await db.daily_reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user["role"] == "employee" and report.get("employee_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc_to_dict(report)

@api_router.put("/reports/{report_id}/review")
async def review_report(report_id: str, request: Request, current_user: dict = Depends(require_admin)):
    body = await request.json()
    review_status = body.get("review_status")
    if review_status not in REVIEW_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid review status")
    try:
        result = await db.daily_reports.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"review_status": review_status, "reviewed_by": current_user["id"],
                      "reviewed_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": f"Report marked as {review_status}"}

# ─────────────────────────────────────────────
# DASHBOARD ROUTES
# ─────────────────────────────────────────────

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    today_str = get_myt_today()
    today_date = date.fromisoformat(today_str)
    monday, saturday = get_current_week_range()
    week_start_str = monday.isoformat()
    week_end_str = saturday.isoformat()

    total_employees = await db.profiles.count_documents({"role": "employee"})
    active_employees = await db.profiles.count_documents({"role": "employee", "status": "active"})
    pending_approvals = await db.profiles.count_documents({"status": "pending"})
    reports_today = await db.daily_reports.count_documents({"report_date": today_str})

    missing_count = 0
    if is_working_day(today_date):
        all_active = await db.profiles.find(
            {"role": "employee", "status": "active"}, {"_id": 1}
        ).to_list(1000)
        reported_today = await db.daily_reports.find(
            {"report_date": today_str}, {"employee_id": 1}
        ).to_list(1000)
        reported_ids = {r["employee_id"] for r in reported_today}
        missing_count = sum(1 for e in all_active if str(e["_id"]) not in reported_ids)

    weekly_reports = await db.daily_reports.find({
        "report_date": {"$gte": week_start_str, "$lte": week_end_str}
    }).to_list(1000)

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "pending_approvals": pending_approvals,
        "reports_today": reports_today,
        "missing_today": missing_count,
        "total_calls_this_week": sum(r.get("calls_made", 0) for r in weekly_reports),
        "total_followups_this_week": sum(r.get("follow_ups", 0) for r in weekly_reports),
        "total_leads_this_week": sum(r.get("interested_leads", 0) for r in weekly_reports),
        "today": today_str,
        "is_working_day": is_working_day(today_date),
        "week_start": week_start_str,
        "week_end": week_end_str
    }

@api_router.get("/dashboard/boss-charts")
async def get_boss_charts(current_user: dict = Depends(require_admin)):
    """Returns aggregated chart data for Boss Dashboard visualizations."""
    monday, saturday = get_current_week_range()
    week_start_str = monday.isoformat()
    week_end_str = saturday.isoformat()

    # Task status breakdown for current week
    weekly_reports = await db.daily_reports.find({
        "report_date": {"$gte": week_start_str, "$lte": week_end_str}
    }).to_list(1000)

    task_breakdown = [
        {"status": "Completed", "count": sum(1 for r in weekly_reports if r.get("task_status") == "Completed"), "fill": "#10b981"},
        {"status": "In Progress", "count": sum(1 for r in weekly_reports if r.get("task_status") == "In Progress"), "fill": "#3b82f6"},
        {"status": "Pending", "count": sum(1 for r in weekly_reports if r.get("task_status") == "Pending"), "fill": "#f59e0b"},
        {"status": "Delayed", "count": sum(1 for r in weekly_reports if r.get("task_status") == "Delayed"), "fill": "#ef4444"},
    ]

    # Weekly score trend — last 6 weeks
    score_trend = []
    current_monday = monday
    for _ in range(6):
        w_start = current_monday
        w_end = current_monday + timedelta(days=5)
        summaries = await db.weekly_summaries.find({
            "week_start": w_start.isoformat(),
            "week_end": w_end.isoformat()
        }).to_list(200)
        avg_score = round(sum(s.get("performance_score", 0) for s in summaries) / len(summaries), 1) if summaries else 0
        score_trend.append({
            "week": w_start.strftime("%-d %b"),
            "avg_score": avg_score,
            "count": len(summaries)
        })
        current_monday = current_monday - timedelta(days=7)
    score_trend.reverse()

    return {
        "task_breakdown": task_breakdown,
        "score_trend": score_trend,
        "week_start": week_start_str,
        "week_end": week_end_str,
    }

@api_router.get("/dashboard/missing-today")
async def get_missing_today(current_user: dict = Depends(require_admin)):
    today_str = get_myt_today()
    today_date = date.fromisoformat(today_str)

    if not is_working_day(today_date):
        return {"is_working_day": False, "today": today_str, "missing_employees": []}

    active_employees = await db.profiles.find(
        {"role": "employee", "status": "active"}, {"password_hash": 0}
    ).to_list(1000)
    reported_today = await db.daily_reports.find(
        {"report_date": today_str}, {"employee_id": 1}
    ).to_list(1000)
    reported_ids = {r["employee_id"] for r in reported_today}
    missing = [doc_to_dict(e) for e in active_employees if str(e["_id"]) not in reported_ids]

    return {"is_working_day": True, "today": today_str, "missing_employees": missing}

# ─────────────────────────────────────────────
# WEEKLY SUMMARY ROUTES
# ─────────────────────────────────────────────

async def _generate_weekly_summary(employee_id: str, week_start_str: str, week_end_str: str) -> str:
    reports = await db.daily_reports.find({
        "employee_id": employee_id,
        "report_date": {"$gte": week_start_str, "$lte": week_end_str}
    }).to_list(100)

    start = date.fromisoformat(week_start_str)
    end = date.fromisoformat(week_end_str)
    today = datetime.now(MYT).date()
    past_working_days = [d for d in get_working_days_in_range(start, end) if d <= today]

    total_submitted = len(reports)
    missing_days = max(0, len(past_working_days) - total_submitted)

    completed = sum(1 for r in reports if r.get("task_status") == "Completed")
    in_progress = sum(1 for r in reports if r.get("task_status") == "In Progress")
    pending = sum(1 for r in reports if r.get("task_status") == "Pending")
    delayed = sum(1 for r in reports if r.get("task_status") == "Delayed")

    total_calls = sum(r.get("calls_made", 0) for r in reports)
    total_follow_ups = sum(r.get("follow_ups", 0) for r in reports)
    total_leads = sum(r.get("interested_leads", 0) for r in reports)

    parts = [
        f"[{r['report_date']}] {r.get('final_report', '').strip()}"
        for r in sorted(reports, key=lambda x: x["report_date"])
        if r.get("final_report", "").strip()
    ]
    compiled = " | ".join(parts) if parts else "No reports submitted this week."

    summary_doc = {
        "employee_id": employee_id,
        "week_start": week_start_str,
        "week_end": week_end_str,
        "total_reports_submitted": total_submitted,
        "working_days_in_period": len(past_working_days),
        "missing_days": missing_days,
        "completed_count": completed,
        "in_progress_count": in_progress,
        "pending_count": pending,
        "delayed_count": delayed,
        "total_calls": total_calls,
        "total_follow_ups": total_follow_ups,
        "total_interested_leads": total_leads,
        "compiled_summary": compiled,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        **calculate_performance_score(total_submitted, len(past_working_days), completed,
                                       delayed, missing_days, total_calls)
    }

    existing = await db.weekly_summaries.find_one({
        "employee_id": employee_id,
        "week_start": week_start_str,
        "week_end": week_end_str
    })

    if existing:
        await db.weekly_summaries.update_one({"_id": existing["_id"]}, {"$set": summary_doc})
        return str(existing["_id"])
    else:
        result = await db.weekly_summaries.insert_one(summary_doc)
        return str(result.inserted_id)

@api_router.post("/weekly-summaries/generate")
async def generate_weekly_summary(request: Request, current_user: dict = Depends(require_admin)):
    body = await request.json()
    employee_id = body.get("employee_id")
    week_start_str = body.get("week_start")
    week_end_str = body.get("week_end")

    if not week_start_str or not week_end_str:
        monday, saturday = get_current_week_range()
        week_start_str = monday.isoformat()
        week_end_str = saturday.isoformat()

    if employee_id:
        summary_id = await _generate_weekly_summary(employee_id, week_start_str, week_end_str)
        return {"message": "Summary generated", "id": summary_id, "week_start": week_start_str, "week_end": week_end_str}
    else:
        employees = await db.profiles.find(
            {"role": "employee", "status": "active"}, {"_id": 1}
        ).to_list(1000)
        count = 0
        for emp in employees:
            await _generate_weekly_summary(str(emp["_id"]), week_start_str, week_end_str)
            count += 1
        return {"message": f"Generated summaries for {count} employees", "count": count,
                "week_start": week_start_str, "week_end": week_end_str}

@api_router.post("/weekly-summaries/auto-generate")
async def auto_generate_weekly_summaries(current_user: dict = Depends(require_admin)):
    """Auto-generate summaries if it's Saturday >= 6 PM MYT"""
    now = get_myt_now()
    if now.weekday() != 5 or now.hour < 18:
        return {"auto_generated": False, "reason": "Only runs on Saturday at or after 6 PM MYT",
                "current_day": now.strftime("%A"), "current_hour": now.hour}

    monday, saturday = get_current_week_range()
    week_start_str = monday.isoformat()
    week_end_str = saturday.isoformat()

    employees = await db.profiles.find(
        {"role": "employee", "status": "active"}, {"_id": 1}
    ).to_list(1000)
    count = 0
    for emp in employees:
        await _generate_weekly_summary(str(emp["_id"]), week_start_str, week_end_str)
        count += 1

    return {"auto_generated": True, "count": count, "week_start": week_start_str, "week_end": week_end_str}

@api_router.get("/weekly-summaries")
async def list_weekly_summaries(
    employee_id: Optional[str] = None,
    week_start: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if week_start:
        query["week_start"] = week_start
    summaries = await db.weekly_summaries.find(query).sort("week_start", -1).to_list(200)
    return [doc_to_dict(s) for s in summaries]

@api_router.get("/weekly-summaries/employee/{employee_id}")
async def get_employee_summaries(employee_id: str, current_user: dict = Depends(require_admin)):
    summaries = await db.weekly_summaries.find(
        {"employee_id": employee_id}
    ).sort("week_start", -1).to_list(50)
    return [doc_to_dict(s) for s in summaries]

# ─────────────────────────────────────────────
# Misc
# ─────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Performance Pulse API", "status": "ok"}

app.include_router(api_router)
