// pci-auth.js — PCI role-based auth module
// Mock-first: credentials validated against data/users.json.
// When a real backend is added, only login() changes internally.
// All other functions and every page caller remain identical.
//
// Requires pci-shared.js for the wallet helpers (migrateLegacyWallet,
// deriveCredits, todayISO) — every page that loads pci-auth.js also loads it.
(function () {
  'use strict';

  const SESSION_KEY = 'pci_session';

  const ROLE_HIERARCHY = { owner: 4, admin: 3, instructor: 2, member: 1 };

  // Upgrades a pre-wallet session in place so sessions already sitting in
  // localStorage from before the per-package model keep working.
  function migrateSession(s) {
    if (!s || Array.isArray(s.packages)) return s;
    s.packages = migrateLegacyWallet(s);
    delete s.eligible_categories;
    delete s.active_packages;
    s.credits = deriveCredits(s.packages);
    saveSession(s);
    return s;
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? migrateSession(JSON.parse(raw)) : null;
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
      // no-store: auth must never validate against a stale cached user list
      const res = await fetch('data/users.json', { cache: 'no-store' });
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
    // Members carry a package wallet; staff carry none (credits stays null).
    const wallet = user.role === 'member' ? migrateLegacyWallet(user) : [];
    const session = {
      userId:       user.id,
      email:        user.email,
      displayName:  user.display_name,
      role:         user.role,
      locationId:   user.location_id || null,
      packages:     wallet,
      // Derived read-only mirror of the wallet — never the source of truth.
      credits:      user.role === 'member' ? deriveCredits(wallet) : null,
      instructorId: user.instructor_id || null,
      loginTime:    Date.now()
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

  // Merges fields into the stored session and re-saves.
  function patchSession(fields) {
    const s = getSession();
    if (!s) throw new Error('Not logged in.');
    Object.assign(s, fields);
    saveSession(s);
    return s;
  }

  // ── Wallet mutation ────────────────────────────────────────────────────────
  // Every path that changes what a member holds goes through these, so the
  // derived credits mirror can never drift from the wallet.

  function getWallet() {
    const s = getSession();
    return s && Array.isArray(s.packages) ? s.packages : [];
  }

  function findEntry(s, walletId) {
    return (s.packages || []).find(e => e.wallet_id === walletId) || null;
  }

  // Spends one credit from a specific wallet entry. Unlimited entries cost
  // nothing and are a no-op. Throws if the entry is gone, expired, or empty.
  function spendFromWallet(walletId) {
    const s = getSession();
    if (!s) throw new Error('Not logged in.');
    const entry = findEntry(s, walletId);
    if (!entry) throw new Error('That package is no longer on your account.');
    if (!isWalletEntryActive(entry)) throw new Error('That package has expired.');
    if (entry.type === 'unlimited') return s;
    if ((entry.credits_remaining || 0) <= 0) throw new Error('No credits left on that package.');
    entry.credits_remaining -= 1;
    s.credits = deriveCredits(s.packages);
    saveSession(s);
    return s;
  }

  // Returns one credit to the entry it came from. Returns false without
  // refunding if the entry is gone or has since expired — a credit must never
  // land back in a pool it didn't come from.
  function refundToWallet(walletId) {
    const s = getSession();
    if (!s) return false;
    const entry = findEntry(s, walletId);
    if (!entry || entry.type === 'unlimited') return false;
    if (!isWalletEntryActive(entry)) return false;
    entry.credits_remaining = Math.min(
      (entry.credits_remaining || 0) + 1,
      entry.credits_total != null ? entry.credits_total : Infinity
    );
    s.credits = deriveCredits(s.packages);
    saveSession(s);
    return true;
  }

  // Adds a freshly purchased or granted entry (see buildWalletEntry).
  function addWalletEntry(entry) {
    const s = getSession();
    if (!s) throw new Error('Not logged in.');
    if (!Array.isArray(s.packages)) s.packages = [];
    s.packages.push(entry);
    s.credits = deriveCredits(s.packages);
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
    patchSession,
    getWallet,
    spendFromWallet,
    refundToWallet,
    addWalletEntry
  };
})();
