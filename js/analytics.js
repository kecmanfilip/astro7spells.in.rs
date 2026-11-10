/* ===== Astro7Spells - Analytics (GA4, consent-aware) =====
 *
 * Jedino mesto gde se podešava Google Analytics.
 * 1. Napravi GA4 property na analytics.google.com
 * 2. Zalepi Measurement ID (počinje sa "G-") ispod u GA_MEASUREMENT_ID
 *
 * Dok je ID prazan, skripta ne radi ništa (ne učitava Google, ne šalje podatke).
 * GA se učitava TEK kad posetilac klikne "Prihvatam" u cookie banneru.
 */
(function () {
  'use strict';

  var GTM_ID = 'GTM-K8GV7X43';  // Google Tag Manager kontejner (GA4 tag se podešava u GTM-u)
  var GA_MEASUREMENT_ID = '';   // alternativa bez GTM-a: direktan GA4 tag, npr. 'G-ABC123XYZ9'

  var loaded = false;
  var queue = [];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // Consent Mode v2: podrazumevano sve odbijeno
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  function useGtm() { return /^GTM-[A-Z0-9]+$/.test(GTM_ID); }

  function enabled() {
    return useGtm() || /^G-[A-Z0-9]{6,}$/.test(GA_MEASUREMENT_ID);
  }

  function load() {
    if (loaded || !enabled()) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (useGtm()) {
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
      document.head.appendChild(g);
      return;
    }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
    while (queue.length) {
      var e = queue.shift();
      gtag('event', e[0], e[1]);
    }
  }

  // Poziva cookie-consent.js kad posetilac prihvati analitiku
  window.a7ConsentGranted = load;

  // Slanje događaja. Pre pristanka se ništa ne šalje.
  window.a7track = function (name, params) {
    if (!enabled()) return;
    if (!loaded) return;
    if (useGtm()) {
      var d = { event: name };
      for (var k in (params || {})) d[k] = params[k];
      window.dataLayer.push(d);
      return;
    }
    gtag('event', name, params || {});
  };

  function page() {
    return location.pathname.replace(/^\/|\.html$/g, '') || 'home';
  }

  // ---- Automatsko praćenje klikova ----
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) {
      window.a7track('click_phone', { page: page() });
    } else if (href.indexOf('viber:') === 0 || href.indexOf('wa.me') !== -1) {
      window.a7track('click_messenger', { page: page(), link: href });
    } else if (href.indexOf('kontakt.html') !== -1) {
      var pkg = '';
      var m = href.match(/paket=([^&]+)/);
      if (m) { try { pkg = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { pkg = m[1]; } }
      window.a7track('cta_book_click', { page: page(), package: pkg });
    } else if (href.indexOf('cenovnik.html') !== -1) {
      window.a7track('cta_pricing_click', { page: page() });
    } else if (href.indexOf('kalkulator.html') !== -1) {
      window.a7track('cta_calculator_click', { page: page() });
    }
  });

  // ---- Kalkulator: pokušaj i uspešan rezultat ----
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('calc-form');
    var results = document.getElementById('results');
    if (form) {
      form.addEventListener('submit', function () {
        window.a7track('calculator_submit');
      });
    }
    if (results && 'MutationObserver' in window) {
      var fired = false;
      new MutationObserver(function () {
        if (!fired && results.style.display === 'block') {
          fired = true;
          window.a7track('calculator_result');
        }
      }).observe(results, { attributes: true, attributeFilter: ['style'] });
    }
  });
})();
