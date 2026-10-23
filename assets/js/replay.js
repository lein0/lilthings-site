/* "It draws itself" — the same planner as ReplayStage.
   Idle gaps cap at 0.4s, strokes keep a 0.12s lift, the whole
   note eases with smoothstep across a 2.8–8s pleasant duration,
   then the reactions arrive. */
(() => {
  const root = document.getElementById("replay");
  const svg = document.getElementById("replay-svg");
  const reacts = document.getElementById("replay-reacts");
  const hand = window.ltHand;
  if (!root || !svg || !reacts || !hand) return;

  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const heartD = "M100 100 C72 82 56 66 64 50 C72 34 92 36 100 52 C108 36 128 34 136 50 C144 66 128 82 100 100";

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.appendChild(node);
    return node;
  }

  function samplePath(d, map, speed) {
    const path = el("path", { d }, svg);
    const len = Math.max(path.getTotalLength(), 1);
    const steps = Math.max(8, Math.ceil(len / 5));
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const dist = (len * i) / steps;
      const pt = path.getPointAtLength(dist);
      const xy = map(pt);
      points.push({ t: dist / speed, x: xy.x, y: xy.y });
    }
    path.remove();
    return points;
  }

  function toD(points) {
    if (!points.length) return "";
    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i += 1) {
      d += ` L${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
    }
    return d;
  }

  let stage = null;
  let heartPath = null;
  let letters = [];
  let nib = null;

  function samplesOf(path, speed) {
    const len = Math.max(path.getTotalLength(), 1);
    const steps = Math.max(6, Math.ceil(len / 6));
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const dist = (len * i) / steps;
      const pt = path.getPointAtLength(dist);
      points.push({ t: dist / speed, x: pt.x, y: pt.y });
    }
    return points;
  }

  function build() {
    const heart = samplePath(heartD, (pt) => ({
      x: 36 + (pt.x - 100) * 0.62,
      y: 18 + (pt.y - 34) * 0.48,
    }), 120);
    // A recorded hesitation longer than the idle cap, so the planner skips it
    // the way a pen sitting still does not freeze Watch It Happen.
    const hesitate = Math.floor(heart.length * 0.58);
    for (let i = hesitate; i < heart.length; i += 1) heart[i].t += 1.3;

    const size = 40;
    const word = "hi";
    const wordWidth = hand.widthOf(word, size);
    const laid = hand.inkLine(svg, word, {
      x: 118 + (70 - wordWidth) / 2,
      baseline: 78,
      size,
      fill: "#2e2e3a",
    });
    letters = laid.parts;
    stage = hand.plan([{ samples: heart }, ...letters.map((part) => ({ samples: samplesOf(part.mask, 180) }))]);
    heartPath = el("path", {
      class: "ink",
      fill: "none",
      stroke: "#2e2e3a",
      "stroke-width": "3.3",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }, svg);
    nib = el("circle", { r: "2.5", fill: "#2e2e3a", class: "nib" }, svg);
    if (reduce.matches) still();
    else kick();
  }

  function pill(emoji, letter, bg) {
    const node = document.createElement("span");
    node.className = "rx";
    const b = document.createElement("b");
    b.textContent = emoji;
    const av = document.createElement("i");
    av.className = "av sm";
    av.textContent = letter;
    av.style.background = bg;
    node.append(b, av);
    return node;
  }
  const pills = [
    pill("❤️", "E", "#cfe0f5"),
    pill("🥹", "C", "#f7c8da"),
  ];
  pills.forEach((node) => reacts.appendChild(node));

  function partial(stroke, local) {
    const shown = [];
    const { samples, times } = stroke;
    for (let i = 0; i < samples.length; i += 1) {
      if (times[i] <= local) {
        shown.push(samples[i]);
        continue;
      }
      if (i > 0) {
        const a = samples[i - 1];
        const b = samples[i];
        const span = times[i] - times[i - 1];
        const f = span <= 0.000001 ? 1 : (local - times[i - 1]) / span;
        shown.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      }
      break;
    }
    return shown;
  }

  function draw(clock) {
    if (!stage) return;
    const heart = stage.strokes[0];
    let points = [];
    if (clock >= heart.end) points = heart.samples;
    else if (clock > heart.start) points = partial(heart, clock - heart.start);
    heartPath.setAttribute("d", toD(points));
    let tip = points.length ? points[points.length - 1] : null;
    letters.forEach((part, index) => {
      const stroke = stage.strokes[index + 1];
      if (!stroke) return;
      const span = Math.max(0.0001, stroke.end - stroke.start);
      const k = clock >= stroke.end ? 1 : clock <= stroke.start ? 0 : (clock - stroke.start) / span;
      part.mask.style.strokeDashoffset = String(part.len * (1 - k));
      if (k > 0 && k < 1) tip = part.point(k);
    });
    const drawing = clock > 0 && clock < stage.span;
    if (tip && drawing) {
      nib.setAttribute("cx", tip.x.toFixed(2));
      nib.setAttribute("cy", tip.y.toFixed(2));
      nib.style.opacity = "1";
    } else if (nib) nib.style.opacity = "0";
  }

  function showReactions(elapsed) {
    const after = elapsed - stage.span;
    pills.forEach((node, index) => {
      node.classList.toggle("on", after >= 0.18 + index * 0.28);
    });
  }

  const holdFor = () => (stage ? stage.span + 1.45 : 0);
  const endFor = () => holdFor() + 0.4;
  let visible = true;
  let raf = 0;
  let last = 0;
  let clock = 0;

  function renderAt(elapsed) {
    if (!stage) return;
    const drawT = Math.min(elapsed, stage.span);
    const progress = stage.span <= 0 ? 1 : drawT / stage.span;
    draw(hand.ease(progress) * stage.span);
    showReactions(elapsed);
    const hold = holdFor();
    const end = endFor();
    const fade = elapsed > hold ? Math.min(1, (elapsed - hold) / (end - hold)) : 0;
    const fin = Math.min(1, elapsed / 0.18);
    svg.style.opacity = String(Math.min(fin, 1 - fade));
  }

  function still() {
    renderAt(holdFor() - 0.05);
    pills.forEach((node) => node.classList.add("on"));
    svg.style.opacity = "1";
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || reduce.matches) { last = 0; return; }
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    clock += dt / 1000;
    if (clock >= endFor()) {
      clock = 0;
      pills.forEach((node) => node.classList.remove("on"));
    }
    renderAt(clock);
    raf = requestAnimationFrame(frame);
  }

  const kick = () => {
    if (!raf && visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(frame);
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      kick();
    }, { threshold: 0.2 }).observe(root);
  }

  document.addEventListener("visibilitychange", kick);
  reduce.addEventListener?.("change", () => {
    if (reduce.matches) {
      cancelAnimationFrame(raf);
      raf = 0;
      still();
    } else {
      clock = 0;
      kick();
    }
  });

  const ready = document.fonts && document.fonts.load
    ? document.fonts.load('600 40px "Caveat"').catch(() => {})
    : Promise.resolve();
  ready.then(build);
})();
