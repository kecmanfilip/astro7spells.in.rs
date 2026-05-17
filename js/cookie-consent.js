/* ===== Astro7Spells - Cookie Consent ===== */
(function() {
  'use strict';

  const COOKIE_KEY = 'astro7spells_cookie_consent';

  // Check if consent already given
  if (localStorage.getItem(COOKIE_KEY)) {
    return;
  }

  // Create banner
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-inner">
      <div class="cookie-text">
        <strong>Koristimo kolačiće</strong>
        <p>Koristimo neophodne i anonimne analityčke kolačiće za bolje funkcionisanje sajta. Više informacija u našoj <a href="privacy-policy.html">Politici privatnosti</a>.</p>
      </div>
      <div class="cookie-btns">
        <button id="cookie-accept" class="btn btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Prihvatam</button>
        <button id="cookie-decline" class="btn btn-secondary" style="padding: 10px 20px; font-size: 0.9rem;">Samo neophodni</button>
      </div>
    </div>
  `;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
      z-index: 10000;
      padding: 20px 24px;
      font-family: var(--font);
    }
    .cookie-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .cookie-text {
      flex: 1;
      min-width: 280px;
    }
    .cookie-text strong {
      display: block;
      font-size: 0.95rem;
      color: var(--text);
      margin-bottom: 4px;
    }
    .cookie-text p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }
    .cookie-text a {
      color: var(--accent);
      text-decoration: underline;
    }
    .cookie-btns {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }
    @media (max-width: 640px) {
      .cookie-inner { flex-direction: column; text-align: center; }
      .cookie-btns { width: 100%; justify-content: center; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);

  // Handlers
  document.getElementById('cookie-accept').addEventListener('click', function() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: true, timestamp: Date.now() }));
    banner.remove();
    style.remove();
  });

  document.getElementById('cookie-decline').addEventListener('click', function() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ essential: true, analytics: false, timestamp: Date.now() }));
    banner.remove();
    style.remove();
  });
})();
