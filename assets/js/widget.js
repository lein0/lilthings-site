/* Lil Things teaser: a Home Screen widget where little notes draw themselves.
   Plain SVG + requestAnimationFrame. Pauses offscreen and in background tabs.
   With prefers-reduced-motion, shows one finished frame and never animates. */
(() => {
  const widget = document.getElementById("widget");
  const svg = document.getElementById("w-canvas");
  if (!widget || !svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const spaceEl = $("w-space"), avatarsEl = $("w-avatars"), senderEl = $("w-sender"),
        reactsEl = $("w-reacts"), chipEl = $("who-chip");

  const people = {
    Chelsey: { bg: "#f7c8da", ink: "#a8325f" },
    Eric:    { bg: "#cfe0f5", ink: "#2e2e3a" },
    Maya:    { bg: "#cdeedd", ink: "#285f8f" },
    Jordan:  { bg: "#e4d2f5", ink: "#2b6e4c" },
    Sam:     { bg: "#ffd8b5", ink: "#5f3fa6" },
    Priya:   { bg: "#f6c4b4", ink: "#a8481f" },
    Alex:    { bg: "#c6eaf0", ink: "#2e2e3a" },
  };
  const scenes = {
    couple: { name: "Chelsey & Eric", members: ["Chelsey", "Eric"], chip: "for your person" },
    porch:  { name: "The porch", members: ["Maya", "Jordan", "Sam", "Priya", "Alex"], chip: "for your people" },
  };
  const messages = [
    { s: "couple", by: "Chelsey", text: ["hi babe"], rx: [["❤️", "Eric"]] },
    { s: "couple", by: "Eric", doodle: "heart", text: ["miss you"], rx: [["🥹", "Chelsey"]] },
    { s: "couple", by: "Chelsey", text: ["sushi tonight?"], rx: [["🍣", "Eric"]] },
    { s: "couple", by: "Eric", text: ["running", "10 min late"], rx: [["👍", "Chelsey"]] },
    { s: "couple", by: "Chelsey", doodle: "sun", text: ["proud of you"], rx: [["🥰", "Eric"]] },
    { s: "couple", by: "Eric", text: ["grab milk?"], rx: [["✅", "Chelsey"]] },
    { s: "couple", by: "Chelsey", text: ["home soon"], doodle: "smile", rx: [["🏡", "Eric"]] },
    { s: "porch", by: "Maya", text: ["movie night?"], rx: [["🍿", "Jordan"], ["🙋", "Sam"], ["🎬", "Priya"], ["👍", "Alex"]] },
    { s: "porch", by: "Jordan", doodle: "coffee", text: ["coffee run?"], rx: [["☕", "Maya"], ["🙌", "Priya"]] },
    { s: "porch", by: "Sam", text: ["good luck", "today!"], rx: [["🍀", "Maya"], ["💪", "Jordan"], ["❤️", "Alex"]] },
    { s: "porch", by: "Priya", doodle: "cat", text: ["meet Mochi"], rx: [["😻", "Sam"], ["🥹", "Maya"], ["😂", "Jordan"]] },
    { s: "porch", by: "Alex", text: ["pizza at 8?"], rx: [["🍕", "Maya"], ["🍕", "Sam"], ["🔥", "Jordan"], ["👍", "Priya"]] },
  ];

  // Doodles drawn around (100, 64) in a ~90px box.
  const sunRays = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
    sunRays.push(`M${(100 + c * 25).toFixed(1)} ${(64 + s * 25).toFixed(1)} L${(100 + c * 36).toFixed(1)} ${(64 + s * 36).toFixed(1)}`);
  }
  const doodles = {
    heart: ["M100 100 C72 82 56 66 64 50 C72 34 92 36 100 52 C108 36 128 34 136 50 C144 66 128 82 100 100"],
    sun: ["M100 48 C109 48 116 55 116 64 C116 73 109 80 100 80 C91 80 84 73 84 64 C84 55 91 48 100 48", ...sunRays],
    smile: ["M84 52 v9", "M116 52 v9", "M74 74 C86 98 114 98 126 74"],
    coffee: ["M74 56 L79 96 Q80 102 87 102 L113 102 Q120 102 121 96 L126 56 Z", "M125 66 Q142 64 140 79 Q138 92 122 89",
             "M88 46 q-7 -9 0 -18", "M100 46 q-7 -9 0 -18", "M112 46 q-7 -9 0 -18"],
    cat: ["M68 98 C63 76 66 54 74 40 L86 56 C95 52 105 52 114 56 L126 40 C134 54 137 76 132 98 C122 108 78 108 68 98",
          "M88 72 v5", "M112 72 v5", "M95 85 q5 5 10 0", "M58 80 L80 83", "M58 90 L80 88", "M142 80 L120 83", "M142 90 L120 88"],
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const avatar = (name, cls) => {
    const i = document.createElement("i");
    i.className = cls || "av";
    i.textContent = name[0];
    i.style.background = people[name].bg;
    i.title = name;
    return i;
  };

  let current = null, sceneKey = null, uid = 0;

  function setScene(key) {
    if (key === sceneKey) return;
    sceneKey = key;
    const sc = scenes[key];
    spaceEl.textContent = sc.name;
    avatarsEl.replaceChildren(...sc.members.map((m) => avatar(m)));
    const labelEl = chipEl && chipEl.querySelector(".who-label");
    if (labelEl && labelEl.textContent !== sc.chip) {
      labelEl.textContent = sc.chip;
      chipEl.classList.remove("is-swap");
      void chipEl.offsetWidth;
      chipEl.classList.add("is-swap");
    }
    widget.dataset.scene = key;
  }

  function build(m) {
    setScene(m.s);
    svg.replaceChildren();
    const ink = people[m.by].ink;
    const parts = [];
    let t = 250; // ms after message start that drawing begins

    if (m.doodle) {
      const hasText = m.text && m.text.length;
      const g = el("g", { transform: hasText ? "translate(100 46) scale(.62) translate(-100 -64)" : "translate(100 70) scale(.95) translate(-100 -64)" }, svg);
      const paths = doodles[m.doodle].map((d) => el("path", { d, class: "stroke", stroke: ink }, g));
      const lens = paths.map((p) => p.getTotalLength());
      const total = lens.reduce((a, b) => a + b, 0);
      const dur = 1100;
      paths.forEach((p, k) => {
        const d = (lens[k] / total) * dur;
        p.style.strokeDasharray = lens[k];
        p.style.strokeDashoffset = lens[k];
        parts.push({ kind: "path", node: p, len: lens[k], t0: t, t1: t + d });
        t += d + 120;
      });
      t += 80;
    }

    if (m.text && m.text.length && window.ltHand) {
      const lines = m.text;
      const size = m.doodle ? 22 : lines.length > 1 ? 26 : 32;
      const lh = size * 1.25;
      const top = m.doodle ? 96 : 58 - ((lines.length - 1) * lh) / 2;
      const nib = el("circle", { r: 2.15, cx: 0, cy: 0, fill: ink, class: "nib", opacity: "0" }, svg);
      lines.forEach((line, k) => {
        const laid = window.ltHand.inkLine(svg, line, {
          cx: 100,
          cy: top + k * lh,
          size,
          maxWidth: 178,
          fill: ink,
        });
        const lineStart = t;
        laid.parts.forEach((part) => {
          const t0 = lineStart + part.lead;
          parts.push({ kind: "glyph", mask: part.mask, len: part.len, t0, t1: t0 + part.dur, point: part.point, nib });
          t = Math.max(t, t0 + part.dur);
        });
        t += 100;
      });
    }

    const drawEnd = t;
    senderEl.querySelector("span").textContent = m.by;
    senderEl.querySelector(".dot").style.background = ink;
    avatarsEl.querySelectorAll(".av").forEach((a) => a.classList.toggle("is-sender", a.title === m.by));

    reactsEl.replaceChildren();
    const rx = m.rx.map(([emoji, who], k) => {
      const pill = document.createElement("span");
      pill.className = "rx";
      const b = document.createElement("b");
      b.textContent = emoji;
      pill.append(b, avatar(who, "av sm"));
      reactsEl.appendChild(pill);
      return { node: pill, at: drawEnd + 250 + k * 300 };
    });
    const reactsEnd = rx.length ? rx[rx.length - 1].at : drawEnd;
    const hold = reactsEnd + 1000;
    return { m, parts, rx, fadeAt: hold, end: hold + 450 };
  }

  function render(c, t) {
    let nib = null;
    let nibAt = null;
    for (const p of c.parts) {
      const k = p.kind === "path"
        ? ease(clamp((t - p.t0) / (p.t1 - p.t0)))
        : clamp((t - p.t0) / (p.t1 - p.t0));
      if (p.kind === "path") {
        p.node.style.strokeDashoffset = p.len * (1 - k);
      } else if (p.kind === "glyph") {
        p.mask.style.strokeDashoffset = String(p.len * (1 - k));
        nib = p.nib;
        if (k > 0 && k < 1) nibAt = p.point(k);
      }
    }
    if (nib) {
      nib.style.opacity = nibAt ? "1" : "0";
      if (nibAt) {
        nib.setAttribute("cx", nibAt.x.toFixed(2));
        nib.setAttribute("cy", nibAt.y.toFixed(2));
      }
    }
    for (const r of c.rx) r.node.classList.toggle("on", t >= r.at && t < c.fadeAt + 150);
    const fade = clamp((t - c.fadeAt) / (c.end - c.fadeAt));
    const fin = clamp(t / 220);
    svg.style.opacity = String(Math.min(fin, 1 - fade));
    senderEl.style.opacity = String(Math.min(fin, 1 - fade));
  }

  // Reduced motion: one calm, finished frame of the group Space.
  function still() {
    const c = build(messages[7]);
    render(c, c.fadeAt - 1);
    widget.classList.add("is-still");
  }

  let idx = 0, clock = 0, last = 0, visible = true, raf = 0, sceneFade = 0;

  function next() {
    const prevScene = current ? current.m.s : null;
    current = build(messages[idx]);
    clock = 0;
    if (prevScene && prevScene !== current.m.s) {
      widget.classList.remove("swap");
      void widget.offsetWidth;
      widget.classList.add("swap");
    }
    idx = (idx + 1) % messages.length;
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(now - last, 64) : 16;
    last = now;
    clock += dt;
    if (!current || clock >= current.end) next();
    render(current, clock);
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(frame); };

  function start() {
    if (reduce.matches) { still(); return; }
    widget.classList.remove("is-still");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !window.__ltAnimSeen) { window.__ltAnimSeen = true; window.ltTrack && window.ltTrack("animation_in_view", {}); } kick(); }, { threshold: 0.05 }).observe(widget);
    }
    document.addEventListener("visibilitychange", kick);
    kick();
  }

  reduce.addEventListener?.("change", () => { if (reduce.matches) { cancelAnimationFrame(raf); raf = 0; still(); } else { current = null; start(); } });
  (document.fonts && document.fonts.load ? document.fonts.load('600 32px "Caveat"').catch(() => {}) : Promise.resolve()).then(start);
})();
