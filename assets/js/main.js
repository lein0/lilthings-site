/* ============================================================
   APP STORE URL
   This is the only place the store link is defined.
   Swap it when the App Store listing is live.
   Every [data-store-link] on the site reads this constant.
   ============================================================ */
const APP_STORE_URL = "https://apps.apple.com/app/idPLACEHOLDER";

document.querySelectorAll("[data-store-link]").forEach((link) => {
  link.href = APP_STORE_URL;
});

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#site-nav");

function setMenu(open) {
  if (!toggle || !nav) return;
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  nav.classList.toggle("is-open", open);
  const label = toggle.querySelector(".nav-toggle-label");
  if (label) label.textContent = open ? "Close" : "Menu";
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });
}

const reactButtons = document.querySelectorAll(".reacts button");
const reactStatus = document.querySelector("#react-status");

reactButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const wasPressed = button.getAttribute("aria-pressed") === "true";
    reactButtons.forEach((other) => other.setAttribute("aria-pressed", "false"));
    if (wasPressed) {
      if (reactStatus) reactStatus.textContent = "Tap a reaction. It stays on the widget.";
      return;
    }
    button.setAttribute("aria-pressed", "true");
    if (reactStatus) reactStatus.textContent = button.dataset.sent || "Sent.";
  });
});
