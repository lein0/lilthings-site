/* Lil Things site analytics (PostHog, cookieless).
   Disabled until POSTHOG_KEY is set. The project key is a public client key.
   memory persistence: no cookies, no localStorage, no cross-site tracking.
   Never send email addresses or other personal data. */
(() => {
  const POSTHOG_KEY = "";                       // phc_... (public project key)
  const POSTHOG_HOST = "https://us.i.posthog.com";
  const queue = [];
  window.ltTrack = (event, props) => {
    if (!POSTHOG_KEY) return;
    if (window.posthog && window.posthog.__loaded) window.posthog.capture(event, props || {});
    else queue.push([event, props || {}]);
  };
  if (!POSTHOG_KEY) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://us-assets.i.posthog.com/static/array.js";
  s.onload = () => {
    if (!window.posthog || !window.posthog.init) return;
    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      persistence: "memory",
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      ip: false,
      loaded: (ph) => { ph.__loaded = true; queue.splice(0).forEach(([e, p]) => ph.capture(e, p)); },
    });
  };
  document.head.appendChild(s);
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    try {
      const u = new URL(a.href, location.href);
      if (u.hostname !== location.hostname) window.ltTrack("outbound_click", { host: u.hostname, path: u.pathname });
      else if (u.protocol === "mailto:") window.ltTrack("mailto_click", {});
    } catch (_) {}
  }, true);
})();
