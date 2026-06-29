# ── Platine — routes/community.py ────────────────────────────
# Community Q&A for hardware repair technicians
# ─────────────────────────────────────────────────────────────

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from db import get_db
from auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/community", tags=["community"])


# ── Pydantic models ───────────────────────────────────────────

class PostCreate(BaseModel):
    title: str
    body: str
    tag_ids: List[int] = []
    scan_id: Optional[str] = None

class AnswerCreate(BaseModel):
    body: str

class VoteBody(BaseModel):
    value: int  # 1 or -1


# ── Internal helpers ──────────────────────────────────────────

async def _score(db, target_id: int, target_type: str) -> int:
    row = await db.execute(
        "SELECT COALESCE(SUM(value), 0) AS s FROM votes WHERE target_id=? AND target_type=?",
        (target_id, target_type),
    )
    row = await row.fetchone()
    return row["s"] if row else 0

async def _user_vote(db, user_id: Optional[int], target_id: int, target_type: str) -> Optional[int]:
    if not user_id:
        return None
    row = await db.execute(
        "SELECT value FROM votes WHERE user_id=? AND target_id=? AND target_type=?",
        (user_id, target_id, target_type),
    )
    row = await row.fetchone()
    return row["value"] if row else None

async def _post_tags(db, post_id: int) -> list:
    cur = await db.execute(
        """SELECT t.id, t.name, t.color FROM tags t
           JOIN post_tags pt ON pt.tag_id = t.id
           WHERE pt.post_id = ?""",
        (post_id,),
    )
    rows = await cur.fetchall()
    return [{"id": r["id"], "name": r["name"], "color": r["color"]} for r in rows]

async def _toggle_vote(db, user_id: int, target_id: int, target_type: str, value: int):
    existing = await db.execute(
        "SELECT value FROM votes WHERE user_id=? AND target_id=? AND target_type=?",
        (user_id, target_id, target_type),
    )
    existing = await existing.fetchone()
    if existing:
        if existing["value"] == value:
            await db.execute(
                "DELETE FROM votes WHERE user_id=? AND target_id=? AND target_type=?",
                (user_id, target_id, target_type),
            )
        else:
            await db.execute(
                "UPDATE votes SET value=? WHERE user_id=? AND target_id=? AND target_type=?",
                (value, user_id, target_id, target_type),
            )
    else:
        await db.execute(
            "INSERT INTO votes (user_id, target_id, target_type, value) VALUES (?,?,?,?)",
            (user_id, target_id, target_type, value),
        )
    await db.commit()


# ── Tags ──────────────────────────────────────────────────────

@router.get("/tags")
async def list_tags(db=Depends(get_db)):
    cur = await db.execute("SELECT id, name, color FROM tags ORDER BY name")
    rows = await cur.fetchall()
    return [{"id": r["id"], "name": r["name"], "color": r["color"]} for r in rows]


# ── Posts feed ────────────────────────────────────────────────

