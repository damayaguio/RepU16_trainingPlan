/* Drill animation engine: SVG pitch, players, ball, step-by-step playback.
   Spec: { title, w, h, zones:[['v',x]|['h',y]], boxes:['L'|'R'], half, goals:[[x,y,side,mini]],
           cones:[[x,y]], texts:[[x,y,'TXT']], rects:[[x,y,w,h]],
           players:{id:[team,x,y,label,dribbles]}, ball:'id'|[x,y],
           steps:[{t, m:{id:[x,y]}, p:'id'|[x,y], loft, set:'id', cap, lab:{id:'X'}}] }
   Coordinates in metres, y grows downward. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const TEAM = { A: ["#1f5fbf", "#fff"], B: ["#d03a3a", "#fff"], N: ["#f2c230", "#1b1b1b"], G: ["#1d1d1d", "#fff"] };
  const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function drawPitch(svg, s, R) {
    const g = el("g", {}, svg);
    el("rect", { x: -2, y: -2, width: s.w + 4, height: s.h + 4, fill: "#2f7d3c" }, g);
    for (let x = 0; x < s.w; x += 6) if ((x / 6) % 2 === 0) el("rect", { x, y: 0, width: Math.min(6, s.w - x), height: s.h, fill: "#38894a" }, g);
    const ln = { fill: "none", stroke: "#fff", "stroke-width": Math.max(.18, R * .14), "stroke-opacity": .9 };
    el("rect", { x: 0, y: 0, width: s.w, height: s.h, ...ln }, g);
    if (s.half) { el("line", { x1: s.w / 2, y1: 0, x2: s.w / 2, y2: s.h, ...ln }, g); el("circle", { cx: s.w / 2, cy: s.h / 2, r: Math.min(7, s.h / 5), ...ln }, g); }
    (s.boxes || []).forEach(side => {
      const bw = 16.5, bh = Math.min(40, s.h * .8), sw = 5.5, sh = Math.min(18, s.h * .4);
      const x = side === "R" ? s.w - bw : 0, x2 = side === "R" ? s.w - sw : 0;
      el("rect", { x, y: s.h / 2 - bh / 2, width: bw, height: bh, ...ln }, g);
      el("rect", { x: x2, y: s.h / 2 - sh / 2, width: sw, height: sh, ...ln }, g);
    });
    (s.zones || []).forEach(z => {
      const d = { ...ln, "stroke-dasharray": `${R * .8} ${R * .6}`, "stroke-opacity": .75 };
      if (z[0] === "v") el("line", { x1: z[1], y1: 0, x2: z[1], y2: s.h, ...d }, g);
      else el("line", { x1: 0, y1: z[1], x2: s.w, y2: z[1], ...d }, g);
    });
    (s.rects || []).forEach(r => el("rect", { x: r[0], y: r[1], width: r[2], height: r[3], fill: "none", stroke: "#ffe36e", "stroke-width": R * .12 }, g));
    (s.goals || []).forEach(([x, y, side, mini]) => {
      const W = mini ? 2.6 : 7.32, D = mini ? .9 : 1.3;
      const a = { fill: "#f4f4f4", stroke: "#333", "stroke-width": R * .08 };
      if (side === "R") el("rect", { x, y: y - W / 2, width: D, height: W, ...a }, g);
      else if (side === "L") el("rect", { x: x - D, y: y - W / 2, width: D, height: W, ...a }, g);
      else if (side === "T") el("rect", { x: x - W / 2, y: y - D, width: W, height: D, ...a }, g);
      else el("rect", { x: x - W / 2, y, width: W, height: D, ...a }, g);
    });
    (s.cones || []).forEach(([x, y]) => {
      const c = R * .55;
      el("polygon", { points: `${x - c},${y + c * .7} ${x + c},${y + c * .7} ${x},${y - c}`, fill: "#ff8c1a", stroke: "#8a4500", "stroke-width": R * .05 }, g);
    });
    (s.texts || []).forEach(([x, y, t]) => {
      const e = el("text", { x, y, "text-anchor": "middle", "font-size": R * .9, "font-weight": 700, fill: "#fff", "fill-opacity": .85, "font-family": "Barlow Condensed, Arial Narrow, sans-serif", "letter-spacing": ".04em" }, g);
      e.textContent = t;
    });
  }

  class Drill {
    constructor(host, spec) {
      this.s = spec; this.host = host; this.speed = 1; this.playing = false;
      const R = this.R = Math.max(spec.w, spec.h) * .032;
      host.classList.add("drill");
      host.innerHTML = "";
      const stage = document.createElement("div"); stage.className = "drill-stage"; host.appendChild(stage);
      const svg = this.svg = el("svg", { viewBox: `-2 -2 ${spec.w + 4} ${spec.h + 4}`, role: "img", "aria-label": "Animated drill: " + (spec.title || "") }, stage);
      drawPitch(svg, spec, R);
      this.trails = el("g", {}, svg);
      this.pl = {};
      for (const id in spec.players) {
        const [t, x, y, lab, drib] = spec.players[id];
        const g = el("g", {}, svg);
        if (drib) { g._b = el("circle", { r: R * .4, cx: R * .95, cy: R * .55, fill: "#fff", stroke: "#111", "stroke-width": R * .08 }, g); }
        el("circle", { r: R, fill: TEAM[t][0], stroke: "#fff", "stroke-width": R * .14 }, g);
        const tx = el("text", { "text-anchor": "middle", dy: R * .36, "font-size": R * .95, "font-weight": 700, fill: TEAM[t][1], "font-family": "Barlow Condensed, Arial Narrow, sans-serif" }, g);
        tx.textContent = lab || "";
        this.pl[id] = { g, tx, x, y, x0: x, y0: y, lab0: lab || "" };
      }
      this.shadow = el("ellipse", { rx: R * .45, ry: R * .22, fill: "#000", "fill-opacity": 0 }, svg);
      this.ballEl = el("circle", { r: R * .45, fill: "#fff", stroke: "#111", "stroke-width": R * .09 }, svg);
      // UI
      const bar = document.createElement("div"); bar.className = "drill-bar"; host.appendChild(bar);
      bar.innerHTML = `<button type="button" class="d-play" aria-label="Play">▶</button>
        <button type="button" class="d-step" aria-label="Next step">Step ⏭</button>
        <button type="button" class="d-restart" aria-label="Restart">↺</button>
        <button type="button" class="d-speed" aria-label="Playback speed">1×</button>
        <div class="d-prog"><span></span></div><span class="d-count"></span>`;
      this.cap = document.createElement("p"); this.cap.className = "drill-cap"; this.cap.setAttribute("aria-live", "polite"); host.appendChild(this.cap);
      this.btn = bar.querySelector(".d-play");
      this.btn.onclick = () => this.playing ? this.pause() : this.play();
      bar.querySelector(".d-restart").onclick = () => { this.reset(); this.play(); };
      bar.querySelector(".d-step").onclick = () => { this.pause(); this.stepOnce(); };
      const sp = bar.querySelector(".d-speed");
      sp.onclick = () => { this.speed = this.speed === 1 ? .5 : this.speed === .5 ? 1.5 : 1; sp.textContent = this.speed + "×"; };
      this.prog = bar.querySelector(".d-prog span"); this.count = bar.querySelector(".d-count");
      this.reset();
    }
    reset() {
      for (const id in this.pl) { const p = this.pl[id]; p.x = p.x0; p.y = p.y0; p.tx.textContent = p.lab0; }
      const b = this.s.ball;
      this.holder = typeof b === "string" ? b : null;
      this.bx = this.holder ? this.pl[b].x : (b ? b[0] : -99); this.by = this.holder ? this.pl[b].y : (b ? b[1] : -99);
      this.i = 0; this.t = 0; this.hold = 0; this.done = false; this.trails.innerHTML = "";
      this.cap.textContent = this.s.intro || (this.s.steps[0] && this.s.steps[0].cap) || "";
      this.prepare(); this.render(0);
    }
    prepare() {
      const st = this.s.steps[this.i]; if (!st) return;
      if (st.set) { this.holder = st.set; this.bx = this.pl[st.set].x; this.by = this.pl[st.set].y; }
      for (const id in this.pl) { const p = this.pl[id]; p.sx = p.x; p.sy = p.y; const m = st.m && st.m[id]; p.ex = m ? m[0] : p.x; p.ey = m ? m[1] : p.y; }
      if (st.lab) for (const id in st.lab) this.pl[id].tx.textContent = st.lab[id];
      this.bsx = this.bx; this.bsy = this.by;
      if (st.p !== undefined) {
        if (typeof st.p === "string") { const q = this.pl[st.p]; this.bex = q.ex; this.bey = q.ey; }
        else { this.bex = st.p[0]; this.bey = st.p[1]; }
      }
      if (st.cap) this.cap.textContent = st.cap;
      this.count.textContent = `${this.i + 1}/${this.s.steps.length}`;
      // trails
      this.trails.innerHTML = "";
      const R = this.R;
      for (const id in this.pl) { const p = this.pl[id]; if (Math.hypot(p.ex - p.sx, p.ey - p.sy) > .5 && !(this.holder === id && st.p === undefined))
        el("line", { x1: p.sx, y1: p.sy, x2: p.ex, y2: p.ey, stroke: "#fff", "stroke-opacity": .55, "stroke-width": R * .13, "stroke-dasharray": `${R * .5} ${R * .4}`, "stroke-linecap": "round" }, this.trails); }
      if (st.p !== undefined) el("line", { x1: this.bsx, y1: this.bsy, x2: this.bex, y2: this.bey, stroke: "#111", "stroke-opacity": .45, "stroke-width": R * .16 }, this.trails);
      if (this.holder && st.p === undefined) { const p = this.pl[this.holder]; if (Math.hypot(p.ex - p.sx, p.ey - p.sy) > .5)
        el("line", { x1: p.sx, y1: p.sy, x2: p.ex, y2: p.ey, stroke: "#5b2a86", "stroke-opacity": .8, "stroke-width": R * .18, "stroke-dasharray": `${R * .12} ${R * .3}`, "stroke-linecap": "round" }, this.trails); }
    }
    render(k) {
      const st = this.s.steps[this.i], e = ease(k), R = this.R;
      for (const id in this.pl) { const p = this.pl[id]; if (st) { p.x = lerp(p.sx, p.ex, e); p.y = lerp(p.sy, p.ey, e); } p.g.setAttribute("transform", `translate(${p.x},${p.y})`); }
      let scale = 1, lift = 0;
      if (st && st.p !== undefined) {
        const kk = st.loft ? k : e;
        this.bx = lerp(this.bsx, this.bex, kk); this.by = lerp(this.bsy, this.bey, kk);
        if (st.loft) { const h = Math.sin(Math.PI * k); scale = 1 + .9 * h; lift = h * R * 2.2; }
      } else if (this.holder) { const p = this.pl[this.holder]; this.bx = p.x + R * .95; this.by = p.y + R * .55; }
      this.ballEl.setAttribute("cx", this.bx); this.ballEl.setAttribute("cy", this.by - lift); this.ballEl.setAttribute("r", R * .45 * scale);
      this.shadow.setAttribute("cx", this.bx); this.shadow.setAttribute("cy", this.by + R * .2); this.shadow.setAttribute("fill-opacity", lift ? .3 : 0);
      const tot = this.s.steps.length; this.prog.style.width = ((this.i + (st ? k : 0)) / tot * 100) + "%";
    }
    finishStep() {
      const st = this.s.steps[this.i];
      if (st && st.p !== undefined) { this.holder = typeof st.p === "string" ? st.p : null; if (this.holder) { const p = this.pl[this.holder]; this.bx = p.x + this.R * .95; this.by = p.y + this.R * .55; } }
      this.i++; this.t = 0;
      if (this.i >= this.s.steps.length) { this.done = true; this.hold = 0; } else this.prepare();
    }
    stepOnce() {
      if (this.done) this.reset();
      this.render(1); this.finishStep(); this.render(0);
    }
    play() {
      if (this.playing) return; this.playing = true; this.btn.textContent = "❚❚"; this.btn.setAttribute("aria-label", "Pause");
      let last = performance.now();
      const tick = now => {
        if (!this.playing) return;
        const dt = Math.min(.05, (now - last) / 1000) * this.speed; last = now;
        if (this.done) { this.hold += dt; if (this.hold > 1.6) this.reset(); }
        else {
          const st = this.s.steps[this.i]; this.t += dt; const T = st.t || 1;
          if (this.t >= T + .25) { this.render(1); this.finishStep(); }
          else this.render(Math.min(1, this.t / T));
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    pause() { this.playing = false; cancelAnimationFrame(this.raf); this.btn.textContent = "▶"; this.btn.setAttribute("aria-label", "Play"); }
  }

  // ---------------- Drill specs ----------------
  const A = (x, y, l = "", d) => ["A", x, y, l, d], B = (x, y, l = "", d) => ["B", x, y, l, d],
        N = (x, y, l = "N") => ["N", x, y, l], G = (x, y) => ["G", x, y, "GK"];
  const D = {};

  D["11p1"] = { title: "FIFA 11+ Part 1", w: 32, h: 14,
    cones: [3, 8, 13, 18, 23, 28].flatMap(x => [[x, 4], [x, 10]]),
    players: { a: A(1, 4), b: A(1, 10), c: A(-0.5, 2.5), d: A(-0.5, 11.5) },
    steps: [
      { t: 3, m: { a: [29, 4], b: [29, 10] }, cap: "1 · Jog straight ahead: partners run the course side by side (2 sets)." },
      { t: 1.8, m: { a: [30.5, 1.5], b: [30.5, 12.5] }, cap: "Jog back on the outside of the cones." },
      { t: 1.8, m: { a: [1, 4], b: [1, 10] } },
      { t: .8, m: { a: [5.5, 6.5], b: [5.5, 7.5] }, cap: "2 · Shoulder contact: side-step in, jump and touch shoulders, land on both feet." },
      { t: .6, m: { a: [8, 4], b: [8, 10] } },
      { t: .8, m: { a: [10.5, 6.5], b: [10.5, 7.5] } },
      { t: .6, m: { a: [13, 4], b: [13, 10] } },
      { t: .8, m: { a: [15.5, 6.5], b: [15.5, 7.5] } },
      { t: .6, m: { a: [18, 4], b: [18, 10] } },
      { t: .7, m: { a: [23, 4], b: [23, 10] }, cap: "3 · Quick forwards & backwards: sprint 2 cones, backpedal 1, repeat." },
      { t: .7, m: { a: [18, 4], b: [18, 10] } },
      { t: .9, m: { a: [28, 4], b: [28, 10] } },
      { t: 1, m: { c: [1, 4], d: [1, 10] }, cap: "Next pair starts when the first pair reaches the 2nd cone. Knees over toes on every landing." },
    ] };

  D["mob"] = { title: "Jog & Dynamic Mobility Lines", w: 30, h: 16,
    cones: [[1, 1], [1, 15], [29, 1], [29, 15]],
    players: { a: A(2, 3), b: A(2, 6.3), c: A(2, 9.6), d: A(2, 12.9) },
    steps: [
      { t: 2.6, m: { a: [28, 3], b: [28, 6.3], c: [28, 9.6], d: [28, 12.9] }, cap: "Jog across the width as a line of 4." },
      { t: 2.6, m: { a: [2, 3], b: [2, 6.3], c: [2, 9.6], d: [2, 12.9] }, cap: "High knees, then heel flicks on the way back." },
      { t: 3.6, m: { a: [28, 3], b: [28, 6.3], c: [28, 9.6], d: [28, 12.9] }, cap: "Leg swings and walking lunges with rotation (slow, full range)." },
      { t: 2.6, m: { a: [2, 3.6], b: [2, 6.9], c: [2, 10.2], d: [2, 13.5] }, cap: "Carioca / lateral shuffle back." },
      { t: 1.7, m: { a: [28, 3], b: [28, 6.3], c: [28, 9.6], d: [28, 12.9] }, cap: "Progressive run: build to about 75% speed." },
    ] };

  D["diamond"] = { title: "Diamond Passing with Follow Runs", w: 20, h: 20,
    cones: [[10, 2], [18, 10], [10, 18], [2, 10]],
    players: { a: A(10, 18, "A"), a2: A(11.6, 19.6, ""), b: A(2, 10, "B"), c: A(10, 2, "C"), d: A(18, 10, "D") },
    ball: "a",
    steps: [
      { t: .6, m: { b: [1, 12] }, cap: "B checks away from his cone…" },
      { t: .9, m: { b: [4, 11] }, p: "b", cap: "…then towards the ball: A plays into B." },
      { t: .8, m: { a: [9, 15] }, p: "a", cap: "B lays it back (bounce) to A, who has stepped forward." },
      { t: 1.1, m: { c: [10, 5] }, p: "c", cap: "A plays the longer pass up to C, who checks in." },
      { t: 1.2, m: { a: [8.4, 3.2], b: [2, 10], d: [16, 10] }, p: "d", cap: "C plays to D. Every player follows his pass to the next cone." },
      { t: .9, m: { c: [17, 8.4], a2: [10, 18] }, cap: "Next player steps in at the start cone. Switch direction every 2 minutes." },
    ] };

  D["react"] = { title: "Reaction Sprint Games", w: 22, h: 15,
    cones: [[2, 1], [2, 14], [20, 1], [20, 14]],
    players: { c: N(11, 1, "C"), a1: A(9.8, 4), b1: B(12.2, 4), a2: A(9.8, 8), b2: B(12.2, 8), a3: A(9.8, 12), b3: B(12.2, 12) },
    steps: [
      { t: .8, cap: "Pairs face each other 2 m apart. Coach calls a colour…" },
      { t: 1.1, m: { a1: [2.5, 4], a2: [2.5, 8], a3: [2.5, 12], b1: [4.2, 4.3], b2: [4.6, 8.2], b3: [3.6, 11.7] }, cap: "“BLUE!” Blue sprints to his line; red chases and tries to tag." },
      { t: 1.6, m: { a1: [9.8, 4], a2: [9.8, 8], a3: [9.8, 12], b1: [12.2, 4], b2: [12.2, 8], b3: [12.2, 12] }, cap: "Walk back: full recovery between reps." },
      { t: 1.1, m: { b1: [19.5, 4], b2: [19.5, 8], b3: [19.5, 12], a1: [18, 4.3], a2: [17.6, 8.2], a3: [18.3, 11.7] }, cap: "“RED!” Now red sprints and blue chases." },
      { t: 1.6, m: { a1: [9.8, 4], a2: [9.8, 8], a3: [9.8, 12], b1: [12.2, 4], b2: [12.2, 8], b3: [12.2, 12] }, cap: "Variations: start lying down, sitting, or back-to-back." },
    ] };

  D["gates"] = { title: "Gate Dribbling", w: 25, h: 25,
    cones: [[4, 4], [6, 4], [12, 3], [14, 3], [20, 5], [22, 5], [3, 12], [3, 14], [21, 13], [21, 15], [6, 21], [8, 21], [13, 20], [15, 20], [20, 21], [22, 21]],
    players: { a: A(9, 8, "", 1), b: A(16, 9, "", 1), c: A(8, 16, "", 1), d: A(16, 17, "", 1), e: A(12, 12, "", 1) },
    steps: [
      { t: 1.3, m: { a: [5, 2.5], b: [21, 3.5], c: [1.5, 13], d: [21, 19], e: [14, 18.5] }, cap: "Dribble through as many gates as you can in 45 seconds." },
      { t: 1.3, m: { a: [5, 7], b: [18, 9], c: [6, 14], d: [21, 23], e: [14, 22] } },
      { t: 1.3, m: { a: [13, 1], b: [21, 11.5], c: [7, 22.5], d: [14.5, 21.5], e: [11, 16] }, cap: "Progression: perform a turn right after each gate." },
      { t: 1.3, m: { a: [13, 6], b: [24, 14], c: [7, 18], d: [14, 17], e: [9, 10] }, cap: "Scan for the next free gate before you reach the current one; change pace after each gate." },
    ] };

  D["mirror"] = { title: "1v1 Mirror Game", w: 20, h: 16,
    cones: [[3, 3], [3, 7], [17, 3], [17, 7], [3, 9.5], [3, 13.5], [17, 9.5], [17, 13.5]],
    players: { a: A(10, 4, "", 1), d: B(10, 6.8), a2: A(10, 10.5, "", 1), d2: B(10, 13.3) },
    steps: [
      { t: .6, m: { a: [7.5, 4], d: [8, 6.8], a2: [12.5, 10.5], d2: [12, 13.3] }, cap: "Leader (blue, with ball) feints and moves along his line." },
      { t: .5, m: { a: [11, 4], d: [10.5, 6.8], a2: [9, 10.5], d2: [9.6, 13.3] }, cap: "Partner mirrors: side-on, short steps, eyes on the ball." },
      { t: .4, m: { a: [9.5, 4], d: [10, 6.8], a2: [11, 10.5], d2: [10.6, 13.3] } },
      { t: .7, m: { a: [16.5, 4.5], d: [15, 6.8], a2: [3.5, 11], d2: [5.5, 13.3] }, cap: "Burst for a gate. Blue scores if he gets there first. 30 s work / 30 s rest, then swap." },
      { t: 1, m: { a: [10, 4], d: [10, 6.8], a2: [10, 10.5], d2: [10, 13.3] } },
    ] };

  D["long"] = { title: "Long Passing in Pairs & Threes", w: 40, h: 18,
    players: { p1: A(4, 4, "1"), p2: A(36, 4, "2"), t1: A(4, 13, "A"), t2: A(20, 13, "B"), t3: A(36, 13, "C") },
    ball: "p1",
    steps: [
      { t: 1.2, p: "p2", cap: "Driven pass along the ground: ankle locked, strike through the middle of the ball." },
      { t: 1.6, p: "p1", loft: true, cap: "Lofted pass back: lean back slightly, strike below centre." },
      { t: .7, set: "t1", m: { t2: [18, 13.5] }, p: "t2", cap: "Threes: A plays into B (the set player)…" },
      { t: .6, m: { t1: [6, 12.5] }, p: "t1", cap: "…B sets it back…" },
      { t: 1.6, p: "t3", loft: true, cap: "…and A switches long to C. Rotate positions every 2 minutes." },
    ] };

  D["11p2"] = { title: "FIFA 11+ Part 2 Stations", w: 30, h: 16,
    texts: [[5, 1.6, "PLANK"], [15, 1.6, "SIDE PLANK"], [25, 1.6, "NORDICS"], [25, 15.4, "BALANCE"], [15, 15.4, "SQUATS"], [5, 15.4, "JUMPS"]],
    cones: [[5, 4], [15, 4], [25, 4], [25, 12], [15, 12], [5, 12]],
    players: { a: A(4, 6), b: A(6, 6), c: A(14, 6), d: A(16, 6), e: A(24, 6), f: A(26, 6), g: A(24, 10), h: A(26, 10), i: A(14, 10), j: A(16, 10), k: A(4, 10), l: A(6, 10) },
    steps: [
      { t: 1.4, cap: "Pairs at 6 stations: plank 3 × 20 s, side plank, Nordic hamstrings 3–5 reps, single-leg balance passing, squats, jumps." },
      { t: 1.2, m: { a: [14, 6], b: [16, 6], c: [24, 6], d: [26, 6], e: [24, 10], f: [26, 10], g: [14, 10], h: [16, 10], i: [4, 10], j: [6, 10], k: [4, 6], l: [6, 6] }, cap: "Rotate clockwise on the whistle (about 1 minute per station)." },
      { t: 1.4, cap: "Quality over quantity: core braced, knees over toes, soft landings." },
      { t: 1.2, m: { a: [24, 6], b: [26, 6], c: [24, 10], d: [26, 10], e: [14, 10], f: [16, 10], g: [4, 10], h: [6, 10], i: [4, 6], j: [6, 6], k: [14, 6], l: [16, 6] } },
    ] };

  D["tag"] = { title: "Partner Tag", w: 15, h: 15,
    cones: [[0, 0], [15, 0], [0, 15], [15, 15]],
    players: { a1: A(4, 4), b1: B(2, 2), a2: A(11, 7), b2: B(13, 5), a3: A(6, 11), b3: B(4, 13) },
    steps: [
      { t: .7, m: { a1: [7, 2.5], b1: [4.5, 3], a2: [9, 10], b2: [11, 7.5], a3: [9, 12.5], b3: [6.5, 12] }, cap: "Blue evades, red chases (20 s)." },
      { t: .5, m: { a1: [5, 6], b1: [6.2, 3.5], a2: [12.5, 11], b2: [10.5, 9.5], a3: [7.5, 9], b3: [8.5, 12] }, cap: "Sharp cuts: plant the outside foot and change direction." },
      { t: .6, m: { a1: [9, 5], b1: [5.5, 5.4], a2: [13, 6], b2: [12, 10.5], a3: [3, 9], b3: [6.8, 9.5] } },
      { t: 1.2, cap: "Swap roles. Between rounds: lunges and hip openers." },
    ] };

  D["passing_square"] = { title: "Passing Square with Third-Man Run", w: 20, h: 20,
    cones: [[2, 2], [18, 2], [18, 18], [2, 18], [10, 10]],
    players: { a: A(2, 18, "A"), b: A(10, 11.5, "B"), c: A(18, 2, "C"), d: A(2, 2, "D") },
    ball: "a",
    steps: [
      { t: .6, m: { b: [8.5, 13] }, cap: "B checks off the central cone to show for the ball." },
      { t: .8, p: "b", cap: "A plays into B's front foot." },
      { t: 1, m: { a: [10, 9] }, p: "d", cap: "B bounces the ball to D while A sets off on the third-man run." },
      { t: 1, m: { a: [13, 5] }, p: "a", cap: "D finds A in stride: A is the third man." },
      { t: .9, p: "c", cap: "A plays on to C. Everyone rotates to the next position." },
      { t: 1, m: { a: [10, 11.5], b: [2, 2], d: [2, 18] }, cap: "Work both directions; add a passive defender in the middle after 10 minutes." },
    ] };

  D["poss433"] = { title: "4v4 + 3 Neutrals Possession", w: 30, h: 25,
    players: { b1: A(5, 19), b2: A(12, 7), b3: A(21, 10), b4: A(25, 20), r1: B(9, 15), r2: B(16, 12), r3: B(22, 16), r4: B(15, 5), n1: N(15, 0.5), n2: N(15, 24.5), n3: N(15, 17) },
    ball: "b1",
    steps: [
      { t: .9, m: { r1: [8, 17] }, p: "n3", cap: "Blue + 3 neutrals (yellow) = 7 v 4. Count consecutive passes." },
      { t: .9, m: { r2: [15, 15], r3: [23, 19] }, p: "b4", cap: "Neutrals play for whichever team has the ball (2 touches max)." },
      { t: .9, m: { b2: [9, 10], r1: [10, 18] }, p: "n2", cap: "Use the end neutrals to change direction." },
      { t: .9, m: { r1: [7, 17.5] }, p: "b1" },
      { t: .9, m: { r4: [12, 7.5] }, p: "b2", cap: "Make the field big when you have the ball." },
      { t: 1, m: { b3: [19, 7], r2: [16, 10] }, p: "n1", cap: "Split pass between two reds to an end neutral." },
      { t: .9, m: { r4: [18, 6] }, p: "b3" },
      { t: .9, m: { r4: [19.5, 7.5], r2: [18.5, 9] }, p: "r4", cap: "Red win it → red now keeps the ball with the neutrals; blue presses. 8 passes = 1 point." },
    ] };

  D["g7v7two"] = { title: "7v7: Two-Touch in Own Half", w: 50, h: 40, half: true,
    goals: [[0, 20, "L"], [50, 20, "R"]],
    texts: [[12.5, 3, "MAX 2 TOUCHES"], [37.5, 3, "FREE"]],
    players: { gk: G(1.5, 20), b1: A(10, 10), b2: A(10, 30), b3: A(18, 20), b4: A(30, 9), b5: A(30, 30), b6: A(38, 20),
               rg: G(48.5, 20), r1: B(40, 12), r2: B(40, 28), r3: B(32, 20), r4: B(22, 12), r5: B(22, 28), r6: B(15, 20) },
    ball: "gk",
    steps: [
      { t: 1, m: { b1: [9, 8], r6: [12, 15] }, p: "b1", cap: "Blue builds from the GK. In your own half: 2 touches maximum." },
      { t: .9, m: { r6: [15, 18], b3: [19, 18] }, p: "b3", cap: "Quick circulation: receive, pass." },
      { t: 1.1, m: { r5: [25, 27] }, p: "b5", cap: "Ball crosses halfway…" },
      { t: 1.3, m: { b5: [38, 32], r2: [37, 29], b6: [40, 22] }, cap: "…and now the receiver can dribble freely in the opponent's half." },
      { t: .8, m: { b6: [41, 21], r3: [36, 21] }, p: "b6" },
      { t: .7, p: [50, 18.5], cap: "Goal after 5+ passes counts double." },
    ] };

  D["ch1v1"] = { title: "1v1 Channels to Mini-Goals", w: 30, h: 24, zones: [["h", 8], ["h", 16]],
    goals: [[30, 4, "R", 1], [0, 4, "L", 1], [30, 12, "R", 1], [0, 12, "L", 1], [30, 20, "R", 1], [0, 20, "L", 1]],
    players: { a: A(3, 4), d: B(27, 4), q1: A(1, 10.5), q2: B(29, 10.5), q3: A(1, 18.5), q4: B(29, 18.5) },
    ball: "d",
    steps: [
      { t: 1, p: "a", cap: "Defender serves to the attacker…" },
      { t: 1.1, m: { d: [18, 4], a: [9, 4.5] }, cap: "…and sprints to close him down. Attacker drives forward." },
      { t: .6, m: { d: [15.5, 4], a: [12, 5.8] }, cap: "Defender slows down: side-on, short steps, show him outside." },
      { t: .4, m: { a: [12.5, 3], d: [14.8, 4.7] }, cap: "Attacker sells a feint…" },
      { t: .7, m: { a: [19, 2], d: [15, 3.4] }, cap: "…and explodes past with a change of pace." },
      { t: .6, p: [30, 4], cap: "Score in the mini-goal. If the defender wins it, he counters into the other goal. Rotate roles." },
    ] };

  D["wide2v1"] = { title: "2v1 Wide Overload to Goal", w: 36, h: 40, boxes: ["R"], zones: [["h", 10]],
    goals: [[36, 20, "R"]],
    players: { w: A(6, 5, "W"), fb: A(3, 8.5, "FB"), d: B(16, 6), st: A(14, 26, "ST"), gk: G(34.5, 20) },
    ball: "w",
    steps: [
      { t: 1, m: { w: [12, 5], d: [15, 5.5] }, cap: "Winger drives at the defender to commit him." },
      { t: 1, m: { fb: [14, 2], d: [13.5, 5.3] }, cap: "Full-back starts his overlap late and fast, calling “Yes!”" },
      { t: .8, m: { fb: [21, 2] }, p: "fb", cap: "Release the overlap as soon as the defender is committed." },
      { t: 1.1, m: { fb: [31, 5], st: [29, 18], d: [20, 8] }, cap: "Full-back drives to the byline; striker attacks the near post with a curved run." },
      { t: .7, m: { st: [31.5, 19] }, p: "st", cap: "Cross or cut-back…" },
      { t: .5, p: [36, 21.5], cap: "…finish! Progression: add a recovering defender 5 m behind." },
    ] };

  D["g6v6"] = { title: "6v6 Game: 1v1 Bonus", w: 50, h: 40,
    goals: [[0, 20, "L"], [50, 20, "R"]],
    players: { gk: G(1.5, 20), b1: A(12, 12), b2: A(12, 28), b3: A(22, 20), b4: A(32, 8), b5: A(35, 28), rg: G(48.5, 20), r1: B(42, 14), r2: B(42, 26), r3: B(33, 19), r4: B(25, 12), r5: B(22, 30) },
    ball: "b3",
    steps: [
      { t: 1, m: { b4: [33, 6] }, p: "b4", cap: "Ball into the winger's feet." },
      { t: .8, m: { b4: [37, 7], r1: [40, 10] }, cap: "Take the defender on 1v1." },
      { t: .5, m: { b4: [38, 9.5], r1: [39.5, 9] } },
      { t: .8, m: { b4: [43, 13], r1: [40, 9.5], r2: [43, 20] }, cap: "Beat him with the change of direction…" },
      { t: .6, p: [50, 17.5], cap: "…goal straight after beating a player 1v1 counts double. A clean 1v1 win by a defender = 1 point." },
    ] };

  D["threezone"] = { title: "Three-Zone Switch Game", w: 45, h: 30, zones: [["v", 15], ["v", 30]],
    texts: [[7.5, 2.4, "END ZONE"], [22.5, 2.4, "MIDDLE"], [37.5, 2.4, "END ZONE"]],
    players: { b1: A(4, 22), b2: A(9, 10), b3: A(12, 18), b4: A(33, 22), b5: A(40, 10), b6: A(36, 16),
               r1: B(7, 16), r2: B(10, 24), m1: B(18, 10), m2: B(22, 20), m3: B(26, 14), m4: B(21, 4) },
    ball: "b1",
    steps: [
      { t: .9, m: { r1: [7, 13], r2: [8, 19] }, p: "b2", cap: "Blue keep the ball in the end zone: 4 passes…" },
      { t: .9, m: { r1: [10, 14], r2: [11, 20] }, p: "b3", cap: "Two reds press in the zone, four wait in the middle." },
      { t: .9, m: { r1: [7, 19], b1: [3, 26] }, p: "b1" },
      { t: .9, m: { r2: [8, 22], b3: [12, 15] }, p: "b3", cap: "Draw the press in…" },
      { t: 1.6, m: { m3: [28, 16], m2: [25, 21] }, p: "b6", loft: true, cap: "…then switch over the middle = 1 point." },
      { t: 1, m: { m3: [33, 15], m2: [32, 19] }, cap: "Middle defenders may send two players into the zone with the ball. Keep it, switch back." },
    ] };

  D["g8v8switch"] = { title: "8v8: Switch Bonus", w: 60, h: 45,
    goals: [[0, 22.5, "L"], [60, 22.5, "R"]],
    players: { gk: G(1.5, 22.5), c1: A(12, 15), c2: A(12, 30), lb: A(22, 40, "FB"), rb: A(22, 6), m1: A(28, 18), m2: A(30, 32), st: A(42, 24),
               rg: G(58.5, 22.5), r1: B(48, 18), r2: B(48, 30), r3: B(38, 10), r4: B(36, 22), r5: B(36, 34), r6: B(28, 8), r7: B(30, 24) },
    ball: "rb",
    steps: [
      { t: 1, m: { r6: [24, 7], r7: [27, 12], r4: [33, 15], r3: [36, 8] }, p: "m1", cap: "Opponents squeeze the ball side: 3+ reds near the ball. That's the cue." },
      { t: .9, m: { r7: [29, 16] }, p: "c1", cap: "Play back to the centre-back…" },
      { t: 1.6, m: { lb: [30, 40] }, p: "lb", loft: true, cap: "…who switches early to the high, wide full-back." },
      { t: 1.2, m: { lb: [44, 41], r5: [42, 36], st: [50, 24], m2: [46, 30] }, cap: "Full-back attacks the space before the defence shifts." },
      { t: .7, m: { st: [53, 23] }, p: "st" },
      { t: .5, p: [60, 21], cap: "Goal within 15 seconds of the switch counts double." },
    ] };

  D["twovtwo"] = { title: "2 v 1 + Recovering Defender", w: 25, h: 20,
    zones: [["v", 24.5]],
    texts: [[23, 1.8, "SCORE"]],
    players: { a1: A(3, 7), a2: A(3, 13), d1: B(15, 10, "1"), d2: B(1, 1.5, "2") },
    ball: "a1",
    steps: [
      { t: 1, m: { a1: [9, 8], a2: [8, 13.5], d1: [16, 9.5], d2: [8, 3] }, cap: "Attackers go 2v1. Defender 1 delays: he doesn't dive in." },
      { t: .9, m: { a2: [11, 14], d1: [15, 12], d2: [13, 6] }, p: "a2", cap: "Defender 2 sprints back to recover…" },
      { t: .8, m: { a2: [13.5, 14.5], d1: [14.6, 13.8], d2: [17, 10] }, cap: "…and takes the cover position at 45° behind the pressing defender." },
      { t: .5, p: "d1", cap: "Pressure + cover: the 2v1 becomes a 2v2 and the defenders win the ball." },
      { t: 1, m: { d1: [6, 13], a2: [11, 13.5] }, cap: "Win it and counter over the other end line. Communicate: “Ball!” / “Cover!”" },
    ] };

  D["ppb"] = { title: "Defending: Pressure – Cover – Balance", w: 35, h: 30,
    cones: [[0, 0], [0, 30], [35, 0], [35, 30]],
    texts: [[8, 2.6, "◀ RED DEFEND THIS LINE"]],
    players: { a1: A(28, 15), a2: A(30, 24), a3: A(30, 6), a4: A(33, 15),
               d1: B(24, 15, "P"), d2: B(20, 19, "C"), d3: B(19, 10, "B"), d4: B(12, 15, "D") },
    ball: "a1",
    steps: [
      { t: .8, cap: "Red defend the left end line. P = pressure, C = cover, B = balance, D = depth." },
      { t: 1.1, m: { d1: [21, 18], d2: [26, 22], d3: [17, 13], d4: [13, 18] }, p: "a2", lab: { d1: "C", d2: "P", d3: "B" }, cap: "Ball moves: the nearest player becomes the new pressure, the others re-arrange." },
      { t: 1.1, m: { d1: [24, 15], d2: [20, 19], d3: [19, 10], d4: [12, 15] }, p: "a1", lab: { d1: "P", d2: "C", d3: "B" }, cap: "Pressure 1–2 m from the ball; cover 4–6 m behind at an angle." },
      { t: 1.1, m: { d1: [22, 12], d2: [18, 16], d3: [26, 8], d4: [13, 12] }, p: "a3", lab: { d1: "C", d2: "B", d3: "P" }, cap: "Balance: the far defender tucks in to protect the space behind." },
      { t: .7, m: { a3: [27.5, 7.5], d3: [26.5, 7.8] }, cap: "Force the attacker one way…" },
      { t: .5, p: "d3", cap: "…and win it." },
      { t: 1, m: { d3: [34, 6], d1: [30, 12] }, cap: "On a regain, red counter over the far end line." },
    ] };

  D["g7v7def"] = { title: "7v7: Win it back within 5 seconds", w: 50, h: 40,
    goals: [[0, 20, "L"], [50, 20, "R"]],
    players: { gk: G(1.5, 20), b1: A(12, 12), b2: A(12, 28), b3: A(22, 20), b4: A(32, 10), b5: A(32, 30), b6: A(40, 20),
               rg: G(48.5, 20), r1: B(42, 12), r2: B(42, 28), r3: B(34, 20), r4: B(26, 12), r5: B(26, 28), r6: B(18, 20) },
    ball: "b3",
    steps: [
      { t: .9, p: "b5", cap: "Blue attack…" },
      { t: .6, m: { r2: [36, 29] }, p: "r2", cap: "…and lose the ball. The 5-second clock starts." },
      { t: .9, m: { b5: [35, 28], b6: [38, 25], b3: [30, 24], r2: [37, 27] }, cap: "Immediate reaction: nearest players press, others lock nearby passing options." },
      { t: .5, p: "b6", cap: "Won back inside 5 seconds = 1 point." },
      { t: .8, m: { b6: [44, 22] }, cap: "Goal within 10 s of a regain counts double." },
      { t: .5, p: [50, 18] },
    ] };

  window.DRILLS = D;
  window.mountDrill = function (host, key) {
    const spec = D[key]; if (!spec) return null;
    const d = new Drill(host, spec);
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !d.userPaused) d.play(); else if (!e.isIntersecting) d.pause();
      }), { threshold: .4 });
      io.observe(host); d._io = io;
      host.querySelector(".d-play").addEventListener("click", () => { d.userPaused = !d.playing; });
    }
    return d;
  };
})();
