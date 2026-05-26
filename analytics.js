/* BEVP analytics scaffold
   Pushes dataLayer events for the click + form events specified in the
   UX dossier (BEVP-UX-001 §08). Pushes go to window.dataLayer so a GTM
   container or Google Analytics 4 setup can consume them once wired.

   No tracking until a real GTM/GA4 ID is configured. This file is the
   event surface only; the tag manager / consent flow gets added later.

   To enable GA4 directly (no GTM), replace the TODO block at the bottom
   with the gtag.js loader and your G-XXXXXXX measurement ID. */

(function () {
  'use strict';

  /* === Mobile nav close behavior ===
     The nav is a checkbox-driven CSS overlay. These handlers make it actually
     dismissable on mobile: Escape closes, tapping a nav link closes (so in-page
     anchors don't leave it stuck open), and the body scroll is locked while open
     (CSS :has() handles modern browsers; the .nav-open class is a fallback). */
  (function navUX(){
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    function close(){ toggle.checked = false; sync(); }
    function sync(){
      document.body.classList.toggle('nav-open', toggle.checked);
      toggle.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
    }

    toggle.addEventListener('change', sync);
    sync();

    // Escape key — close the menu
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && toggle.checked) { close(); }
    });

    // Tap a link inside the menu — close it (handles in-page anchor clicks too)
    nav.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      close();
    });

    // If the viewport widens back to desktop, drop the open state and body lock
    var mq = window.matchMedia('(min-width: 1081px)');
    var onMq = function(){ if (mq.matches && toggle.checked) close(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  })();

  window.dataLayer = window.dataLayer || [];
  function track(eventName, params) {
    var payload = Object.assign({ event: eventName }, params || {});
    window.dataLayer.push(payload);
    // Mirror to console in dev for visibility (remove once wired to GA4)
    if (window.location.hostname === 'localhost' || window.location.hostname.endsWith('.github.io')) {
      console.debug('[analytics]', eventName, params || {});
    }
  }

  // Map link patterns → event names per dossier §08
  var EXTERNAL_DONATE_DOMAIN = 'givingfuel.com';

  function classify(a) {
    var href = a.getAttribute('href') || '';
    var lower = href.toLowerCase();

    if (lower.indexOf('mailto:') === 0) {
      return { event: 'contact_email_click', label: lower.replace('mailto:', '').split('?')[0] };
    }
    if (lower.indexOf('tel:') === 0) {
      var num = lower.replace('tel:', '').replace(/\+|-|\(|\)|\s/g, '');
      if (num === '988' || num.indexOf('988') === 0) {
        return { event: 'crisis_phone_click', label: '988' };
      }
      return { event: 'phone_click', label: num };
    }
    if (lower.indexOf('sms:') === 0) {
      return { event: 'crisis_text_click', label: lower.replace('sms:', '').split('?')[0] };
    }
    if (lower.indexOf(EXTERNAL_DONATE_DOMAIN) !== -1) {
      return { event: 'donate_external_click', label: 'givingfuel' };
    }
    // Internal links — fire nav_link_click only for nav + footer + final CTAs to avoid noise
    if (a.closest('.nav, .foot, .final, .mobile-cta-bar, .hero-cta, .crisis-row, .nav-dropdown')) {
      return { event: 'nav_link_click', label: lower };
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var info = classify(a);
    if (!info) return;
    track(info.event, { link_url: a.href, link_text: (a.textContent || '').trim().slice(0, 80), label: info.label });
  }, true);

  // Form events
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches || !f.matches('form')) return;
    if (f.classList.contains('foot-news__form')) {
      track('newsletter_submit', { source_page: location.pathname });
    } else if (f.id === 'applyForm') {
      track('apply_form_submit', { source_page: location.pathname });
    } else {
      track('form_submit', { form_id: f.id || '', form_class: f.className || '' });
    }
  }, true);

  // Page-load event with page meta for funnel attribution
  window.addEventListener('DOMContentLoaded', function () {
    track('page_view', {
      page_path: location.pathname,
      page_title: document.title,
      page_referrer: document.referrer
    });
  });

  /* === TODO: enable real GA4 / GTM ===
     Option A (GA4 direct):
       (function(){var s=document.createElement('script');s.async=true;
         s.src='https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
         document.head.appendChild(s);})();
       window.gtag=function(){dataLayer.push(arguments)};
       gtag('js',new Date()); gtag('config','G-XXXXXXXXXX');

     Option B (GTM):
       (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
         var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;
         j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);
       })(window,document,'script','dataLayer','GTM-XXXXXXX');
   */
})();