@router.get("/posts")
async def list_posts(
    tag: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    sort: str = Query("new"),
    db=Depends(get_db),
    user=Depends(get_optional_user),
):
    if sort not in ("new", "top", "unsolved"):
        sort = "new"

    limit = 20
    offset = (page - 1) * limit
    where, params = ["1=1"], []

    if tag:
        where.append(
            "p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id=pt.tag_id WHERE t.name=?)"
        )
        params.append(tag)
    if q:
        where.append("(p.title LIKE ? OR p.body LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if sort == "unsolved":
        where.append("p.is_solved=0")

    order = {
        "new": "p.created_at DESC",
        "top": "score DESC, p.created_at DESC",
        "unsolved": "p.created_at DESC",
    }[sort]

    cur = await db.execute(
        f"""SELECT p.id, p.title, p.body, p.scan_id, p.is_solved, p.views, p.created_at,
                   u.id AS author_id, u.email AS author_email,
                   COALESCE(SUM(v.value),0) AS score,
                   COUNT(DISTINCT a.id) AS answer_count
            FROM posts p
            JOIN users u ON u.id=p.user_id
            LEFT JOIN votes v ON v.target_id=p.id AND v.target_type='post'
            LEFT JOIN answers a ON a.post_id=p.id
            WHERE {' AND '.join(where)}
            GROUP BY p.id
            ORDER BY {order}
            LIMIT ? OFFSET ?""",
        params + [limit, offset],
    )
    rows = await cur.fetchall()

    posts = []
    for r in rows:
        tags = await _post_tags(db, r["id"])
        body = r["body"]
        posts.append({
            "id": r["id"],
            "title": r["title"],
            "excerpt": body[:120] + ("..." if len(body) > 120 else ""),
            "scan_id": r["scan_id"],
            "is_solved": bool(r["is_solved"]),
            "views": r["views"],
            "created_at": r["created_at"],
            "author_id": r["author_id"],
            "author_email": r["author_email"],
            "score": r["score"],
            "answer_count": r["answer_count"],
            "tags": tags,
        })
    return {"posts": posts, "page": page}


# ── Create post ───────────────────────────────────────────────

@router.post("/posts", status_code=201)
async def create_post(body: PostCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if not body.title.strip() or not body.body.strip():
        raise HTTPException(400, "Title and body are required")
    if len(body.title) > 200:
        raise HTTPException(400, "Title too long (max 200 chars)")
    if len(body.body) < 20:
        raise HTTPException(400, "Body too short (min 20 chars)")

    if body.scan_id:
        row = await db.execute("SELECT id FROM sessions WHERE id=?", (body.scan_id,))
        if not await row.fetchone():
            raise HTTPException(404, "Scan session not found")

    cur = await db.execute(
        "INSERT INTO posts (user_id, title, body, scan_id) VALUES (?,?,?,?)",
        (user["id"], body.title.strip(), body.body.strip(), body.scan_id),
    )
    post_id = cur.lastrowid

    for tag_id in body.tag_ids[:5]:
        row = await db.execute("SELECT id FROM tags WHERE id=?", (tag_id,))
        if await row.fetchone():
            await db.execute(
                "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)",
                (post_id, tag_id),
            )

    await db.commit()
    return {"id": post_id}


# ── Get post detail ───────────────────────────────────────────

@router.get("/posts/{post_id}")
async def get_post(post_id: int, db=Depends(get_db), user=Depends(get_optional_user)):
    await db.execute("UPDATE posts SET views=views+1 WHERE id=?", (post_id,))
    await db.commit()

    cur = await db.execute(
        """SELECT p.*, u.email AS author_email, u.is_supporter AS author_supporter
           FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=?""",
        (post_id,),
    )
    post = await cur.fetchone()
    if not post:
        raise HTTPException(404, "Post not found")

    user_id = user["id"] if user else None
    tags = await _post_tags(db, post_id)
    post_score = await _score(db, post_id, "post")
    post_vote = await _user_vote(db, user_id, post_id, "post")

    # Minimal scan preview
    scan_preview = None
    if post["scan_id"]:
        row = await db.execute("SELECT scan_json FROM sessions WHERE id=?", (post["scan_id"],))
        row = await row.fetchone()
        if row:
            try:
                scan = json.loads(row["scan_json"])
                problems = scan.get("problems", [])
                scan_preview = {
                    "model": scan.get("model", "Unknown"),
                    "health": scan.get("health_score"),
                    "issues": scan.get("issues_count") or len(problems),
                }
            except Exception:
                pass

    # Answers: accepted first, then by date
    cur = await db.execute(
        """SELECT a.*, u.email AS author_email, u.is_supporter AS author_supporter
           FROM answers a JOIN users u ON u.id=a.user_id
           WHERE a.post_id=?
           ORDER BY a.is_accepted DESC, a.created_at ASC""",
        (post_id,),
    )
    answer_rows = await cur.fetchall()
    answers = []
    for a in answer_rows:
        answers.append({
            "id": a["id"],
            "body": a["body"],
            "is_accepted": bool(a["is_accepted"]),
            "created_at": a["created_at"],
            "author_id": a["user_id"],
            "author_email": a["author_email"],
            "author_supporter": bool(a["author_supporter"]),
            "score": await _score(db, a["id"], "answer"),
            "user_vote": await _user_vote(db, user_id, a["id"], "answer"),
        })

    return {
        "id": post["id"],
        "title": post["title"],
        "body": post["body"],
        "scan_id": post["scan_id"],
        "scan_preview": scan_preview,
        "is_solved": bool(post["is_solved"]),
        "views": post["views"],
        "created_at": post["created_at"],
        "author_id": post["user_id"],
        "author_email": post["author_email"],
        "author_supporter": bool(post["author_supporter"]),
        "score": post_score,
        "user_vote": post_vote,
        "tags": tags,
        "answers": answers,
        "is_author": user_id == post["user_id"],
    }


# ── Create answer ─────────────────────────────────────────────

@router.post("/posts/{post_id}/answers", status_code=201)
async def create_answer(post_id: int, body: AnswerCreate, db=Depends(get_db), user=Depends(get_current_user)):
    if not body.body.strip() or len(body.body.strip()) < 10:
        raise HTTPException(400, "Answer is too short")

    row = await db.execute("SELECT id FROM posts WHERE id=?", (post_id,))
    if not await row.fetchone():
        raise HTTPException(404, "Post not found")

    cur = await db.execute(
        "INSERT INTO answers (post_id, user_id, body) VALUES (?,?,?)",
        (post_id, user["id"], body.body.strip()),
    )
    await db.commit()
    return {"id": cur.lastrowid}


# ── Vote post ─────────────────────────────────────────────────

@router.post("/posts/{post_id}/vote")
async def vote_post(post_id: int, body: VoteBody, db=Depends(get_db), user=Depends(get_current_user)):
    if body.value not in (1, -1):
        raise HTTPException(400, "value must be 1 or -1")
    row = await db.execute("SELECT id FROM posts WHERE id=?", (post_id,))
    if not await row.fetchone():
        raise HTTPException(404, "Post not found")
    await _toggle_vote(db, user["id"], post_id, "post", body.value)
    return {"score": await _score(db, post_id, "post")}


# ── Vote answer ───────────────────────────────────────────────

@router.post("/answers/{answer_id}/vote")
async def vote_answer(answer_id: int, body: VoteBody, db=Depends(get_db), user=Depends(get_current_user)):
    if body.value not in (1, -1):
        raise HTTPException(400, "value must be 1 or -1")
    row = await db.execute("SELECT id FROM answers WHERE id=?", (answer_id,))
    if not await row.fetchone():
        raise HTTPException(404, "Answer not found")
    await _toggle_vote(db, user["id"], answer_id, "answer", body.value)
    return {"score": await _score(db, answer_id, "answer")}


# ── Accept answer ─────────────────────────────────────────────

@router.post("/answers/{answer_id}/accept")
async def accept_answer(answer_id: int, db=Depends(get_db), user=Depends(get_current_user)):
    row = await db.execute(
        "SELECT a.id, a.post_id, p.user_id AS post_author FROM answers a JOIN posts p ON p.id=a.post_id WHERE a.id=?",
        (answer_id,),
    )
    row = await row.fetchone()
    if not row:
        raise HTTPException(404, "Answer not found")
    if row["post_author"] != user["id"]:
        raise HTTPException(403, "Only the post author can accept an answer")

    await db.execute("UPDATE answers SET is_accepted=0 WHERE post_id=?", (row["post_id"],))
    await db.execute("UPDATE answers SET is_accepted=1 WHERE id=?", (answer_id,))
    await db.execute("UPDATE posts SET is_solved=1 WHERE id=?", (row["post_id"],))
    await db.commit()
    return {"ok": True}


# ── User profile ──────────────────────────────────────────────

@router.get("/users/{user_id}")
async def get_user_profile(user_id: int, db=Depends(get_db)):
    row = await db.execute(
        "SELECT id, email, created_at, is_supporter FROM users WHERE id=?", (user_id,)
    )
    u = await row.fetchone()
    if not u:
        raise HTTPException(404, "User not found")

    rep_row = await db.execute(
        """SELECT COALESCE(SUM(v.value), 0) AS rep FROM votes v
           WHERE (v.target_type='post'   AND v.target_id IN (SELECT id FROM posts   WHERE user_id=?))
              OR (v.target_type='answer' AND v.target_id IN (SELECT id FROM answers WHERE user_id=?))""",
        (user_id, user_id),
    )
    rep = await rep_row.fetchone()

    cur = await db.execute(
        """SELECT p.id, p.title, p.is_solved, p.created_at,
                  COALESCE(SUM(v.value),0) AS score, COUNT(DISTINCT a.id) AS answer_count
           FROM posts p
           LEFT JOIN votes v ON v.target_id=p.id AND v.target_type='post'
           LEFT JOIN answers a ON a.post_id=p.id
           WHERE p.user_id=?
           GROUP BY p.id ORDER BY p.created_at DESC LIMIT 20""",
        (user_id,),
    )
    posts = [
        {"id": r["id"], "title": r["title"], "is_solved": bool(r["is_solved"]),
         "created_at": r["created_at"], "score": r["score"], "answer_count": r["answer_count"]}
        for r in await cur.fetchall()
    ]

    cur = await db.execute(
        """SELECT a.id, a.body, a.is_accepted, a.created_at,
                  p.id AS post_id, p.title AS post_title,
                  COALESCE(SUM(v.value),0) AS score
           FROM answers a
           JOIN posts p ON p.id=a.post_id
           LEFT JOIN votes v ON v.target_id=a.id AND v.target_type='answer'
           WHERE a.user_id=?
           GROUP BY a.id ORDER BY a.created_at DESC LIMIT 20""",
        (user_id,),
    )
    answers = []
    for r in await cur.fetchall():
        body = r["body"]
        answers.append({
            "id": r["id"],
            "body": body[:120] + ("..." if len(body) > 120 else ""),
            "is_accepted": bool(r["is_accepted"]),
            "created_at": r["created_at"],
            "post_id": r["post_id"],
            "post_title": r["post_title"],
            "score": r["score"],
        })

    return {
        "id": u["id"],
        "email": u["email"],
        "created_at": u["created_at"],
        "is_supporter": bool(u["is_supporter"]),
        "reputation": rep["rep"] if rep else 0,
        "posts": posts,
        "answers": answers,
    }
