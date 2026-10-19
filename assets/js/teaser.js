/* Lil Things launch waitlist.
   Emails are stored in Supabase (table public.waitlist) through the
   join_waitlist RPC. The publishable key below is public by design:
   anon can only call that function, never read or write the table. */
(() => {
  const SUPABASE_URL = "https://ixkwmdgjfkoxrrakizcw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_6l60Jz84-8_Gp0r-dphWoQ_7xM_R_MM";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const startedAt = Date.now();

  const form = document.getElementById("join");
  if (!form) return;
  const input = form.querySelector("#email");
  const honeypot = form.querySelector("#website");
  const button = form.querySelector("button");
  const label = form.querySelector(".btn-label");
  const status = form.querySelector("#join-status");
  const note = form.querySelector(".note");

  const setStatus = (text, kind) => {
    status.textContent = text;
    status.dataset.kind = kind || "";
  };

  input.addEventListener("input", () => {
    if (status.dataset.kind === "error") {
      setStatus("", "");
      input.removeAttribute("aria-invalid");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.classList.contains("is-busy")) return;
    const email = input.value.trim().toLowerCase();

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      input.setAttribute("aria-invalid", "true");
      window.ltTrack && window.ltTrack("waitlist_submit", { result: "error", reason: "client_invalid" });
      setStatus("That email doesn’t look quite right. Mind checking it?", "error");
      input.focus();
      return;
    }

    // Bots fill hidden fields and submit instantly. Pretend it worked.
    if (honeypot.value || Date.now() - startedAt < 1200) {
      done();
      return;
    }

    form.classList.add("is-busy");
    button.disabled = true;
    label.textContent = "Saving…";
    setStatus("", "");

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          p_email: email,
          p_source: "lilthings.app",
          p_user_agent: navigator.userAgent.slice(0, 500),
          p_website: honeypot.value,
        }),
      });
      if (res.ok) {
        window.ltTrack && window.ltTrack("waitlist_submit", { result: "success" });
        done();
        return;
      }
      const body = await res.json().catch(() => ({}));
      window.ltTrack && window.ltTrack("waitlist_submit", { result: "error", reason: (body && body.message) || ("http_" + res.status) });
      if (body && body.message === "invalid_email") {
        input.setAttribute("aria-invalid", "true");
        setStatus("That email doesn’t look quite right. Mind checking it?", "error");
      } else {
        setStatus("Something went sideways. Please try again in a moment.", "error");
      }
    } catch (_) {
      window.ltTrack && window.ltTrack("waitlist_submit", { result: "error", reason: "network" });
      setStatus("Couldn’t reach the server. Check your connection and try again.", "error");
    }
    form.classList.remove("is-busy");
    button.disabled = false;
    label.textContent = "Notify me";
  });

  function done() {
    form.classList.remove("is-busy");
    form.classList.add("is-done");
    input.removeAttribute("aria-invalid");
    input.disabled = true;
    button.disabled = true;
    label.textContent = "You’re on the list";
    note.textContent = "";
    setStatus("You’re on the list :-) We’ll let you know the moment Lil Things launches.", "ok");
  }
})();
