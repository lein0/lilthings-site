/* Lil Things site analytics (PostHog, cookieless).
   The project key is a public client key.
   memory persistence: no cookies, no localStorage, no cross-site tracking.
   Never send email addresses or other personal data.
   Every event is tagged with the super property environment: "web". */
(() => {
  const POSTHOG_KEY = "phc_zGB7KzxEjoBt9GzAn4AVVtHnhTnYFeM2UhzXBAHHjP2F";
  const POSTHOG_HOST = "https://us.i.posthog.com";
  const EMAIL_RE = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g;
  const redact = (value) => (typeof value === "string" ? value.replace(EMAIL_RE, "[redacted]") : value);
  const scrub = (props) => {
    const out = {};
    if (!props) return out;
    for (const key of Object.keys(props)) out[key] = redact(props[key]);
    return out;
  };
  const queue = [];
  window.ltTrack = (event, props) => {
    if (!POSTHOG_KEY) return;
    const safe = scrub(props);
    if (window.posthog && window.posthog.__loaded) window.posthog.capture(event, safe);
    else queue.push([event, safe]);
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
      before_send: (event) => {
        if (!event) return event;
        for (const bag of [event.properties, event.$set, event.$set_once]) {
          if (!bag) continue;
          for (const key of Object.keys(bag)) bag[key] = redact(bag[key]);
        }
        if (event.properties) event.properties.environment = "web";
        return event;
      },
      loaded: (ph) => {
        ph.register({ environment: "web" });
        ph.__loaded = true;
        queue.splice(0).forEach(([e, p]) => ph.capture(e, p));
      },
    });
  };
  document.head.appendChild(s);
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    try {
      const u = new URL(a.href, location.href);
      if (u.protocol === "mailto:") window.ltTrack("mailto_click", {});
      else if (u.hostname !== location.hostname) window.ltTrack("outbound_click", { host: u.hostname, path: u.pathname });
    } catch (_) {}
  }, true);
})();
