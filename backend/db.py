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

            CREATE TABLE IF NOT EXISTS posts (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL REFERENCES users(id),
                title      TEXT    NOT NULL,
                body       TEXT    NOT NULL,
                scan_id    TEXT    REFERENCES sessions(id),
                is_solved  INTEGER DEFAULT 0,
                views      INTEGER DEFAULT 0,
                created_at TEXT    DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS answers (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id     INTEGER NOT NULL REFERENCES posts(id),
                user_id     INTEGER NOT NULL REFERENCES users(id),
                body        TEXT    NOT NULL,
                is_accepted INTEGER DEFAULT 0,
                created_at  TEXT    DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS votes (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                target_id   INTEGER NOT NULL,
                target_type TEXT    NOT NULL CHECK(target_type IN ('post','answer')),
                value       INTEGER NOT NULL CHECK(value IN (1,-1)),
                UNIQUE(user_id, target_id, target_type)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT UNIQUE NOT NULL,
                color TEXT DEFAULT '#16a34a'
            );

            CREATE TABLE IF NOT EXISTS post_tags (
                post_id INTEGER NOT NULL REFERENCES posts(id),
                tag_id  INTEGER NOT NULL REFERENCES tags(id),
                PRIMARY KEY(post_id, tag_id)
            );
        """)

        # Seed default hardware tags
        default_tags = [
            ('cpu',     '#ef4444'), ('ram',     '#3b82f6'), ('storage', '#f59e0b'),
            ('battery', '#22c55e'), ('thermal', '#f97316'), ('gpu',     '#8b5cf6'),
            ('bios',    '#6b7280'), ('dell',    '#0073e6'), ('hp',      '#0096d6'),
            ('lenovo',  '#e2231a'), ('asus',    '#00adef'), ('acer',    '#83b81a'),
            ('apple',   '#555555'),
        ]
        for name, color in default_tags:
            await db.execute(
                "INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)",
                (name, color)
            )

        await db.commit()
