// Canonical class category colors — mirrors --cls-* tokens in pci-tokens.css
const COLOR_HEX = {
  purple: '#7B68C8',
  green:  '#6AAF3D',
  yellow: '#E8C840',
  orange: '#E8803A',
  blue:   '#5BA3D9',
  gray:   '#9E9E9E',
  red:    '#D95050'
};

// Instructor accent colors — mirrors --inst-* tokens in pci-tokens.css
const INSTRUCTOR_HEX = {
  emerald: '#10B981',
  pink:    '#EC4899',
  indigo:  '#6366F1',
  amber:   '#F59E0B',
  teal:    '#14B8A6',
  violet:  '#8B5CF6',
  cyan:    '#06B6D4'
};

// Role constants — mirrors PciAuth.ROLE_HIERARCHY keys
const ROLES = {
  OWNER:      'owner',
  ADMIN:      'admin',
  INSTRUCTOR: 'instructor',
  MEMBER:     'member'
};

// localStorage keys shared across pages
const SESSION_KEY  = 'pci_session';
const BOOKINGS_KEY = 'pci_bookings';
const INVOICES_KEY = 'pci_invoices';

// Shared by instructor.html (team invoice preview) and admin.html (Invoices tab)
function formatCentsCAD(cents) {
  return 'CA$' + (cents / 100).toFixed(2);
}

