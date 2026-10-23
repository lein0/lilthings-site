/* Handwritten notes and widget messages.
   Each letter is Caveat, uncovered by a pen stroke (a mask that
   follows the nib) rather than a line-wide typewriter wipe.
   Replay timing helpers match ReplayMotion / ReplayStage:
   idle gaps cap at 0.4s, strokes keep a 0.12s lift, and the
   whole note eases with smoothstep into a 2.8–8s duration. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const IDLE_CAP = 0.4;
  const STROKE_GAP = 0.12;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let uid = 0;
  let measureCtx = null;

  function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }
  function ease(t) {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  }
  function normalizedTimes(times) {
    if (!times.length) return [];
    let previous = times[0];
    let cursor = 0;
    const out = [0];
    for (let i = 1; i < times.length; i += 1) {
      cursor += Math.min(IDLE_CAP, Math.max(0, times[i] - previous));
      out.push(cursor);
      previous = times[i];
    }
    return out;
  }
  function pleasantDuration(raw) {
    return Math.min(8, Math.max(2.8, raw));
  }
  function plan(strokes) {
    let cursor = 0;
    const planned = [];
    strokes.forEach((stroke) => {
      const times = normalizedTimes(stroke.samples.map((sample) => sample.t));
      const length = Math.max(times.length ? times[times.length - 1] : 0, 0.05);
      planned.push({ samples: stroke.samples, times, start: cursor, end: cursor + length });
      cursor = cursor + length + STROKE_GAP;
    });
    const raw = Math.max(cursor, 0.05);
    const span = pleasantDuration(raw);
    const scale = span / raw;
    return {
      span,
      strokes: planned.map((stroke) => ({
        samples: stroke.samples,
        times: stroke.times.map((t) => t * scale),
        start: stroke.start * scale,
        end: stroke.end * scale,
      })),
    };
  }

  function ctx() {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    return measureCtx;
  }
  function widthOf(text, size) {
    const c = ctx();
    c.font = `600 ${size}px Caveat, cursive`;
    return c.measureText(text).width;
  }

  function defsOf(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    return defs;
  }
  function node(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (parent) parent.appendChild(el);
    return el;
  }

  // A short pen curve across one letter. Variant keeps neighbors from wiping in lockstep.
  function penD(x, y, w, h, variant) {
    const x1 = x + w;
    const top = y - h * 0.78;
    const bot = y + h * 0.22;
    const mid = y - h * 0.28;
    if (variant % 4 === 0) return `M${x.toFixed(1)} ${top.toFixed(1)} C ${(x + w * 0.25).toFixed(1)} ${(top - h * 0.05).toFixed(1)} ${(x + w * 0.55).toFixed(1)} ${bot.toFixed(1)} ${x1.toFixed(1)} ${mid.toFixed(1)}`;
    if (variant % 4 === 1) return `M${x.toFixed(1)} ${mid.toFixed(1)} C ${(x + w * 0.3).toFixed(1)} ${bot.toFixed(1)} ${(x + w * 0.45).toFixed(1)} ${top.toFixed(1)} ${x1.toFixed(1)} ${(y - h * 0.1).toFixed(1)}`;
    if (variant % 4 === 2) return `M${x.toFixed(1)} ${(top + h * 0.15).toFixed(1)} C ${(x + w * 0.2).toFixed(1)} ${bot.toFixed(1)} ${(x + w * 0.7).toFixed(1)} ${top.toFixed(1)} ${x1.toFixed(1)} ${(mid + h * 0.2).toFixed(1)}`;
    return `M${x.toFixed(1)} ${bot.toFixed(1)} C ${(x + w * 0.35).toFixed(1)} ${top.toFixed(1)} ${(x + w * 0.6).toFixed(1)} ${bot.toFixed(1)} ${x1.toFixed(1)} ${mid.toFixed(1)}`;
  }

  function fitSize(text, size, maxWidth) {
    let next = size;
    let width = widthOf(text, next);
    if (maxWidth && width > maxWidth && width > 0) {
      next *= maxWidth / width;
      width = maxWidth;
    }
    return { size: next, width };
  }

  function wrap(text, size, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length || !maxWidth) return [text];
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    });
    if (current) lines.push(current);
    return lines;
  }

  // Draw one line of Caveat. `cy` is the visual center. Returns parts in milliseconds.
  function inkLine(svg, text, opts) {
    const fill = opts.fill || "currentColor";
    const fitted = fitSize(text, opts.size, opts.maxWidth || 0);
    const size = fitted.size;
    const baseline = opts.baseline != null ? opts.baseline : (opts.cy ?? opts.size) + size * 0.36;
    let x = opts.x ?? 0;
    if (opts.cx != null) x = opts.cx - fitted.width / 2;
    const defs = defsOf(svg);
    const parts = [];
    let cursor = 0;
    const chars = [...text];
    chars.forEach((ch, index) => {
      if (ch === " " || ch === "\n") {
        x += widthOf(" ", size);
        cursor += 120;
        return;
      }
      const w = Math.max(widthOf(ch, size), size * 0.28);
      const d = penD(x, baseline, w, size, ch.charCodeAt(0) + index);
      const id = `ltm-${++uid}`;
      const mask = node("mask", { id, maskUnits: "userSpaceOnUse" }, defs);
      const pen = node("path", {
        d,
        fill: "none",
        stroke: "white",
        "stroke-width": (size * 1.15).toFixed(2),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }, mask);
      const len = Math.max(pen.getTotalLength(), 1);
      pen.style.strokeDasharray = String(len);
      pen.style.strokeDashoffset = reduce.matches ? "0" : String(len);
      const textEl = node("text", {
        x: x.toFixed(2),
        y: baseline.toFixed(2),
        fill,
        "font-family": "Caveat, cursive",
        "font-weight": 600,
        "font-size": size.toFixed(2),
        mask: `url(#${id})`,
      }, svg);
      textEl.textContent = ch;
      const dur = Math.max(88, (len / 220) * 1000);
      const lead = cursor;
      parts.push({
        mask: pen,
        len,
        lead,
        dur,
        point(k) {
          const pt = pen.getPointAtLength(len * clamp01(k));
          return { x: pt.x, y: pt.y };
        },
      });
      const next = chars[index + 1];
      cursor += dur + (next === " " ? 0 : 36);
      x += w;
    });
    return { parts, width: fitted.width, size, height: size * 1.35 };
  }

  const jobs = [];
  let raf = 0;

  function paint(job, now) {
    if (!job.armed) return false;
    if (!job.t0) job.t0 = now;
    const elapsed = now - job.t0;
    let pending = false;
    let active = null;
    job.parts.forEach((part) => {
      const k = clamp01((elapsed - part.t0) / Math.max(1, part.t1 - part.t0));
      part.mask.style.strokeDashoffset = String(part.len * (1 - k));
      if (k > 0 && k < 1) active = { part, k };
      if (k < 1) pending = true;
    });
    if (job.nib) {
      if (active) {
        const pt = active.part.point(active.k);
        job.nib.setAttribute("cx", pt.x.toFixed(2));
        job.nib.setAttribute("cy", pt.y.toFixed(2));
        job.nib.style.opacity = "1";
      } else job.nib.style.opacity = "0";
    }
    return pending;
  }

  function frame(now) {
    raf = 0;
    let pending = false;
    jobs.forEach((job) => {
      if (job.done) return;
      if (paint(job, now)) pending = true;
      else if (job.armed) job.done = true;
    });
    if (pending && !reduce.matches) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && !reduce.matches) raf = requestAnimationFrame(frame);
  }

  function mountTitle(el) {
    const text = (el.getAttribute("data-source") || el.textContent || "").trim();
    if (!text || el.dataset.write === "on") return;
    el.dataset.write = "on";
    el.dataset.source = text;
    const size = parseFloat(getComputedStyle(el).fontSize) || 32;
    const maxWidth = Math.max(120, (el.clientWidth || 280) - 4);
    const lines = wrap(text, size, maxWidth);
    const lineH = size * 1.35;
    let cursor = 0;
    const built = lines.map((line) => ({ line, width: widthOf(line, size) }));
    const vbW = Math.max(...built.map((line) => line.width), 8) + 10;
    const vbH = lineH * lines.length + size * 0.2;
    el.textContent = "";
    el.classList.add("is-writing");
    const hidden = document.createElement("span");
    hidden.className = "sr-only";
    hidden.textContent = text;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
    svg.setAttribute("width", vbW.toFixed(1));
    svg.setAttribute("height", vbH.toFixed(1));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("written");
    const parts = [];
    built.forEach((line, li) => {
      const laid = inkLine(svg, line.line, {
        x: 2,
        baseline: size * 0.92 + li * lineH,
        size,
        fill: "currentColor",
      });
      laid.parts.forEach((part) => {
        const t0 = cursor + part.lead;
        parts.push({ mask: part.mask, len: part.len, t0, t1: t0 + part.dur, point: part.point });
        cursor = Math.max(cursor, t0 + part.dur);
      });
      cursor += 80;
    });
    const nib = node("circle", { r: 2.2, fill: "currentColor", opacity: 0 }, svg);
    el.append(svg, hidden);
    const job = { parts, nib, armed: false, done: reduce.matches, t0: 0 };
    if (reduce.matches) {
      parts.forEach((part) => { part.mask.style.strokeDashoffset = "0"; });
      return;
    }
    jobs.push(job);
    const host = el.closest(".reveal");
    const arm = () => {
      if (job.armed) return;
      job.armed = true;
      job.t0 = 0;
      kick();
    };
    if (!host) arm();
    else {
      const watch = new MutationObserver(() => {
        if (host.classList.contains("is-in")) arm();
      });
      watch.observe(host, { attributes: true, attributeFilter: ["class"] });
      if (host.classList.contains("is-in")) arm();
    }
  }

  function mountAll() {
    document.querySelectorAll("[data-write]").forEach(mountTitle);
    kick();
  }
  function boot() {
    const ready = document.fonts && document.fonts.load
      ? document.fonts.load('600 40px "Caveat"').catch(() => {})
      : Promise.resolve();
    ready.then(mountAll);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  reduce.addEventListener?.("change", () => {
    if (!reduce.matches) return;
    jobs.forEach((job) => {
      job.parts.forEach((part) => { part.mask.style.strokeDashoffset = "0"; });
      if (job.nib) job.nib.style.opacity = "0";
      job.done = true;
    });
  });

  window.ltHand = {
    IDLE_CAP,
    STROKE_GAP,
    ease,
    normalizedTimes,
    pleasantDuration,
    plan,
    inkLine,
    widthOf,
  };
})();
