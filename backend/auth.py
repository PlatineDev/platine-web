# ── Platine — auth.py ───────────────────────────────────────
# JWT token creation and verification
# Password hashing with bcrypt
# ────────────────────────────────────────────────────────────

import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production-please")
ALGORITHM  = "HS256"
TOKEN_DAYS = 30

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)

# ── Password ──────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_ctx.hash(password[:72])

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain[:72], hashed)

# ── JWT ───────────────────────────────────────────────────
def create_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return {}

# ── Current user dependency ───────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.execute(
        "SELECT * FROM users WHERE id = ?", (int(payload["sub"]),)
    )
    user = await user.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return dict(user)

# ── Optional user (for live sessions — works without login) ─
async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db = Depends(get_db)
):
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    user = await db.execute(
        "SELECT * FROM users WHERE id = ?", (int(payload["sub"]),)
    )
    user = await user.fetchone()
    return dict(user) if user else None