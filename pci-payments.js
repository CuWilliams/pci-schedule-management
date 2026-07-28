// pci-payments.js — payment provider adapter
//
// Every checkout goes through PciPayments.checkout(pkg), which resolves to a
// uniform result regardless of provider:
//
//   { status: 'succeeded', provider: 'mock'|'stripe', reference, paid_at }
//
// and rejects with a user-facing Error otherwise. Fulfilment (minting the
// wallet entry via buildWalletEntry + PciAuth.addWalletEntry) is the caller's
// job and is identical for every provider, so switching providers touches
// nothing but this file.
//
// The active provider comes from data/settings.json → "payment_provider",
// so cutover is a published settings change, not a code deploy.
//
// STRIPE CUTOVER — read before wiring the real thing:
// Stripe Checkout cannot be completed from a static site. Creating a Checkout
// Session needs a secret key, and a wallet must only be credited from a
// verified `checkout.session.completed` webhook — never from the browser's
// return_url, which a user can forge. The real cutover therefore needs a small
// serverless endpoint (Cloudflare Worker / Vercel function) exposing
// POST /create-checkout-session and POST /stripe-webhook, plus a backend that
// owns the wallet in place of data/users.json. StripeProvider below is where
// the client half lands; nothing outside this file changes.
(function () {
  'use strict';

  const DEFAULT_PROVIDER = 'mock';
  const MOCK_LATENCY_MS  = 700;

  let _provider = DEFAULT_PROVIDER;

  // Reads the configured provider from data/settings.json. Falls back to the
  // mock provider if settings are unreachable — a missing config must never
  // hand a member a real payment form.
  async function init() {
    try {
      const res = await fetch('data/settings.json', { cache: 'no-store' });
      const settings = await res.json();
      if (settings && typeof settings.payment_provider === 'string') {
        _provider = settings.payment_provider;
      }
    } catch {
      _provider = DEFAULT_PROVIDER;
    }
    return _provider;
  }

  function provider() {
    return _provider;
  }

  function isMock() {
    return _provider === 'mock';
  }

  // ── Providers ──────────────────────────────────────────────────────────────

  // Simulates a successful charge. Takes no payment and stores no card data.
  function mockCheckout(pkg) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          status:   'succeeded',
          provider: 'mock',
          reference: 'mock_' + Date.now() + '_' + pkg.id,
          paid_at:   new Date().toISOString()
        });
      }, MOCK_LATENCY_MS);
    });
  }

  // Placeholder until the serverless endpoints described above exist.
  function stripeCheckout() {
    return Promise.reject(new Error(
      'Card payments are not available yet. Please contact the studio to purchase.'
    ));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function checkout(pkg) {
    if (!pkg) return Promise.reject(new Error('No package selected.'));
    switch (_provider) {
      case 'mock':   return mockCheckout(pkg);
      case 'stripe': return stripeCheckout(pkg);
      default:
        return Promise.reject(new Error('Payments are not configured. Please contact the studio.'));
    }
  }

  window.PciPayments = { init, provider, isMock, checkout };
})();
