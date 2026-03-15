# ── Platine — routes/live.py ────────────────────────────────
# POST /api/live/start     ← USB sends full scan JSON
# POST /api/live/update    ← USB sends thermal updates every 5s
# GET  /api/live/{id}/data ← browser polls for latest data
# ────────────────────────────────────────────────────────────

import json
import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from db import get_db
from auth import get_optional_user

router = APIRouter(prefix="/api/live", tags=["live"])

SESSION_TTL_HOURS = 24

def gen_id(length=8) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# ── Start session ─────────────────────────────────────────
# Called by platine-scan.sh after scan completes
@router.post("/start")
async def start_session(
    request: Request,
    db = Depends(get_db),
    user = Depends(get_optional_user)
):
    try:
        scan_json = await request.body()
        # Validate JSON
        json.loads(scan_json)
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    session_id = gen_id()
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS)
    user_id    = user["id"] if user else None

    await db.execute(
        """INSERT INTO sessions (id, user_id, scan_json, expires_at)
           VALUES (?, ?, ?, ?)""",
        (session_id, user_id, scan_json.decode(), expires_at.isoformat())
    )
    await db.commit()

    return {
        "session_id": session_id,
        "live_url":   f"https://platine.dev/live/{session_id}",
        "expires_at": expires_at.isoformat()
    }

# ── Update session (thermal/perf refresh every 5s) ───────
# Called by platine-scan.sh loop
@router.post("/update")
async def update_session(request: Request, db=Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")

    # Get existing session
    row = await db.execute(
        "SELECT scan_json, expires_at FROM sessions WHERE id = ?",
        (session_id,)
    )
    row = await row.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")

    # Check expiry
    if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        raise HTTPException(410, "Session expired")

    # Patch scan_json with live values
    try:
        scan = json.loads(row["scan_json"])
        if "thermals" in body:
            if "thermals" not in scan:
                scan["thermals"] = {}
            scan["thermals"]["live"] = body["thermals"]
        if "cpu_load" in body:
            scan["cpu_load_live"] = body["cpu_load"]
        if "ram_free_gb" in body:
            scan["ram_free_live"] = body["ram_free_gb"]
        scan["updated_at"] = body.get("updated_at", datetime.utcnow().isoformat())
    except Exception:
        raise HTTPException(400, "Failed to patch scan data")

    await db.execute(
        "UPDATE sessions SET scan_json = ?, last_update = datetime('now') WHERE id = ?",
        (json.dumps(scan), session_id)
    )
    await db.commit()

    return {"ok": True}

# ── Get session data (browser polls this) ────────────────
@router.get("/{session_id}/data")
async def get_session_data(session_id: str, db=Depends(get_db)):
    row = await db.execute(
        "SELECT scan_json, expires_at, last_update FROM sessions WHERE id = ?",
        (session_id,)
    )
    row = await row.fetchone()

    if not row:
        raise HTTPException(404, "Session not found")

    if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        raise HTTPException(410, "Session expired")

    return JSONResponse({
        "data":        json.loads(row["scan_json"]),
        "last_update": row["last_update"],
        "expires_at":  row["expires_at"]
    })
