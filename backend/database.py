"""
================================================================
database.py — SQLite Database Operations
================================================================
"""
import sqlite3
from datetime import datetime
import os

DB_PATH = "breast_cancer.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name   TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            role        TEXT DEFAULT 'user',
            is_active   INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Scans table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            filename        TEXT NOT NULL,
            file_path       TEXT,
            gradcam_path    TEXT,
            risk_level      TEXT NOT NULL,
            confidence      REAL NOT NULL,
            normal_prob     REAL DEFAULT 0,
            suspicious_prob REAL DEFAULT 0,
            malignant_prob  REAL DEFAULT 0,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # System logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            action      TEXT NOT NULL,
            details     TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialised successfully.")

# ── User Operations ───────────────────────────────────────────
def create_user(full_name, email, password, role="user"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (full_name, email, password, role)
        VALUES (?, ?, ?, ?)
    """, (full_name, email, password, role))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def get_user(email):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? AND is_active = 1", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_user(user_id, **kwargs):
    conn = get_connection()
    cursor = conn.cursor()
    fields = ", ".join([f"{k} = ?" for k in kwargs])
    values = list(kwargs.values()) + [user_id]
    cursor.execute(f"UPDATE users SET {fields} WHERE id = ?", values)
    conn.commit()
    conn.close()

def deactivate_user(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

# ── Scan Operations ───────────────────────────────────────────
def create_scan(user_id, filename, file_path, gradcam_path,
                risk_level, confidence, normal_prob, suspicious_prob, malignant_prob):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scans (user_id, filename, file_path, gradcam_path,
                           risk_level, confidence, normal_prob, suspicious_prob, malignant_prob)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, filename, file_path, gradcam_path,
          risk_level, confidence, normal_prob, suspicious_prob, malignant_prob))
    scan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_scan_by_id(scan_id)

def get_scan_by_id(scan_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_scans(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_scans():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.*, u.full_name, u.email
        FROM scans s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_scan_db(scan_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
    conn.commit()
    conn.close()

# ── Dashboard Stats ───────────────────────────────────────────
def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()

    # Total counts
    cursor.execute("SELECT COUNT(*) FROM scans")
    total_scans = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE risk_level = 'Normal'")
    normal_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE risk_level = 'Suspicious'")
    suspicious_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM scans WHERE risk_level = 'Malignant'")
    malignant_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
    total_users = cursor.fetchone()[0]

    # Recent scans with user info
    cursor.execute("""
        SELECT s.id, s.risk_level, s.confidence, s.created_at,
               u.full_name, u.email
        FROM scans s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT 10
    """)
    recent_scans = [dict(r) for r in cursor.fetchall()]

    # Scans per day (last 7 days)
    cursor.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM scans
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """)
    daily_scans = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "total_scans":      total_scans,
        "normal_count":     normal_count,
        "suspicious_count": suspicious_count,
        "malignant_count":  malignant_count,
        "total_users":      total_users,
        "recent_scans":     recent_scans,
        "daily_scans":      daily_scans
    }

# ── Risk Trends ───────────────────────────────────────────────
def get_risk_trends(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT risk_level, confidence, created_at
        FROM scans
        WHERE user_id = ?
        ORDER BY created_at ASC
    """, (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── System Logs ───────────────────────────────────────────────
def log_action(action, details=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO system_logs (action, details) VALUES (?, ?)
    """, (action, details))
    conn.commit()
    conn.close()

def get_system_logs(limit=100):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]