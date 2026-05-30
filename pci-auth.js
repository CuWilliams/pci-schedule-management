// pci-auth.js — PCI role-based auth module
// Mock-first: credentials validated against data/users.json.
// When a real backend is added, only login() changes internally.
// All other functions and every page caller remain identical.
(function () {
  'use strict';

  const SESSION_KEY = 'pci_session';

  const ROLE_HIERARCHY = { owner: 4, admin: 3, instructor: 2, member: 1 };

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function hasRole(role) {
    const s = getSession();
    return s ? s.role === role : false;
  }

  function hasMinRole(minRole) {
    const s = getSession();
    if (!s) return false;
    return (ROLE_HIERARCHY[s.role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
  }

  // requireRole(['admin','owner']) — redirects if session is absent or role not allowed.
  // If session exists but role is insufficient, goes to index.html?error=unauthorized.
  // If no session at all, goes to login.html?redirect=<currentPage>.
  // Returns session object if check passes.
  function requireRole(allowedRoles) {
    const s = getSession();
    if (!s) {
      location.href = 'login.html?redirect=' + encodeURIComponent(location.href);
      throw new Error('redirect');
    }
    if (!allowedRoles.includes(s.role)) {
      location.href = 'index.html?error=unauthorized';
      throw new Error('unauthorized');
    }
    return s;
  }

  // Async. Fetches data/users.json, matches email + password_mock.
  // Builds and stores session on success. Throws Error with user-facing message on failure.
  async function login(email, password) {
    let data;
    try {
      const res = await fetch('data/users.json');
      data = await res.json();
    } catch {
      throw new Error('Could not load user data. Try again.');
    }
    const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || user.password_mock !== password) {
      throw new Error('Invalid email or password.');
    }
    if (!user.active) {
      throw new Error('This account is inactive. Contact your administrator.');
    }
    const session = {
      userId:        user.id,
      email:         user.email,
      displayName:   user.display_name,
      role:          user.role,
      locationId:    user.location_id || null,
      credits:       user.credits !== undefined ? user.credits : null,
      instructorId:  user.instructor_id || null,
      loginTime:     Date.now()
    };
    saveSession(session);
    return session;
  }

  // Clears pci_session and redirects to login.html.
  // Does NOT clear pci_admin_pat — the GitHub PAT is independent.
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    location.href = 'login.html';
  }

  // Mutates the credits field in the stored session by delta.
  // Throws if result would go below 0. Returns new balance.
  function updateCredits(delta) {
    const s = getSession();
    if (!s) throw new Error('Not logged in.');
    const next = (s.credits || 0) + delta;
    if (next < 0) throw new Error('Not enough credits.');
    s.credits = next;
    saveSession(s);
    return next;
  }

  // Merges fields into the stored session and re-saves.
  function patchSession(fields) {
    const s = getSession();
    if (!s) throw new Error('Not logged in.');
    Object.assign(s, fields);
    saveSession(s);
    return s;
  }

  window.PciAuth = {
    SESSION_KEY,
    ROLE_HIERARCHY,
    getSession,
    isLoggedIn,
    hasRole,
    hasMinRole,
    requireRole,
    login,
    logout,
    updateCredits,
    patchSession
  };
})();