// ── Package wallet ───────────────────────────────────────────────────────────
// A member's entitlements are a *wallet*: one entry per package they hold, each
// with its own remaining credits, its own expiry, and its own eligible
// categories snapshotted at grant time. Credits are never pooled across
// entries — an Athletic pack can never pay for a Functional HIIT class.
//
// Wallet entry shape (see CLAUDE.md):
//   { wallet_id, package_id, name, type: 'credits'|'unlimited',
//     credits_total, credits_remaining, start_date, end_date,
//     eligible_categories, payment_ref, granted_at }
// Unlimited entries carry null for credits_total/credits_remaining.

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(startISO, days) {
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Whole days from today until endISO. Negative once expired.
function daysUntilISO(endISO) {
  const MS_PER_DAY = 86400000;
  const end   = new Date(endISO + 'T00:00:00').getTime();
  const start = new Date(todayISO() + 'T00:00:00').getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

// Builds the class-type → category lookup used to resolve what a class costs.
function buildTypeToCategory(categories) {
  const map = {};
  (categories || []).forEach(cat => {
    (cat.type_ids || []).forEach(tid => { map[tid] = cat; });
  });
  return map;
}

function getClassCategoryId(cls, typeToCategory) {
  const cat = typeToCategory[cls.type];
  return cat ? cat.id : null;
}

function isWalletEntryActive(entry, today) {
  const t = today || todayISO();
  return t >= entry.start_date && t <= entry.end_date;
}

function walletEntryCovers(entry, catId) {
  return catId !== null &&
    Array.isArray(entry.eligible_categories) &&
    entry.eligible_categories.includes(catId);
}

function walletEntryIsSpendable(entry, today) {
  if (!isWalletEntryActive(entry, today)) return false;
  if (entry.type === 'unlimited') return true;
  return (entry.credits_remaining || 0) > 0;
}

// THE single source of truth for what pays for a booking. Returns the wallet
// entry that will cover this class, or null if nothing the member holds does.
// Priority: an active unlimited pass first (costs no credits), otherwise the
// covering credit pack that expires soonest (use-it-or-lose-it), tie-broken by
// fewest credits remaining so partial packs are drained before fresh ones.
function selectWalletEntry(wallet, catId, today) {
  if (!Array.isArray(wallet) || catId === null) return null;
  const t = today || todayISO();
  const usable = wallet.filter(e =>
    walletEntryCovers(e, catId) && walletEntryIsSpendable(e, t)
  );
  if (!usable.length) return null;

  const unlimited = usable.filter(e => e.type === 'unlimited');
  if (unlimited.length) {
    unlimited.sort((a, b) => a.end_date.localeCompare(b.end_date));
    return unlimited[0];
  }

  const credits = usable.filter(e => e.type !== 'unlimited');
  credits.sort((a, b) =>
    a.end_date.localeCompare(b.end_date) ||
    (a.credits_remaining || 0) - (b.credits_remaining || 0)
  );
  return credits[0];
}

// Derived read-only mirror of the wallet — the flat number shown in the topbar
// badge, admin member list, and buy-credits hero. Never the source of truth.
function deriveCredits(wallet, today) {
  if (!Array.isArray(wallet)) return 0;
  const t = today || todayISO();
  return wallet.reduce((sum, e) =>
    e.type !== 'unlimited' && isWalletEntryActive(e, t)
      ? sum + (e.credits_remaining || 0)
      : sum
  , 0);
}

// Categories the member can currently book at all, across every active entry.
function walletCategories(wallet, today) {
  const t = today || todayISO();
  const out = [];
  (wallet || []).forEach(e => {
    if (!walletEntryIsSpendable(e, t)) return;
    (e.eligible_categories || []).forEach(c => { if (!out.includes(c)) out.push(c); });
  });
  return out;
}

// Mints a wallet entry from a packages.json product. Used by BOTH the member
// purchase flow (buy-credits.html) and admin Grant Package, so fulfilment
// lives in exactly one place. name/eligible_categories are snapshotted so
// later edits to packages.json never retroactively change what was bought.
function buildWalletEntry(pkg, opts) {
  const o = opts || {};
  const start = o.startDate || todayISO();
  return {
    wallet_id:           'wal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    package_id:          pkg.id,
    name:                pkg.name,
    type:                pkg.type,
    credits_total:       pkg.type === 'unlimited' ? null : pkg.credits,
    credits_remaining:   pkg.type === 'unlimited' ? null : pkg.credits,
    start_date:          start,
    end_date:            addDaysISO(start, pkg.duration_days),
    eligible_categories: [...(pkg.eligible_categories || [])],
    payment_ref:         o.paymentRef || null,
    granted_at:          todayISO()
  };
}

// Converts a pre-wallet user/session record (flat `credits` + unioned
// `eligible_categories` + `active_packages`) into wallet entries. Kept so
// existing users.json rows and sessions already in localStorage keep working.
function migrateLegacyWallet(record) {
  if (Array.isArray(record.packages)) return record.packages;
  const wallet = [];

  (record.active_packages || []).forEach((p, i) => {
    wallet.push({
      wallet_id:           'wal_legacy_' + i + '_' + (record.id || record.userId || 'u'),
      package_id:          p.package_id,
      name:                p.name || 'Unlimited Pass',
      type:                'unlimited',
      credits_total:       null,
      credits_remaining:   null,
      start_date:          p.start_date,
      end_date:            p.end_date,
      eligible_categories: [...(p.eligible_categories || [])],
      payment_ref:         null,
      granted_at:          p.start_date
    });
  });

  // Legacy credits carried no package identity or expiry. Preserve the balance
  // under the legacy category union, dated a year out so nobody loses credits
  // mid-migration. An empty legacy union meant "unrestricted" — that loophole
  // is gone, so such credits are parked with no categories and read as not
  // covered until an admin grants a real package.
  if (record.credits > 0) {
    const start = todayISO();
    wallet.push({
      wallet_id:           'wal_legacy_credits_' + (record.id || record.userId || 'u'),
      package_id:          null,
      name:                'Legacy Credits',
      type:                'credits',
      credits_total:       record.credits,
      credits_remaining:   record.credits,
      start_date:          start,
      end_date:            addDaysISO(start, 365),
      eligible_categories: [...(record.eligible_categories || [])],
      payment_ref:         null,
      granted_at:          start
    });
  }

  return wallet;
}
