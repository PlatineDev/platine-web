// ── Platine — auth.js ──────────────────────────────────────
// Handles login, register, view toggle, password strength
// Connects to: POST /api/auth/login  /api/auth/register
// ───────────────────────────────────────────────────────────

const API = '/api/auth';

// ── View toggle ────────────────────────────────────────────
function switchView(view) {
  document.getElementById('view-login').style.display    = view === 'login'    ? 'block' : 'none';
  document.getElementById('view-register').style.display = view === 'register' ? 'block' : 'none';
  document.getElementById('view-success').style.display  = 'none';
  clearErrors();
}

// ── Password visibility toggle ─────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? 'Hide' : 'Show';
}

// ── Password strength ──────────────────────────────────────
function checkStrength(val) {
  const fill  = document.getElementById('pw-fill');
  const label = document.getElementById('pw-label');
  if (!fill || !label) return;

  let score = 0;
  if (val.length >= 8)  score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { pct: '20%', color: '#ef4444', text: 'Weak' },
    { pct: '40%', color: '#f59e0b', text: 'Fair' },
    { pct: '60%', color: '#f59e0b', text: 'Good' },
    { pct: '80%', color: '#16a34a', text: 'Strong' },
    { pct: '100%', color: '#16a34a', text: 'Very strong' },
  ];

  const lvl = levels[Math.min(score, 4)];
  fill.style.width      = val.length === 0 ? '0%' : lvl.pct;
  fill.style.background = lvl.color;
  label.textContent     = val.length === 0 ? '' : lvl.text;
  label.style.color     = lvl.color;
}

// ── Error handling ─────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  document.querySelectorAll('.field-input').forEach(el => {
    el.classList.remove('error');
  });
}

// ── Loading state ──────────────────────────────────────────
function setLoading(btnId, loading) {
  const btn    = document.getElementById(btnId);
  const label  = btn?.querySelector('.btn-label');
  const loader = btn?.querySelector('.btn-loader');
  if (!btn) return;
  btn.disabled = loading;
  if (label)  label.style.display = loading ? 'none'  : 'inline';
  if (loader) loader.style.display = loading ? 'inline' : 'none';
}

// ── Success screen ─────────────────────────────────────────
function showSuccess(title, sub, redirectUrl, delay = 1800) {
  switchView('success');
  document.getElementById('success-title').textContent = title;
  document.getElementById('success-sub').textContent   = sub;
  setTimeout(() => { window.location.href = redirectUrl; }, delay);
}

// ── LOGIN ──────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showError('login-error', 'Please fill in all fields.');
    return;
  }

  setLoading('login-btn', true);

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('login-error', data.detail || 'Invalid email or password.');
      setLoading('login-btn', false);
      return;
    }

    // Save token
    localStorage.setItem('platine_token', data.access_token);
    localStorage.setItem('platine_email', email);

    // Redirect — go back to where user came from or dashboard
    const redirect = new URLSearchParams(window.location.search).get('next') || '/';
    showSuccess('Signed in!', 'Redirecting...', redirect);

  } catch (err) {
    showError('login-error', 'Connection error. Please try again.');
    setLoading('login-btn', false);
  }
}

// ── REGISTER ───────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  clearErrors();

  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const gdpr     = document.getElementById('gdpr').checked;

  // Validate
  if (!email || !password || !confirm) {
    showError('reg-error', 'Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showError('reg-error', 'Password must be at least 8 characters.');
    document.getElementById('reg-password').classList.add('error');
    return;
  }
  if (password !== confirm) {
    showError('reg-error', 'Passwords do not match.');
    document.getElementById('reg-confirm').classList.add('error');
    return;
  }
  if (!gdpr) {
    showError('reg-error', 'Please accept the Privacy Policy to continue.');
    return;
  }

  setLoading('reg-btn', true);

  try {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError('reg-error', data.detail || 'Registration failed. Try again.');
      setLoading('reg-btn', false);
      return;
    }

    // Save token
    localStorage.setItem('platine_token', data.access_token);
    localStorage.setItem('platine_email', email);

    const redirect = new URLSearchParams(window.location.search).get('next') || '/';
    showSuccess(
      'Account created!',
      'Welcome to Platine. Redirecting...',
      redirect
    );

  } catch (err) {
    showError('reg-error', 'Connection error. Please try again.');
    setLoading('reg-btn', false);
  }
}

// ── Check if already logged in ─────────────────────────────
(function() {
  const token = localStorage.getItem('platine_token');
  const next  = new URLSearchParams(window.location.search).get('next');
  const isLoginPage = window.location.pathname === '/login';
  if (token && !next && isLoginPage) {
    window.location.href = '/';
  }
})();