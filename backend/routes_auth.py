# ── Platine — routes/auth.py ────────────────────────────────
# POST /api/auth/register
# POST /api/auth/login
# GET  /api/auth/me
# ────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_db
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Schemas ───────────────────────────────────────────────
class AuthBody(BaseModel):
    email: EmailStr
    password: str

# ── Register ──────────────────────────────────────────────
@router.post("/register")
async def register(body: AuthBody, db=Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    # Check existing
    existing = await db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    )
    if await existing.fetchone():
        raise HTTPException(400, "Email already registered")

    # Create user
    cursor = await db.execute(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        (body.email, hash_password(body.password))
    )
    await db.commit()

    token = create_token(cursor.lastrowid, body.email)
    return {"access_token": token, "token_type": "bearer"}

# ── Login ─────────────────────────────────────────────────
@router.post("/login")
async def login(body: AuthBody, db=Depends(get_db)):
    user = await db.execute(
        "SELECT * FROM users WHERE email = ?", (body.email,)
    )
    user = await user.fetchone()

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}

# ── Me ────────────────────────────────────────────────────
@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {
        "id":           user["id"],
        "email":        user["email"],
        "created_at":   user["created_at"],
        "is_supporter": bool(user["is_supporter"])
    }
