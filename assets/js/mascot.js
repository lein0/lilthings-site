/* Little Smiley, ported from the iOS onboarding mascot, plus the
   pair, crew, and note faces. The hero welcomes, follows the pointer
   and the email caret, reacts to scrolling, then idles and drifts
   sleepy. Casts loop on their own clocks. Offscreen faces pause.
   prefers-reduced-motion: one friendly still pose, eyes still snap. */
(() => {
  const INK = "#2E2E3A";
  const FACE = "#FFE59F";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const AWAKE = 3.9;
  const SLEEPY = 6.4;
  const PHASE = 2.55;
  const CLOSE = 0.07;
  const OPEN = 0.11;
  const BLINK = CLOSE + OPEN;
  const DOUBLE = 0.24;
  const labels = {
    idle: "Little Smiley",
    live: "Little Smiley",
    wave: "Little Smiley waving hello",
    welcome: "Little Smiley saying hello",
    write: "Little Smiley writing",
    cheer: "Little Smiley cheering",
    wait: "Little Smiley waiting",
    celebrate: "Little Smiley celebrating",
    surprise: "Little Smiley surprised",
    sleepy: "Little Smiley feeling sleepy",
  };
  const TINTS = {
    pair: ["#FFE59F", "#F9C5D3"],
    crew: ["#FFE59F", "#EAD6F6", "#D6E6C9", "#FFD7C2", "#F9C5D3"],
  };

  const svgMarkup = (fill) => `
    <svg class="mascot" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g class="rig">
        <rect x="4" y="4" width="92" height="92" rx="24" fill="${fill || FACE}"/>
        <g class="mascot-eye" data-x="34" data-y="36">
          <ellipse class="pupil" cx="0" cy="0" rx="3.5" ry="4.75" fill="${INK}"/>
          <path class="lid" d="M-4.5 0 H4.5" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
          <path class="squint" d="M-9 1.2 Q0 -4 9 1" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/>
        </g>
        <g class="mascot-eye" data-x="66" data-y="35">
          <ellipse class="pupil" cx="0" cy="0" rx="3.5" ry="4.75" fill="${INK}"/>
          <path class="lid" d="M-4.5 0 H4.5" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
          <path class="squint" d="M-9 1.2 Q0 -4 9 1" fill="none" stroke="${INK}" stroke-width="3.8" stroke-linecap="round"/>
        </g>
        <path class="smile" d="M28 52 C36 66 66 65 74 51" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
      </g>
    </svg>`;

  function mount(slot) {
    if (slot.querySelector(".mascot")) return slot.querySelector(".mascot");
    slot.insertAdjacentHTML("beforeend", svgMarkup());
    slot.classList.add("is-live", "mascot-slot");
    const decorative = slot.hasAttribute("data-decorative") || slot.classList.contains("logo-mark");
    if (decorative) slot.setAttribute("aria-hidden", "true");
    else {
      slot.setAttribute("role", "img");
      slot.setAttribute("aria-label", slot.dataset.label || labels.idle);
    }
    return slot.querySelector(".mascot");
  }

  document.querySelectorAll("[data-mascot]").forEach(mount);
  document.querySelectorAll("img.logo-mark").forEach((img) => {
    const slot = document.createElement("span");
    slot.className = "mascot-slot logo-mark";
    slot.setAttribute("data-mascot", "");
    slot.setAttribute("data-decorative", "");
    const w = img.getAttribute("width") || "40";
    const h = img.getAttribute("height") || "40";
    slot.style.width = `${w}px`;
    slot.style.height = `${h}px`;
    img.replaceWith(slot);
    mount(slot);
  });

  function phaseOf(i, salt) {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return (x - Math.floor(x)) * 5.2;
  }

  function cloneFace(tint) {
    const tpl = document.getElementById("lt-face");
    if (!tpl) return null;
    const face = tpl.content.firstElementChild.cloneNode(true);
    const rect = face.querySelector("rect");
    if (rect) rect.setAttribute("fill", tint);
    return face;
  }

  function packCast(kind, root, nodes, salt) {
    const base = phaseOf(salt, kind === "note" ? 4 : 1);
    return {
      kind,
      root,
      heart: root.querySelector(".heart-bit"),
      visible: true,
      faces: nodes.filter(Boolean).map((el, i) => ({
        el,
        rig: el.querySelector(".rig"),
        eyes: [...el.querySelectorAll(".mascot-eye")],
        smile: el.querySelector(".smile"),
        blush: [...el.querySelectorAll(".blush")],
        lookX: 0,
        lookY: 0,
        phase: kind === "pair" ? base : base + i * 0.85,
        index: i,
      })),
    };
  }

  const casts = [];
  document.querySelectorAll("[data-cast]").forEach((slot) => {
    const kind = slot.dataset.cast === "pair" ? "pair" : "crew";
    const tints = TINTS[kind];
    const heart = slot.querySelector(".heart-bit");
    const nodes = tints.map((tint) => {
      const face = cloneFace(tint);
      if (!face) return null;
      if (heart) slot.insertBefore(face, heart);
      else slot.appendChild(face);
      return face;
    });
    casts.push(packCast(kind, slot, nodes, kind === "pair" ? 1 : 8));
  });
  document.querySelectorAll("[data-face='note']").forEach((slot, i) => {
    const face = cloneFace(slot.dataset.tint || FACE);
    if (!face) return;
    slot.appendChild(face);
    casts.push(packCast("note", slot, [face], 20 + i));
  });

  const faces = [...document.querySelectorAll("[data-mascot] .mascot")].map((svg, index) => ({
    svg,
    rig: svg.querySelector(".rig"),
    eyes: [...svg.querySelectorAll(".mascot-eye")],
    smile: svg.querySelector(".smile"),
    slot: svg.closest("[data-mascot], .mascot-slot"),
    lookX: 0,
    lookY: 0,
    lean: 0,
    role: svg.closest(".hero-mascot") ? "hero" : "brand",
    phase: index === 0 ? 0.4 : 1.8 + index * 0.7,
    visible: true,
    rect: null,
    rectAt: 0,
  }));
  if (!faces.length && !casts.length) return;

  const email = document.querySelector("#email");
  const join = document.querySelector("#join");
  const wrap = document.querySelector(".mascot-wrap");
  let pointer = null;
  let pointerAt = 0;
  let pressing = false;
  let celebrateUntil = 0;
  let surpriseUntil = 0;
  let cheerUntil = 0;
  let lastType = 0;
  let scrollBias = 0;
  const started = performance.now();
  let lastActivity = started;

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const markActivity = () => { lastActivity = performance.now(); };
  const positive = (time, modulo) => {
    const raw = time % modulo;
    return raw < 0 ? raw + modulo : raw;
  };
  const pulse = (dt) => {
    if (dt < 0 || dt > BLINK) return 1;
    if (dt < CLOSE) return 1 - dt / CLOSE;
    return (dt - CLOSE) / OPEN;
  };
  const blinkFactor = (time, sleepy, phase) => {
    const gap = sleepy ? SLEEPY : AWAKE;
    const t = positive(time + (phase || 0), gap * 4);
    let factor = 1;
    for (let i = 0; i < 4; i += 1) {
      const start = gap * i + PHASE;
      factor = Math.min(factor, pulse(t - start));
      if (i === 3) factor = Math.min(factor, pulse(t - (start + DOUBLE)));
    }
    return factor;
  };
  const beats = [
    [0, 0, 0],
    [0.62, 0.55, -0.15],
    [1.28, -0.35, 0.2],
    [2.05, 0.15, 0.05],
    [2.85, -0.6, -0.1],
    [3.45, 0, 0],
  ];
  const saccade = (time) => {
    const t = positive(time, 4.1);
    let x = 0;
    let y = 0;
    for (const beat of beats) {
      if (beat[0] <= t) {
        x = beat[1];
        y = beat[2];
      }
    }
    return { x, y };
  };

  const measure = document.createElement("canvas").getContext("2d");
  function caretPoint(input) {
    const rect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const pos = input.selectionStart ?? input.value.length;
    const width = measure.measureText(input.value.slice(0, pos)).width;
    const pad = parseFloat(style.paddingLeft) || 0;
    const raw = rect.left + pad + width - input.scrollLeft;
    return {
      x: clamp(raw, rect.left + 10, rect.right - 10),
      y: rect.top + rect.height * 0.62,
    };
  }

  function heroState(now) {
    const typing = email && document.activeElement === email && now - lastType < 1500;
    const busy = join && join.classList.contains("is-busy");
    if (now < celebrateUntil) return "celebrate";
    if (typing) return "write";
    if (pressing || now < cheerUntil) return "cheer";
    if (busy) return "wait";
    if (now < surpriseUntil) return "surprise";
    if (now - started < 2200) return "welcome";
    const idleFor = now - lastActivity;
    if (idleFor > 14000) return "sleepy";
    if (idleFor > 4500) return "idle";
    return "live";
  }

  function attentionFor(face, point, tracking, time, state) {
    if (!point) {
      if (state === "welcome") return { lookX: 0.1, lookY: -0.22, lean: -4, tracking: false };
      if (state === "sleepy") {
        return {
          lookX: Math.sin(time * 0.35) * 0.28,
          lookY: 0.5,
          lean: Math.sin(time * 0.4) * 5,
          tracking: false,
        };
      }
      if (state === "wave") return { lookX: 0, lookY: -0.15, lean: -6, tracking: false };
      const wander = reduce.matches || state === "live" ? { x: 0, y: 0 } : saccade(time + face.phase);
      return { lookX: wander.x, lookY: wander.y, lean: 0, tracking: false };
    }
    const rect = face.rect && performance.now() - face.rectAt < 280
      ? face.rect
      : (face.rect = face.svg.getBoundingClientRect(), face.rectAt = performance.now(), face.rect);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = clamp((point.x - cx) / Math.max(rect.width * 0.85, 24), -1, 1);
    const ny = clamp((point.y - cy) / Math.max(rect.height * 0.85, 24), -1, 1);
    const wander = reduce.matches ? { x: 0, y: 0 } : saccade(time + face.phase);
    const intent = Math.min(1, Math.hypot(nx, ny));
    const wanderWeight = tracking ? 0.12 : (1 - intent) * 0.55;
    return {
      lookX: nx + wander.x * wanderWeight,
      lookY: ny + wander.y * wanderWeight,
      lean: nx * 8,
      tracking,
    };
  }

  function tilt(time, state, animated, lean) {
    if (!animated) {
      const still = { wave: -6, welcome: -4, cheer: -6, celebrate: -6, surprise: -2, write: 3, sleepy: 5 };
      return (still[state] || 0) + lean;
    }
    const s = Math.sin;
    let base = 0;
    if (state === "idle") base = -3 + s(time * 0.55) * 2.4;
    else if (state === "live") base = -2 + s(time * 0.7) * 1.6;
    else if (state === "welcome") base = -5 + s(time * 2.1) * 2;
    else if (state === "wave") base = -6 + s(time * 1.7) * 2;
    else if (state === "write") base = 4;
    else if (state === "cheer") base = -7 + s(time * 5.5) * 1.6;
    else if (state === "wait") base = s(time * 0.45) * 4;
    else if (state === "celebrate") base = -6 + s(time * 4.8) * 1.8;
    else if (state === "surprise") base = -2 + s(time * 8) * 1.2;
    else if (state === "sleepy") base = 6 + s(time * 0.4) * 2.4;
    return base + lean;
  }

  function squash(time, state, animated) {
    if (!animated) return { x: 1, y: 1 };
    const breath = Math.sin(time * 1.45);
    if (state === "welcome") {
      const hop = Math.abs(Math.sin(time * 7.2));
      return { x: 1 + hop * 0.035, y: 1 - hop * 0.03 };
    }
    if (state === "sleepy") return { x: 1.03 + breath * 0.008, y: 0.96 - breath * 0.006 };
    if (state === "idle" || state === "wait" || state === "live") return { x: 1 + breath * 0.018, y: 1 - breath * 0.016 };
    if (state === "wave") {
      const wave = Math.sin(time * 1.8);
      return { x: 1 + wave * 0.022, y: 1 - wave * 0.018 };
    }
    if (state === "write") return { x: 1.02, y: 0.985 };
    if (state === "cheer" || state === "celebrate") {
      const hop = Math.sin(time * 6.2);
      return { x: 1 + hop * 0.035, y: 1 - hop * 0.03 };
    }
    return { x: 0.96 + breath * 0.01, y: 1.05 - breath * 0.008 };
  }

  const depth = {
    idle: 0.66, live: 0.8, wait: 0.66, write: 0.7, wave: 0.8, welcome: 0.96,
    cheer: 0.9, celebrate: 0.9, surprise: 0.73, sleepy: 0.5,
  };
  const resting = {
    idle: 0.62, live: 0.95, wait: 0.62, write: 0.88, wave: 1, welcome: 1.08,
    cheer: 0.72, celebrate: 0.72, surprise: 1.24, sleepy: 0.36,
  };
  const smilePath = (amount) => `M28 52 C36 ${(amount * 100).toFixed(1)} 66 ${((amount - 0.01) * 100).toFixed(1)} 74 51`;

  function drawEye(eye, gaze, open, squint, wide) {
    const shiftX = clamp(gaze.x * 5, -5, 5);
    const shiftY = clamp(gaze.y * 3.5, -4, 4);
    const x = Number(eye.dataset.x) + shiftX;
    const y = Number(eye.dataset.y) + shiftY;
    eye.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    const pupil = eye.querySelector(".pupil");
    const lid = eye.querySelector(".lid");
    const arc = eye.querySelector(".squint");
    const openness = Math.max(0, open);
    pupil.style.display = "none";
    lid.style.display = "none";
    arc.style.display = "none";
    if (squint && openness > 0.28) {
      const lift = 5.5 * Math.min(openness, 1);
      arc.setAttribute("d", `M-9 1.2 Q0 ${(-lift).toFixed(2)} 9 1`);
      arc.style.display = "inline";
    } else if (openness < 0.16) {
      lid.style.display = "inline";
    } else {
      const w = wide ? 9 : 7;
      const h = (wide ? 11.5 : 9.5) * Math.min(openness, 1.35);
      pupil.setAttribute("rx", (w / 2).toFixed(2));
      pupil.setAttribute("ry", (h / 2).toFixed(2));
      pupil.style.display = "inline";
    }
  }

  function winkOpen(time, phase) {
    const t = positive(time + phase, 6.4);
    if (t < 5.2 || t > 5.75) return 1;
    const u = (t - 5.2) / 0.55;
    return u < 0.4 ? 1 - u / 0.4 : (u - 0.4) / 0.6;
  }

  function poseCast(cast, time, animated) {
    cast.faces.forEach((face) => {
      const phase = face.phase;
      const blink = animated ? blinkFactor(time, false, phase) : 1;
      let openL = 0.92 * blink;
      let openR = 0.92 * (animated ? blinkFactor(time, false, phase + (cast.kind === "pair" ? 0 : 0.03)) : 1);
      let smile = 0.78;
      let rot = 0;
      let tx = 0;
      let ty = 0;
      let blush = 0;
      let squint = false;
      const dir = face.index === 0 ? 1 : -1;
      if (cast.kind === "pair") {
        const sway = animated ? Math.sin(time * 0.85 + phase) : 0.35;
        rot = dir * (8 + sway * 4);
        tx = dir * (2.5 + sway * 1.6);
        const glance = animated ? Math.sin(time * 0.65) : 0.5;
        face.lookX = dir * (0.45 + glance * 0.35);
        face.lookY = -0.08;
        blush = animated ? 0.28 + (Math.sin(time * 1.25 + phase) * 0.5 + 0.5) * 0.6 : 0.5;
        smile = 0.86 + (animated ? Math.sin(time * 1.05) * 0.05 : 0);
      } else if (cast.kind === "crew") {
        const bounce = animated ? Math.sin(time * 3.3 + phase) : 0;
        ty = (animated ? bounce * -4.2 : (face.index % 2 ? -1.5 : 0));
        rot = animated ? Math.sin(time * 2.1 + phase) * 7 : (face.index - 2) * 4;
        tx = animated ? Math.sin(time * 1.65 + phase) * 2.4 : 0;
        face.lookX = animated ? Math.sin(time * 0.9 + phase) * 0.55 : (face.index - 2) * 0.15;
        face.lookY = animated ? Math.cos(time * 0.55 + phase) * 0.22 : 0;
        const giggle = animated ? Math.sin(time * 2.5 + phase) : 0;
        smile = 0.74 + Math.max(0, giggle) * 0.18;
        squint = giggle > 0.72;
        if (animated && face.index % 2 === 0) openL *= winkOpen(time, phase);
      } else {
        const breathe = animated ? Math.sin(time * 1.35 + phase) : 0;
        ty = breathe * -1.1;
        rot = animated ? Math.sin(time * 0.75 + phase) * 3.2 : -3;
        smile = 0.72 + (animated ? Math.sin(time * 1.15 + phase) * 0.07 : 0.04);
        face.lookX = animated ? Math.sin(time * 0.42 + phase) * 0.4 : 0.1;
        face.lookY = animated ? Math.cos(time * 0.3 + phase) * 0.18 : 0;
        openL = 0.88 * blink;
        openR = openL;
      }
      face.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      const squashY = 1 + (animated ? Math.sin(time * 2.2 + phase) * 0.018 : 0);
      if (face.rig) {
        face.rig.setAttribute(
          "transform",
          `translate(50 50) scale(${(1 / squashY).toFixed(3)} ${squashY.toFixed(3)}) translate(-50 -50)`,
        );
      }
      const gaze = { x: face.lookX, y: face.lookY };
      if (face.eyes[0]) drawEye(face.eyes[0], gaze, openL, squint, false);
      if (face.eyes[1]) drawEye(face.eyes[1], gaze, openR, squint, false);
      if (face.smile) face.smile.setAttribute("d", smilePath(smile));
      face.blush.forEach((cheek) => { cheek.style.opacity = blush.toFixed(3); });
    });
    if (cast.heart) {
      if (!animated) {
        cast.heart.style.opacity = "0.92";
        cast.heart.style.transform = "scale(1)";
      } else {
        const beat = Math.sin(time * 2.35);
        const s = 0.84 + (beat * 0.5 + 0.5) * 0.26;
        cast.heart.style.opacity = String(0.72 + beat * 0.22);
        cast.heart.style.transform = `scale(${s.toFixed(3)})`;
      }
    }
  }

  let raf = 0;
  let lastLabel = "";
  function frame(now) {
    raf = 0;
    const time = (now - started) / 1000;
    const animated = !reduce.matches;
    const state = heroState(now);
    scrollBias *= 0.9;
    if (wrap) wrap.classList.toggle("is-welcome", animated && state === "welcome");

    const focused = email && document.activeElement === email;
    const freshPointer = pointer && now - pointerAt < 1600;
    let point = null;
    let tracking = false;
    if (focused) {
      point = caretPoint(email);
      tracking = true;
    } else if (freshPointer) {
      point = pointer;
      tracking = pressing || now - pointerAt < 900;
    }

    for (const face of faces) {
      if (!face.visible && animated) continue;
      const local = face.role === "hero" ? state : (state === "celebrate" ? "celebrate" : "idle");
      const sleepy = local === "idle" || local === "wait" || local === "sleepy";
      const blink = animated ? blinkFactor(time, sleepy, face.phase) : 1;
      const rightBlink = animated ? blinkFactor(time - 0.02, sleepy, face.phase) : 1;
      const intent = attentionFor(face, point, tracking, time, local);
      const easeAmt = reduce.matches ? 1 : 0.22;
      face.lookX += (intent.lookX - face.lookX) * easeAmt;
      face.lookY += (intent.lookY - face.lookY) * easeAmt;
      face.lean += (intent.lean - face.lean) * easeAmt;
      const gaze = {
        x: face.lookX,
        y: face.lookY + (face.role === "hero" ? scrollBias : 0),
      };
      const pose = squash(time, local, animated && face.role === "hero" ? true : animated && local !== "welcome");
      const angle = tilt(time, local, animated, face.role === "hero" ? face.lean : face.lean * 0.35);
      let peek = 0;
      if (face.role === "hero") {
        if (!animated) peek = 0;
        else if (local === "welcome") peek = -Math.abs(Math.sin(time * 7.2)) * 8;
        else if (local === "sleepy") peek = 4 + Math.sin(time * 0.55) * 2.4;
        else if (local === "surprise") peek = -5;
        else if (intent.tracking) peek = 1.5;
      }
      if (face.rig) {
        face.rig.setAttribute(
          "transform",
          `translate(50 50) rotate(${angle.toFixed(2)}) scale(${pose.x.toFixed(4)} ${pose.y.toFixed(4)}) translate(-50 -50)`,
        );
      }
      face.svg.style.translate = `0 ${peek.toFixed(2)}px`;
      const squint = local === "cheer" || local === "celebrate";
      const wide = local === "surprise" || local === "welcome";
      const open = resting[local] || 0.62;
      if (face.eyes[0]) drawEye(face.eyes[0], gaze, open * blink, squint, wide);
      if (face.eyes[1]) drawEye(face.eyes[1], gaze, open * rightBlink, squint, wide);
      const smile = smilePath(depth[local] || 0.66);
      if (face.smile && face.smile.getAttribute("d") !== smile) face.smile.setAttribute("d", smile);
      if (face.role === "hero" && face.slot && face.slot.getAttribute("role") === "img") {
        const label = labels[local] || labels.idle;
        if (label !== lastLabel) face.slot.setAttribute("aria-label", label);
        lastLabel = label;
      }
    }

    if (animated) {
      casts.forEach((cast) => {
        if (cast.visible) poseCast(cast, time, true);
      });
    }

    const any = faces.some((face) => face.visible) || casts.some((cast) => cast.visible);
    if (!document.hidden && animated && any) raf = requestAnimationFrame(frame);
  }

  const kick = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  };

  casts.forEach((cast) => poseCast(cast, 0.6, !reduce.matches));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        faces.forEach((face) => {
          if (face.svg === entry.target) face.visible = entry.isIntersecting;
        });
        casts.forEach((cast) => {
          if (cast.root === entry.target) cast.visible = entry.isIntersecting;
        });
      });
      kick();
    }, { threshold: 0.04 });
    faces.forEach((face) => io.observe(face.svg));
    casts.forEach((cast) => io.observe(cast.root));
  }

  window.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    pointerAt = performance.now();
    markActivity();
    kick();
  }, { passive: true });
  window.addEventListener("pointerdown", (event) => {
    const button = event.target.closest && event.target.closest("#join button");
    pressing = Boolean(button);
    pointer = { x: event.clientX, y: event.clientY };
    pointerAt = performance.now();
    markActivity();
    kick();
  });
  window.addEventListener("pointerup", () => { pressing = false; });
  let lastScrollY = window.scrollY;
  let lastScrollAt = performance.now();
  window.addEventListener("scroll", () => {
    const now = performance.now();
    const y = window.scrollY;
    const dy = y - lastScrollY;
    const dt = Math.max(16, now - lastScrollAt);
    lastScrollY = y;
    lastScrollAt = now;
    faces.forEach((face) => { face.rectAt = 0; });
    if (Math.abs(dy) < 1) return;
    scrollBias = clamp(dy / 26, -0.9, 0.9);
    markActivity();
    if (Math.abs(dy) > 72 || Math.abs(dy) / dt > 1.2) surpriseUntil = now + 700;
    kick();
  }, { passive: true });
  document.addEventListener("lt-arrive", () => {
    cheerUntil = performance.now() + 900;
    markActivity();
    kick();
  });
  if (email) {
    ["focus", "input", "keyup", "click", "select"].forEach((name) => email.addEventListener(name, () => {
      lastType = performance.now();
      markActivity();
      kick();
    }));
  }
  document.addEventListener("selectionchange", () => {
    if (email && document.activeElement === email) {
      lastType = performance.now();
      kick();
    }
  });
  if (join) {
    new MutationObserver(() => {
      if (join.classList.contains("is-done")) celebrateUntil = performance.now() + 2800;
      markActivity();
      kick();
    }).observe(join, { attributes: true, attributeFilter: ["class"] });
  }
  window.addEventListener("keydown", () => { markActivity(); kick(); });
  document.addEventListener("visibilitychange", kick);
  reduce.addEventListener?.("change", () => {
    casts.forEach((cast) => poseCast(cast, 0.6, !reduce.matches));
    kick();
  });
  window.addEventListener("resize", () => {
    faces.forEach((face) => { face.rectAt = 0; });
    kick();
  });
  kick();
})();
