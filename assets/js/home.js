/* Intro and scroll arrivals for the launch page.
   Reduced motion shows the settled frame immediately. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const nodes = document.querySelectorAll(".reveal");
  if (!nodes.length) return;
  const show = (el) => el.classList.add("is-in");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    nodes.forEach(show);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);
      document.dispatchEvent(new CustomEvent("lt-arrive"));
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  nodes.forEach((node) => observer.observe(node));
  reduce.addEventListener?.("change", () => {
    if (reduce.matches) nodes.forEach(show);
  });
})();
