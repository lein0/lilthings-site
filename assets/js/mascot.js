/* Little Smiley, ported from the iOS onboarding mascot.
   Rounded-square face, blinking eyelids, and eyes that follow
   the pointer — or the email caret while that field is focused.
   prefers-reduced-motion: no blink, bob, or squash; eyes still
   snap toward the pointer and the caret. */
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
    wave: "Little Smiley waving hello",
    write: "Little Smiley writing",
    cheer: "Little Smiley cheering",
    wait: "Little Smiley waiting",
    celebrate: "Little Smiley celebrating",
    surprise: "Little Smiley surprised",
  };

  const svgMarkup = () => `
    <svg class="mascot" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g class="rig">
        <rect x="4" y="4" width="92" height="92" rx="24" fill="${FACE}"/>
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

  const faces = [...document.querySelectorAll(".mascot")].map((svg) => ({
    svg,
    rig: svg.querySelector(".rig"),
    eyes: [...svg.querySelectorAll(".mascot-eye")],
    smile: svg.querySelector(".smile"),
    slot: svg.closest("[data-mascot], .mascot-slot"),
    lookX: 0,
    lookY: 0,
    lean: 0,
  }));
  if (!faces.length) return;

  const email = document.querySelector("#email");
  const join = document.querySelector("#join");
  let pointer = null;
  let pressing = false;
  let celebrateUntil = 0;
  const started = performance.now();

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const positive = (time, modulo) => {
    const raw = time % modulo;
    return raw < 0 ? raw + modulo : raw;
  };
  const pulse = (dt) => {
    if (dt < 0 || dt > BLINK) return 1;
    if (dt < CLOSE) return 1 - dt / CLOSE;
    return (dt - CLOSE) / OPEN;
  };
  const blinkFactor = (time, sleepy) => {
    const gap = sleepy ? SLEEPY : AWAKE;
    const t = positive(time, gap * 4);
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

  function desired(now) {
    const typing = email && document.activeElement === email;
    const busy = join && join.classList.contains("is-busy");
    const celebrating = now < celebrateUntil;
    let state = "idle";
    if (celebrating) state = "celebrate";
    else if (typing) state = "write";
    else if (pressing) state = "cheer";
    else if (busy) state = "wait";
    else if (now - started < 1700) state = "wave";

    let point = null;
    let tracking = false;
    if (typing) {
      point = caretPoint(email);
      tracking = true;
    } else if (pointer) {
      point = pointer;
      tracking = pressing;
    }
    return { state, point, tracking };
  }

  function attentionFor(face, point, tracking, time, state) {
    if (!point) {
      if (state === "wave") return { lookX: 0, lookY: -0.15, lean: -6, tracking: false };
      return { lookX: 0, lookY: 0, lean: 0, tracking: false };
    }
    const rect = face.svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = clamp((point.x - cx) / Math.max(rect.width * 0.85, 24), -1, 1);
    const ny = clamp((point.y - cy) / Math.max(rect.height * 0.85, 24), -1, 1);
    const wander = reduce.matches ? { x: 0, y: 0 } : saccade(time);
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
      const still = { wave: -6, cheer: -6, celebrate: -6, surprise: -2, write: 3 };
      return (still[state] || 0) + lean;
    }
    const s = Math.sin;
    let base = 0;
    if (state === "idle") base = -3 + s(time * 0.55) * 2.4;
    else if (state === "wave") base = -6 + s(time * 1.7) * 2;
    else if (state === "write") base = 4;
    else if (state === "cheer") base = -7 + s(time * 5.5) * 1.6;
    else if (state === "wait") base = s(time * 0.45) * 4;
    else if (state === "celebrate") base = -6 + s(time * 4.8) * 1.8;
    else if (state === "surprise") base = -2 + s(time * 8) * 1.2;
    return base + lean;
  }

  function squash(time, state, animated) {
    if (!animated) return { x: 1, y: 1 };
    const breath = Math.sin(time * 1.45);
    if (state === "idle" || state === "wait") return { x: 1 + breath * 0.018, y: 1 - breath * 0.016 };
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

  const depth = { idle: 0.66, wait: 0.66, write: 0.7, wave: 0.8, cheer: 0.9, celebrate: 0.9, surprise: 0.73 };
  const resting = { idle: 0.62, wait: 0.62, write: 0.88, wave: 1, cheer: 0.72, celebrate: 0.72, surprise: 1.24 };

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

  let raf = 0;
  let lastLabel = "";
  function frame(nowMs) {
    raf = 0;
    const now = nowMs;
    const time = (now - started) / 1000;
    const animated = !reduce.matches;
    const wish = desired(now);
    const sleepy = wish.state === "idle" || wish.state === "wait";
    const blink = animated ? blinkFactor(time, sleepy) : 1;
    const squint = wish.state === "cheer" || wish.state === "celebrate";
    const wide = wish.state === "surprise";
    const smileDepth = depth[wish.state] || 0.66;
    const smile = `M28 52 C36 ${(smileDepth * 100).toFixed(1)} 66 ${((smileDepth - 0.01) * 100).toFixed(1)} 74 51`;
    const leftOpen = (resting[wish.state] || 0.62) * (animated ? blink : 1);
    const rightBlink = animated ? blinkFactor(time - 0.02, sleepy) : 1;
    const rightOpen = (resting[wish.state] || 0.62) * rightBlink;

    for (const face of faces) {
      const intent = attentionFor(face, wish.point, wish.tracking, time, wish.state);
      const ease = reduce.matches ? 1 : 0.22;
      face.lookX += (intent.lookX - face.lookX) * ease;
      face.lookY += (intent.lookY - face.lookY) * ease;
      face.lean += (intent.lean - face.lean) * ease;
      const gaze = { x: face.lookX, y: face.lookY };
      const pose = squash(time, wish.state, animated);
      const angle = tilt(time, wish.state, animated, face.lean);
      const peek = wish.tracking ? 1.5 : 0;
      face.rig.setAttribute(
        "transform",
        `translate(50 50) rotate(${angle.toFixed(2)}) scale(${pose.x.toFixed(4)} ${pose.y.toFixed(4)}) translate(-50 -50)`,
      );
      face.svg.style.translate = `0 ${peek.toFixed(2)}px`;
      drawEye(face.eyes[0], gaze, leftOpen, squint, wide);
      drawEye(face.eyes[1], gaze, rightOpen, squint, wide);
      if (face.smile.getAttribute("d") !== smile) face.smile.setAttribute("d", smile);
      if (face.slot && face.slot.getAttribute("role") === "img") {
        const label = labels[wish.state] || labels.idle;
        if (label !== lastLabel) face.slot.setAttribute("aria-label", label);
      }
    }
    lastLabel = labels[wish.state] || labels.idle;
    if (!document.hidden && !reduce.matches) raf = requestAnimationFrame(frame);
  }

  const kick = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  };

  window.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    kick();
  }, { passive: true });
  window.addEventListener("pointerdown", (event) => {
    const button = event.target.closest && event.target.closest("#join button");
    pressing = Boolean(button);
    pointer = { x: event.clientX, y: event.clientY };
    kick();
  });
  window.addEventListener("pointerup", () => {
    pressing = false;
  });
  if (email) {
    ["focus", "input", "keyup", "click", "select"].forEach((name) => email.addEventListener(name, kick));
  }
  document.addEventListener("selectionchange", () => {
    if (email && document.activeElement === email) kick();
  });
  if (join) {
    new MutationObserver(() => {
      if (join.classList.contains("is-done")) celebrateUntil = performance.now() + 2800;
      kick();
    }).observe(join, { attributes: true, attributeFilter: ["class"] });
  }
  document.addEventListener("visibilitychange", kick);
  reduce.addEventListener?.("change", kick);
  setTimeout(kick, 1750);
  kick();
})();
