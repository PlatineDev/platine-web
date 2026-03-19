# ── Platine — main.py ───────────────────────────────────────
# FastAPI application entry point
# Run: uvicorn main:app --host 0.0.0.0 --port 8000
# ────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from db import init_db
from routes.auth import router as auth_router
from routes.live import router as live_router

# ── Startup ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title="Platine API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://platine.dev", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(live_router)

# ── Serve frontend ────────────────────────────────────────
FRONTEND = os.path.join(os.path.dirname(__file__), "../frontend")

app.mount("/css", StaticFiles(directory=f"{FRONTEND}/css"), name="css")
app.mount("/js",  StaticFiles(directory=f"{FRONTEND}/js"),  name="js")

@app.get("/", include_in_schema=False)
async def landing():
    return FileResponse(f"{FRONTEND}/index.html")

@app.get("/login", include_in_schema=False)
async def login():
    return FileResponse(f"{FRONTEND}/login.html")

@app.get("/live/{session_id}", include_in_schema=False)
async def live(session_id: str):
    return FileResponse(f"{FRONTEND}/live.html")
    
@app.get("/privacy", include_in_schema=False)
async def privacy():
    return FileResponse(f"{FRONTEND}/privacy.html")

# ── Health check ──────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
