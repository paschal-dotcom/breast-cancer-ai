"""
================================================================
AI-POWERED EARLY BREAST CANCER DETECTION
FastAPI Backend — main.py
================================================================
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uvicorn
import os
import uuid
import json
import shutil

from predict import predict_image, generate_gradcam
from database import (init_db, create_user, get_user, create_scan,
                      get_user_scans, get_all_scans, get_dashboard_stats,
                      get_scan_by_id, delete_scan_db, update_user,
                      get_all_users, deactivate_user, get_system_logs,
                      log_action, get_risk_trends)
from report import generate_pdf_report
from auth import (create_access_token, verify_token, hash_password,
                  verify_password, SECRET_KEY, ALGORITHM)

# ── App Setup ─────────────────────────────────────────────────
app = FastAPI(
    title="AI Breast Cancer Detection System",
    description="Early breast cancer detection via thermal imaging using EfficientNetB3 + SVM",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://breast-cancer-ai-rosy.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

UPLOAD_DIR = "uploads"
REPORT_DIR = "reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# ── Pydantic Models ───────────────────────────────────────────
class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "user"  # "user" or "admin"

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    created_at: str

class ScanResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    risk_level: str
    confidence: float
    created_at: str

class DashboardStats(BaseModel):
    total_scans: int
    normal_count: int
    suspicious_count: int
    malignant_count: int
    total_users: int
    recent_scans: list

# ── Startup ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    init_db()
    # Create default admin if not exists
    existing = get_user("admin@breastcare.ai")
    if not existing:
        create_user(
            full_name="System Admin",
            email="admin@breastcare.ai",
            password=hash_password("Admin@1234"),
            role="admin"
        )
        print("Default admin created: admin@breastcare.ai / Admin@1234")

# ── Auth Helper ───────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    user = get_user(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ════════════════════════════════════════════════════════════
# AUTH ROUTES
# ════════════════════════════════════════════════════════════
@app.post("/auth/register")
async def register(user_data: UserRegister):
    existing = get_user(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(
        full_name=user_data.full_name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role=user_data.role
    )
    log_action("USER_REGISTERED", f"New user: {user_data.email}")
    return {"message": "Account created successfully", "user_id": user["id"]}

@app.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    log_action("USER_LOGIN", f"User logged in: {user['email']}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user

# ════════════════════════════════════════════════════════════
# SCAN / PREDICTION ROUTES
# ════════════════════════════════════════════════════════════
@app.post("/scan/upload")
async def upload_scan(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload PNG or JPG images only."
        )

    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")

    with open(save_path, "wb") as f:
        f.write(contents)

    # Run prediction
    try:
        prediction = predict_image(save_path)
        gradcam_path = generate_gradcam(save_path, file_id)
    except Exception as e:
        os.remove(save_path)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    # Save scan to database
    scan = create_scan(
        user_id=current_user["id"],
        filename=file.filename,
        file_path=save_path,
        gradcam_path=gradcam_path,
        risk_level=prediction["risk_level"],
        confidence=prediction["confidence"],
        normal_prob=prediction["probabilities"]["Normal"],
        suspicious_prob=prediction["probabilities"]["Suspicious"],
        malignant_prob=prediction["probabilities"]["Malignant"]
    )

    log_action("SCAN_UPLOADED", f"User {current_user['email']} uploaded scan — Result: {prediction['risk_level']}")

    return {
        "scan_id": scan["id"],
        "risk_level": prediction["risk_level"],
        "confidence": prediction["confidence"],
        "probabilities": prediction["probabilities"],
        "recommendation": prediction["recommendation"],
        "gradcam_url": f"/scan/gradcam/{file_id}",
        "message": "Scan analysed successfully"
    }

@app.get("/scan/gradcam/{file_id}")
async def get_gradcam(file_id: str, current_user=Depends(get_current_user)):
    gradcam_path = os.path.join(UPLOAD_DIR, f"{file_id}_gradcam.png")
    if not os.path.exists(gradcam_path):
        raise HTTPException(status_code=404, detail="Grad-CAM image not found")
    return FileResponse(gradcam_path, media_type="image/png")

@app.get("/scan/history")
async def get_scan_history(current_user=Depends(get_current_user)):
    scans = get_user_scans(current_user["id"])
    return {"scans": scans, "total": len(scans)}

@app.get("/scan/{scan_id}")
async def get_scan(scan_id: int, current_user=Depends(get_current_user)):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["user_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return scan

@app.delete("/scan/{scan_id}")
async def delete_scan(scan_id: int, current_user=Depends(get_current_user)):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["user_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    delete_scan_db(scan_id)
    log_action("SCAN_DELETED", f"Scan {scan_id} deleted by {current_user['email']}")
    return {"message": "Scan deleted successfully"}

# ════════════════════════════════════════════════════════════
# REPORT ROUTES
# ════════════════════════════════════════════════════════════
@app.get("/report/{scan_id}")
async def download_report(scan_id: int, current_user=Depends(get_current_user)):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["user_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    report_path = generate_pdf_report(scan, current_user)
    log_action("REPORT_DOWNLOADED", f"Report for scan {scan_id} by {current_user['email']}")
    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=f"breast_cancer_report_{scan_id}.pdf"
    )

# ════════════════════════════════════════════════════════════
# RISK TRENDS (Premium Feature)
# ════════════════════════════════════════════════════════════
@app.get("/trends")
async def get_trends(current_user=Depends(get_current_user)):
    trends = get_risk_trends(current_user["id"])
    return {"trends": trends}

# ════════════════════════════════════════════════════════════
# SCAN COMPARISON (Premium Feature)
# ════════════════════════════════════════════════════════════
@app.get("/scan/compare/{scan_id_1}/{scan_id_2}")
async def compare_scans(
    scan_id_1: int,
    scan_id_2: int,
    current_user=Depends(get_current_user)
):
    scan1 = get_scan_by_id(scan_id_1)
    scan2 = get_scan_by_id(scan_id_2)

    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="One or both scans not found")

    # Calculate risk change
    risk_order = {"Normal": 0, "Suspicious": 1, "Malignant": 2}
    risk1 = risk_order.get(scan1["risk_level"], 0)
    risk2 = risk_order.get(scan2["risk_level"], 0)

    if risk2 > risk1:
        trend = "WORSENING"
        trend_color = "red"
    elif risk2 < risk1:
        trend = "IMPROVING"
        trend_color = "green"
    else:
        trend = "STABLE"
        trend_color = "blue"

    confidence_change = round(scan2["confidence"] - scan1["confidence"], 2)

    return {
        "scan1": scan1,
        "scan2": scan2,
        "comparison": {
            "trend": trend,
            "trend_color": trend_color,
            "confidence_change": confidence_change,
            "risk_change": risk2 - risk1,
            "days_between": _days_between(scan1["created_at"], scan2["created_at"])
        }
    }

def _days_between(date1_str, date2_str):
    try:
        d1 = datetime.fromisoformat(date1_str)
        d2 = datetime.fromisoformat(date2_str)
        return abs((d2 - d1).days)
    except:
        return 0

# ════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ════════════════════════════════════════════════════════════
@app.get("/admin/dashboard")
async def admin_dashboard(admin=Depends(require_admin)):
    stats = get_dashboard_stats()
    return stats

@app.get("/admin/users")
async def get_users(admin=Depends(require_admin)):
    users = get_all_users()
    return {"users": users, "total": len(users)}

@app.get("/admin/scans")
async def get_all_scans_admin(admin=Depends(require_admin)):
    scans = get_all_scans()
    return {"scans": scans, "total": len(scans)}

@app.delete("/admin/users/{user_id}")
async def deactivate_user_route(user_id: int, admin=Depends(require_admin)):
    deactivate_user(user_id)
    log_action("USER_DEACTIVATED", f"Admin deactivated user {user_id}")
    return {"message": "User deactivated successfully"}

@app.get("/admin/logs")
async def get_logs(admin=Depends(require_admin)):
    logs = get_system_logs()
    return {"logs": logs, "total": len(logs)}

@app.get("/admin/stats/usage")
async def get_usage_stats(admin=Depends(require_admin)):
    stats = get_dashboard_stats()
    return stats

# ── Model Metrics (from training) ─────────────────────────
@app.get("/admin/model-metrics")
async def get_model_metrics(current_user=Depends(get_current_user)):
    metrics_path = os.path.join("models", "model_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return json.load(f)
    return {"message": "Metrics not available yet — train the model first"}

@app.get("/admin/model-charts")
async def get_model_charts(current_user=Depends(get_current_user)):
    charts_path = os.path.join("models", "charts_base64.json")
    if os.path.exists(charts_path):
        with open(charts_path) as f:
            return json.load(f)
    return None

# ── Health Check ──────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)