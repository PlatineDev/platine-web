// ── Platine — api.js ────────────────────────────────────────
// Central API client — all backend calls go through here
// Used by: auth.js, live.js, landing.js
// ────────────────────────────────────────────────────────────

const API_BASE = '/api';

// ── Token helpers ──────────────────────────────────────────
const Auth = {
  getToken:   ()        => localStorage.getItem('platine_token'),
  setToken:   (t)       => localStorage.setItem('platine_token', t),
  getEmail:   ()        => localStorage.getItem('platine_email'),
  setEmail:   (e)       => localStorage.setItem('platine_email', e),
  clear:      ()        => { localStorage.removeItem('platine_token'); localStorage.removeItem('platine_email'); },
  isLoggedIn: ()        => !!localStorage.getItem('platine_token'),
};

// ── Base fetch ─────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Token expired → redirect to login
  if (res.status === 401) {
    Auth.clear();
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw { status: res.status, detail: data.detail || 'Unknown error' };
  }

  return data;
}

// ── Auth ───────────────────────────────────────────────────
const AuthAPI = {
  register: (email, password) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch('/auth/me'),

  logout: () => {
    Auth.clear();
    window.location.href = '/';
  },
};

// ── Live sessions ──────────────────────────────────────────
const LiveAPI = {
  // Get latest scan data for a session (called every 3s by live.html)
  getData: (sessionId) =>
    apiFetch(`/live/${sessionId}/data`),
};

// ── Polling helper for live.html ───────────────────────────
// Calls callback with fresh data every intervalMs
function startPolling(sessionId, callback, intervalMs = 3000) {
  let active = true;
  let errCount = 0;

  async function poll() {
    if (!active) return;
    try {
      const res = await LiveAPI.getData(sessionId);
      errCount = 0;
      callback({ ok: true, data: res.data, lastUpdate: res.last_update });
    } catch (err) {
      errCount++;
      callback({ ok: false, error: err, errCount });
      // Stop polling if session expired
      if (err.status === 410) {
        active = false;
        return;
      }
    }
    setTimeout(poll, intervalMs);
  }

  poll();
  return { stop: () => { active = false; } };
}

// ── Export ─────────────────────────────────────────────────
window.Platine = { Auth, AuthAPI, LiveAPI, startPolling };
