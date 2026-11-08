(function () {
  const P = window.PLAN, S = P.sessions;
  const START = new Date(2026, 10, 7);
  const dateOf = w => new Date(START.getTime() + (w - 1) * 7 * 864e5);
  const fmt = d => d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PH = { 1: ["Foundation", "Weeks 1–5"], 2: ["Game Model Development", "Weeks 6–10"], 3: ["Tactical Integration", "Weeks 11–15"], 4: ["Competition Preparation", "Weeks 16–20"] };
  const hasAnim = s => s.blocks.some(b => b.anim || (b.exercises || []).some(e => e.anim));
  const ANIM_WEEKS = [2, 3, 4, 5];
  const app = document.getElementById("app"), side = document.getElementById("side");

  function nextSession() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return S.find(s => dateOf(s.week) >= today) || null;
  }

  // ---------- Sidebar ----------
  function renderSide(active) {
    let h = `<a href="#home" class="${active === "home" ? "on" : ""}"><b>⌂</b><span>Season home</span></a>
      <a href="#overview" class="${active === "overview" ? "on" : ""}"><b>i</b><span>Plan overview & safety</span></a>
      <a href="#videos" class="${active === "videos" ? "on" : ""}"><b>▶</b><span>Video library</span></a>`;
    for (const k of [1, 2, 3, 4]) {
      h += `<h4>${PH[k][0]}</h4>`;
      S.filter(s => s.phase === k).forEach(s => {
        h += `<a href="#week-${s.week}" class="${active === "week-" + s.week ? "on" : ""}"><b>${s.week}</b><span>${esc(s.theme.split(":")[0])}${ANIM_WEEKS.includes(s.week) ? '<i class="anim-dot" title="Animated drills"></i>' : ""}<span class="dt">${fmt(dateOf(s.week))}</span></span></a>`;
      });
    }
    side.innerHTML = h;
  }

  // ---------- Pages ----------
  function home() {
    const n = nextSession();
    let h = `<div class="col stack">
      <div class="hero"><span class="eyebrow">${esc(P.team)} · Winter block</span>
        <h1>20-week training plan</h1>
        <p class="muted">Saturdays, Nov 7, 2026 – Mar 20, 2027 · 90-minute sessions · Building towards the June tournament.</p></div>`;
    if (n) h += `<a class="card next" href="#week-${n.week}" style="text-decoration:none;color:inherit">
        <div class="big">W${n.week}</div>
        <div><span class="eyebrow">Next session · ${fmt(dateOf(n.week))}</span><h2>${esc(n.theme)}</h2>
        <div class="chips" style="margin-top:6px"><span class="chip ph${n.phase}">${PH[n.phase][0]}</span><span class="chip">${esc(n.rpe)}</span>${ANIM_WEEKS.includes(n.week) ? '<span class="chip anim">Animated drills</span>' : ""}</div></div>
        <span class="btn">Open →</span></a>`;
    h += `<h2>Phases</h2><div class="phases">${[1, 2, 3, 4].map(k => `<div class="card" style="border-top:5px solid var(--p${k})"><span class="eyebrow">${PH[k][1]}</span><h3>${PH[k][0]}</h3></div>`).join("")}</div>
      <h2>All sessions</h2><div class="weeks">${S.map(s => `<a class="card wk ph${s.phase}" href="#week-${s.week}">
        <span class="eyebrow">${fmt(dateOf(s.week))}</span><span class="n">Week ${s.week}</span><span>${esc(s.theme)}</span>
        <div class="chips">${ANIM_WEEKS.includes(s.week) ? '<span class="chip anim">Animated</span>' : ""}<span class="chip">${s.videos.length} videos</span></div></a>`).join("")}</div></div>`;
    return h;
  }

  function overview() {
    const li = a => `<ul class="tight">${a.map(x => `<li>${x}</li>`).join("")}</ul>`;
    return `<div class="col stack">
      <div class="hero"><span class="eyebrow">${esc(P.team)}</span><h1>Plan overview & safety</h1></div>
      <div class="card"><h2>Assumptions</h2>${li([
        "Squad of 18 players (16 outfield + 2 goalkeepers), U16 boys.",
        "Saturday sessions from November 7, 2026, in an indoor dome. Spaces assume at least half a full-size field; scale down if the facility is smaller.",
        "Staff: head coach, assistant coach and, ideally, a goalkeeper coach who runs GK work during technical blocks.",
        "Team formation and game model: 1-4-3-3 (adaptable to 1-4-2-3-1).",
        "The team completed two sessions before November 7, so Week 1 goes straight into training.",
        "Dec 26 and Jan 2 are reduced-load holiday sessions; attendance may be lower.",
        "Players do a 20-minute home programme (ball mastery + aerobic run) once more each week."])}</div>
      <div class="card"><h2>Ontario requirements & player safety</h2>${li([
        "<b>Rowan's Law:</b> players, parents and coaches review approved concussion-awareness resources each year and the club's Concussion Code of Conduct. Any player with a suspected concussion is removed immediately and follows the club's Removal-from-Sport and Return-to-Sport protocols.",
        "Staff hold the certifications, screening and safe-sport training required by Ontario Soccer and the club. The Rule of Two applies to all interactions with players.",
        "FIFA 11+ exercises appear in about half the warm-ups; the others keep its principles (progressive load, landing mechanics, change of direction).",
        "First-aid kit, emergency action plan and player medical/contact information on site at every session.",
        "Hydration breaks in every session; reduce load for players returning from illness or injury."])}</div>
      <div class="card"><h2>Game model: the four moments</h2>
        <table class="tt"><tbody>
        <tr><td>In possession</td><td style="text-align:left">Build out through the GK and CBs; angles and width; play forward when possible; switch when the ball side is overloaded; combinations in the final third; 3 players in the box on crosses.</td></tr>
        <tr><td>Out of possession</td><td style="text-align:left">Pressure–cover–balance; compact block (10–15 m between lines); press as a unit on triggers; force play wide.</td></tr>
        <tr><td>Attack → defence</td><td style="text-align:left">Five-second counter-press; nearest player presses, others recover goal-side; rest-defence of 2 behind the ball.</td></tr>
        <tr><td>Defence → attack</td><td style="text-align:left">First look forward; runners beyond the ball; score within 8–10 seconds when the opponent is disorganised.</td></tr>
        </tbody></table></div>
      <div class="card"><h2>Standard session (90 min)</h2>
        <table class="tt"><thead><tr><th>Time</th><th>Block</th><th></th></tr></thead><tbody>
        <tr><td>0:00–0:20</td><td style="text-align:left">Warm-up: 2–3 exercises, varied weekly</td><td>20</td></tr>
        <tr><td>0:20–0:40</td><td style="text-align:left">Technical / skill activity</td><td>20</td></tr>
        <tr><td>0:40–1:05</td><td style="text-align:left">Tactical / opposed activity</td><td>25</td></tr>
        <tr><td>1:05–1:25</td><td style="text-align:left">Conditioned or free game</td><td>20</td></tr>
        <tr><td>1:25–1:30</td><td style="text-align:left">Cool-down & review</td><td>5</td></tr></tbody></table>
        <p class="muted" style="margin:8px 0 0">Exact timings vary by week; each week page shows its own timetable.</p></div>
      <div class="card"><h2>Bridge to the June tournament</h2>
        <p>This block ends March 20, 2027, leaving roughly 10–12 weeks before June.</p>${li([
        "<b>Late March – April:</b> move outdoors, adapt to full-size distances, add a second weekly session if possible, and repeat key sessions (Weeks 11, 14, 16) at full-field scale.",
        "<b>May:</b> 2–4 exhibition matches; rehearse line-ups, substitutions and set pieces; repeat the tournament simulation (Week 18) on a full field; repeat the Week 20 skills check.",
        "<b>Final 7–10 days:</b> cut training volume by about 40–50%, keep intensity short and sharp; finalise penalty takers and set-piece roles.",
        "<b>Tournament days:</b> same warm-up routine, recovery between games, short focused team talks."])}</div>
    </div>`;
  }

  function videoCard(v) {
    return `<a class="card vid" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">
      <div class="thumb"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"></div>
      <div class="body"><b>${esc(v.title)}</b><small>${esc(v.why)}</small><small style="color:var(--turf);font-weight:600">Watch on YouTube ↗</small></div></a>`;
  }

  function videos() {
    return `<div class="col stack"><div class="hero"><span class="eyebrow">${esc(P.team)}</span><h1>Video library</h1>
      <p class="muted">Short coaching videos that show the main ideas and drills for each week. They open on YouTube. These are third-party videos: preview before showing them to players.</p></div>
      ${S.map(s => `<section class="stack"><h2><a href="#week-${s.week}">Week ${s.week}</a> · ${esc(s.theme)}</h2><div class="vids">${s.videos.map(videoCard).join("")}</div></section>`).join("")}</div>`;
  }

  const legend = `<div class="legend"><span><i style="background:#1f5fbf"></i>Blue team</span><span><i style="background:#d03a3a"></i>Red team</span><span><i style="background:#f2c230"></i>Neutral / coach</span><span><i style="background:#1d1d1d"></i>Goalkeeper</span><span>— — run · ··· dribble · ━ pass</span></div>`;

  function drillOrDiagram(anim, diag, title) {
    let h = "";
    if (anim) h += `<div class="media"><div data-drill="${anim}"></div></div>`;
    if (diag) h += anim ? `<details class="diag"><summary>Static diagram</summary><div class="media"><img src="diagrams/${diag}.png" alt="Diagram: ${esc(title)}" loading="lazy"></div></details>`
                        : `<div class="media"><img src="diagrams/${diag}.png" alt="Diagram: ${esc(title)}" loading="lazy"></div>`;
    return h;
  }

  function week(n) {
    const s = S[n - 1]; if (!s) return home();
    const prev = n > 1 ? `<a class="btn ghost" href="#week-${n - 1}">← Week ${n - 1}</a>` : "";
    const next = n < 20 ? `<a class="btn ghost" href="#week-${n + 1}">Week ${n + 1} →</a>` : "";
    let h = `<div class="col"><div class="wk-head">
      <span class="eyebrow">Week ${n} · ${fmt(dateOf(n))}</span><h1>${esc(s.theme)}</h1>
      <div class="chips"><span class="chip ph${s.phase}">Phase ${s.phase}: ${PH[s.phase][0]}</span><span class="chip">Intensity ${esc(s.rpe)}</span>${hasAnim(s) ? '<span class="chip anim">Animated drills</span>' : ""}</div>
      <div class="pager">${prev}${next}<a class="btn ghost" href="#week-${n}-videos" data-jump="videos">▶ Videos (${s.videos.length})</a></div></div>
      <div class="stack">`;
    if (s.note) h += `<div class="note"><b>Note:</b> ${esc(s.note)}</div>`;
    h += `<div class="grid2"><div class="card"><h3>Objectives</h3><ul class="tight">${s.obj.map(o => `<li>${esc(o)}</li>`).join("")}</ul></div>
      <div class="card"><h3>Equipment</h3><p style="margin:6px 0 0">${esc(s.equip)}</p></div></div>
      <div class="card"><h3>Timetable</h3><table class="tt"><thead><tr><th>Time</th><th>Activity</th><th>Min</th></tr></thead><tbody>
      ${s.blocks.map((b, i) => `<tr><td>${b.start}–${b.end}</td><td style="text-align:left"><button type="button" data-goto="b${i}">${esc(b.name)}</button></td><td>${b.dur}</td></tr>`).join("")}
      <tr><td>Total</td><td></td><td><b>90</b></td></tr></tbody></table></div>`;
    if (hasAnim(s)) h += legend;
    s.blocks.forEach((b, i) => {
      h += `<section class="card block" id="b${i}"><div class="block-head"><span class="time">${b.start}–${b.end}</span><h2>${esc(b.name)}</h2><span class="muted">${b.dur} min</span></div>`;
      h += `<p style="margin:4px 0"><span class="lbl">Set-up:</span> ${esc(b.setup)}</p>`;
      if (b.exercises) {
        let t = 0;
        b.exercises.forEach((e, k) => {
          const a = t; t += e.min;
          h += `<div class="ex"><h4>${k + 1}. ${esc(e.name)}<span>${e.min} min · 0:${String(a).padStart(2, "0")}–0:${String(t).padStart(2, "0")}</span></h4>
            <p style="margin:4px 0">${esc(e.desc)}</p><ul class="tight">${e.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
            ${drillOrDiagram(e.anim, e.anim ? null : e.diag, e.name)}</div>`;
        });
      } else {
        h += `<p style="margin:4px 0"><span class="lbl">How it works:</span> ${esc(b.how)}</p>
          <p style="margin:8px 0 0" class="lbl">Coaching points</p><ul class="tight">${b.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
        if (b.prog) h += `<p style="margin:8px 0 0"><span class="lbl">Progression:</span> ${esc(b.prog)}</p>`;
        h += drillOrDiagram(b.anim, b.diag, b.name);
      }
      h += `</section>`;
    });
    h += `<section class="stack block" id="vids"><h2>Videos for this week</h2><p class="muted" style="margin:0">Third-party YouTube videos chosen to illustrate this session's ideas. Preview before showing players.</p>
      <div class="vids">${s.videos.map(videoCard).join("")}</div></section>
      <div class="pager">${prev}${next}</div></div></div>`;
    return h;
  }

  // ---------- Router ----------
  let drills = [];
  function route() {
    drills.forEach(d => { d.pause(); d._io && d._io.disconnect(); }); drills = [];
    let hsh = (location.hash || "#home").slice(1);
    let jump = null;
    const m = hsh.match(/^week-(\d+)(?:-videos)?$/);
    if (hsh.endsWith("-videos")) jump = "vids";
    let key = "home", html;
    if (m) { key = "week-" + m[1]; html = week(+m[1]); }
    else if (hsh === "overview") { key = "overview"; html = overview(); }
    else if (hsh === "videos") { key = "videos"; html = videos(); }
    else html = home();
    app.innerHTML = html;
    renderSide(key);
    document.querySelectorAll(".topbar nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + key));
    document.body.classList.remove("menu-open");
    app.querySelectorAll("[data-drill]").forEach(el => { const d = window.mountDrill(el, el.dataset.drill); if (d) drills.push(d); });
    app.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => document.getElementById(b.dataset.goto).scrollIntoView({ behavior: "smooth" }));
    const jv = app.querySelector('[data-jump="videos"]');
    if (jv) jv.onclick = ev => { ev.preventDefault(); document.getElementById("vids").scrollIntoView({ behavior: "smooth" }); };
    if (jump) document.getElementById(jump).scrollIntoView(); else window.scrollTo(0, 0);
    document.title = (key.startsWith("week-") ? `Week ${m[1]} · ` : "") + "RepU16 Training Plan";
  }
  window.addEventListener("hashchange", route);
  document.getElementById("menu").onclick = () => document.body.classList.toggle("menu-open");
  route();
})();
