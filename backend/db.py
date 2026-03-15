# ── Platine — db.py ─────────────────────────────────────────
# SQLite database connection via aiosqlite
# Ready to migrate to PostgreSQL when scaling
# ────────────────────────────────────────────────────────────

import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "platine.db")

async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                email       TEXT    UNIQUE NOT NULL,
                password    TEXT    NOT NULL,
                created_at  TEXT    DEFAULT (datetime('now')),
                is_supporter INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT    PRIMARY KEY,
                user_id     INTEGER REFERENCES users(id),
                scan_json   TEXT    NOT NULL,
                created_at  TEXT    DEFAULT (datetime('now')),
                expires_at  TEXT    NOT NULL,
                last_update TEXT    DEFAULT (datetime('now'))
            );
        """)
        await db.commit()
