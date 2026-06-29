// ── Platine Community — community.js ─────────────────────────
// Shared helpers for all community pages

const CommunityAPI = {
  posts:        (params = {}) => apiFetch('/community/posts?' + new URLSearchParams(params)),
  post:         (id)          => apiFetch(`/community/posts/${id}`),
  createPost:   (data)        => apiFetch('/community/posts', { method: 'POST', body: JSON.stringify(data) }),
  createAnswer: (postId, body) => apiFetch(`/community/posts/${postId}/answers`, { method: 'POST', body: JSON.stringify({ body }) }),
  votePost:     (id, value)   => apiFetch(`/community/posts/${id}/vote`,    { method: 'POST', body: JSON.stringify({ value }) }),
  voteAnswer:   (id, value)   => apiFetch(`/community/answers/${id}/vote`,  { method: 'POST', body: JSON.stringify({ value }) }),
  acceptAnswer: (id)          => apiFetch(`/community/answers/${id}/accept`, { method: 'POST' }),
  tags:         ()            => apiFetch('/community/tags'),
  user:         (id)          => apiFetch(`/community/users/${id}`),
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTagChip(tag, link = true) {
  const c = tag.color || '#16a34a';
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
  const href = link ? `/community?tag=${encodeURIComponent(tag.name)}` : '#';
  return `<a href="${href}" class="tag-chip" style="color:${c};background:rgba(${r},${g},${b},.08);border-color:rgba(${r},${g},${b},.3)" onclick="event.stopPropagation()">${escHtml(tag.name)}</a>`;
}

// ── Render shared nav ────────────────────────────────────────
function renderNav() {
  const el = document.getElementById('comm-nav');
  if (!el) return;
  const isLoggedIn = window.Platine?.Auth?.isLoggedIn();
  const email = window.Platine?.Auth?.getEmail() || '';
  const path = window.location.pathname;

  el.innerHTML = `
    <a href="/" class="comm-nav-logo">
      <svg viewBox="0 0 14 14" fill="none" width="20" height="20">
        <rect x=".5" y=".5" width="13" height="13" rx="1.5" stroke="currentColor" stroke-width="1"/>
        <rect x="3" y="3" width="4" height="4" fill="currentColor"/>
        <rect x="9" y="3" width="2" height="2" fill="currentColor" opacity=".6"/>
        <rect x="3" y="9" width="8" height="1.5" fill="currentColor" opacity=".35"/>
        <rect x="9" y="7" width="2" height="2" fill="currentColor" opacity=".25"/>
      </svg>
      Platine
    </a>
    <div class="comm-nav-links">
      <a href="/community" class="${path.startsWith('/community') ? 'active' : ''}">Community</a>
      <a href="/#how">How it works</a>
      <a href="/#pricing">Pricing</a>
    </div>
    <div class="comm-nav-right">
      ${isLoggedIn
        ? `<span class="nav-user">${escHtml(email)}</span>
           <button class="nav-pill" onclick="Platine.AuthAPI.logout()">Sign out</button>`
        : `<a href="/login?next=${encodeURIComponent(path)}" class="nav-pill">Sign in</a>`
      }
    </div>
  `;
}

window.CommunityAPI = CommunityAPI;
window.timeAgo     = timeAgo;
window.escHtml     = escHtml;
window.renderTagChip = renderTagChip;
window.renderNav   = renderNav;
