(function () {
  "use strict";
  var KEY = "mafia-underworld-v1", MAX = 15;
  var REDUCED = false; try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- roles and emblems ---------- */
  var ROLES = {
    mafia: { name: "Mafia", title: "The Shadow", file: "001", color: "#ff6878", glow: "#74202c", tint: "#3a1219", bad: true,
      desc: "Control the night, coordinate in secret, and convince everyone you are innocent.",
      power: "Each night, vote with your crew on a victim. By day, blend in.",
      long: "Work with your Mafia teammates, secretly select a target at night, and hide your identity during the day.", tags: ["DECEPTION", "TEAMWORK", "NIGHT ACTION"] },
    police: { name: "Police", title: "The Investigator", file: "002", color: "#80bdff", glow: "#1b456f", tint: "#12253d",
      desc: "Investigate one player each night and follow the clues to expose the Mafia.",
      power: "Each night, investigate one player and learn whether they are Mafia.",
      long: "Investigate one player each night and use what you learn to help the town identify the Mafia.", tags: ["INVESTIGATION", "LOGIC", "TRUTH"] },
    doctor: { name: "Doctor", title: "The Lifesaver", file: "003", color: "#7de7b4", glow: "#185343", tint: "#103329",
      desc: "Protect a player at night. Your instinct could change the fate of the city.",
      power: "Each night, protect one player. If the Mafia choose them, they survive.",
      long: "Choose one player to protect each night. Predict the Mafia’s target and keep your team alive.", tags: ["PROTECTION", "INSTINCT", "SUPPORT"] },
    citizen: { name: "Citizen", title: "The Unknown", file: "004", color: "#d7aaff", glow: "#563363", tint: "#2c1836",
      desc: "Read the room, question suspicious stories, and vote to uncover the truth.",
      power: "You sleep through the night. By day, talk and vote the Mafia out.",
      long: "Observe conversations, question suspicious stories, and vote to eliminate every Mafia member.", tags: ["OBSERVATION", "DISCUSSION", "VOTING"] }
  };
  var ORDER = ["mafia", "police", "doctor", "citizen"];
  var EMB = {
    mafia: '<ellipse cx="32" cy="43" rx="26" ry="8"/><path d="M18 41c-1-12 2-24 8-26 4-1.500 8-1.500 12 0 6 2 9 14 8 26"/><path d="M18.500 35c8 3 19 3 27 0"/>',
    police: '<path d="M32 6l20 7v16c0 14-8 24-20 29C20 53 12 43 12 29V13z"/><path d="M32 20l3.500 7.200 7.900 1.100-5.700 5.500 1.400 7.800L32 37.800l-7.100 3.800 1.400-7.800-5.700-5.500 7.900-1.100z"/>',
    doctor: '<circle cx="32" cy="32" r="24"/><path d="M32 19v26M19 32h26"/>',
    citizen: '<path d="M10 14c9-4 35-4 44 0 0 21-6 36-22 36S10 35 10 14z"/><path d="M19 25c3-2 7-2 10 0M35 25c3-2 7-2 10 0"/><path d="M22 37c6 5 14 5 20 0"/>',
    unknown: '<circle cx="32" cy="32" r="24"/><path d="M25 25c0-5 3-8 7-8s8 3 8 7c0 7-8 7-8 14"/><path d="M32 46v.5"/>',
    none: '<circle cx="32" cy="32" r="24"/><path d="M15 49L49 15"/>',
    city: '<path d="M6 56V30h12v26M18 56V14h14v42M32 56V24h12v32M44 56V34h12v22"/><path d="M23 22h4M23 30h4M23 38h4"/>',
    people: '<circle cx="24" cy="22" r="8"/><path d="M8 54c0-10 7-16 16-16s16 6 16 16"/><circle cx="46" cy="26" r="6"/><path d="M42 40c8-1 14 4 14 14"/>',
    lock: '<rect x="12" y="28" width="40" height="28" rx="3"/><path d="M20 28V20a12 12 0 0124 0v8"/><path d="M32 38v8"/>'
  };
  function emblem(k, size, color) {
    return '<svg class="emb" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="' + (color || "currentColor") + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EMB[k] + '</svg>';
  }

  /* ---------- state and storage ---------- */
  var SAMPLE = ["Aly", "Zara", "Kabir", "Rohan", "Simran", "Arjun"];
  var INPROG = { deal: 1, night: 1, dawn: 1, day: 1, vote: 1, out: 1 };
  var STORE = loadStore();
  var S = {
    mode: "site", phase: "setup", names: STORE.names, set: STORE.set, draft: "", nameErr: "", quit: false,
    players: [], round: 0, dealIdx: 0, flipped: false, night: null, dawn: null, day: null, sel: null, out: null, winner: null, key: ""
  };
  var tick = null, guardUntil = 0;

  function loadStore() {
    var st = { names: SAMPLE.slice(), set: { mafia: null, doctor: true, police: true, reveal: true, minutes: 3 }, game: null };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        if (Array.isArray(raw.names)) st.names = raw.names.filter(function (n) { return typeof n === "string" && n.trim(); }).map(function (n) { return n.trim().slice(0, 16); }).slice(0, MAX);
        if (raw.set && typeof raw.set === "object") {
          var s = raw.set;
          st.set.mafia = (typeof s.mafia === "number" && s.mafia >= 1 && s.mafia <= 9) ? Math.floor(s.mafia) : null;
          st.set.doctor = s.doctor !== false; st.set.police = s.police !== false; st.set.reveal = s.reveal !== false;
          st.set.minutes = (typeof s.minutes === "number" && s.minutes >= 1 && s.minutes <= 10) ? Math.floor(s.minutes) : 3;
        }
        if (validGame(raw.game)) st.game = raw.game;
      }
    } catch (e) {}
    return st;
  }
  function validGame(g) {
    try {
      if (!g || typeof g !== "object" || !INPROG[g.phase]) return false;
      if (!Array.isArray(g.players) || g.players.length < 4 || g.players.length > MAX) return false;
      var ok = g.players.every(function (p) { return p && typeof p.name === "string" && ROLES[p.role] && typeof p.alive === "boolean"; });
      if (!ok || typeof g.round !== "number" || typeof g.dealIdx !== "number" || g.dealIdx < 0 || g.dealIdx >= g.players.length) return false;
      var n = g.players.length;
      if (g.phase === "night") {
        var nt = g.night;
        if (!nt || !Array.isArray(nt.order) || !Array.isArray(nt.votes) || typeof nt.pos !== "number" || nt.pos < 0 || nt.pos >= nt.order.length) return false;
        if (!nt.order.every(function (i) { return Number.isInteger(i) && i >= 0 && i < n; })) return false;
      }
      if (g.phase === "dawn" && (!g.dawn || typeof g.dawn !== "object")) return false;
      if (g.phase === "day" && (!g.day || typeof g.day.endsAt !== "number")) return false;
      return true;
    } catch (e) { return false; }
  }
  function persist() {
    try {
      STORE.names = S.names; STORE.set = S.set;
      if (S.mode === "game") {
        if (INPROG[S.phase] && S.players.length) STORE.game = { phase: S.phase, players: S.players, round: S.round, dealIdx: S.dealIdx, night: S.night, dawn: S.dawn, day: S.day, out: S.out };
        else if (S.phase === "end") STORE.game = null;
      }
      localStorage.setItem(KEY, JSON.stringify(STORE));
    } catch (e) {}
  }
  function syncResume() {
    var has = !!STORE.game;
    document.querySelectorAll("[data-resume]").forEach(function (b) { b.hidden = !has; });
  }

  /* ---------- game logic ---------- */
  function alive() { var r = []; S.players.forEach(function (p, i) { if (p.alive) r.push(i); }); return r; }
  function allIdx() { return S.players.map(function (p, i) { return i; }); }
  function mafiaCount() { var n = S.names.length; return S.set.mafia == null ? Math.max(1, Math.floor(n / 3)) : S.set.mafia; }
  function plan() {
    var n = S.names.length, m = mafiaCount(), d = S.set.doctor ? 1 : 0, p = S.set.police ? 1 : 0;
    return { n: n, m: m, d: d, p: p, c: n - m - d - p };
  }
  function planOk(x) { return x.n >= 4 && x.m >= 1 && x.c >= 1 && x.m < x.n - x.m; }
  function teams() {
    var m = 0, o = 0;
    S.players.forEach(function (p) { if (p.alive) { if (p.role === "mafia") m++; else o++; } });
    return { m: m, o: o };
  }
  function checkWin() { var t = teams(); if (t.m === 0) return "town"; if (t.m >= t.o) return "mafia"; return null; }

  function stopClock() { if (tick) { clearInterval(tick); tick = null; } }
  function setPhase(ph) {
    S.phase = ph;
    var vis = "setup";
    if (ph === "night") vis = "night";
    else if (ph === "day" || ph === "vote" || ph === "out" || ph === "dawn") vis = "day";
    else if (ph === "end") vis = "end";
    document.body.setAttribute("data-phase", vis);
  }
  function guard() { var ms = (typeof window.__MAFIA_GUARD_MS === "number") ? window.__MAFIA_GUARD_MS : 450; guardUntil = Date.now() + ms; }

  function startGame() {
    var p = plan(); if (!planOk(p)) return;
    var roles = [], i;
    for (i = 0; i < p.m; i++) roles.push("mafia");
    for (i = 0; i < p.d; i++) roles.push("doctor");
    for (i = 0; i < p.p; i++) roles.push("police");
    for (i = 0; i < p.c; i++) roles.push("citizen");
    roles = shuffle(roles);
    S.players = S.names.map(function (n, k) { return { name: n, role: roles[k], alive: true }; });
    S.round = 0; S.dealIdx = 0; S.flipped = false; S.winner = null; S.night = null; S.dawn = null; S.day = null; S.out = null; S.sel = null;
    setPhase("deal"); render();
  }
  function startNight() {
    S.round++;
    S.night = { order: shuffle(alive()), pos: 0, stage: "handoff", votes: [], save: null, inspected: null };
    S.sel = null; setPhase("night"); render();
  }
  function nightNext() {
    var n = S.night; n.pos++; S.sel = null;
    if (n.pos >= n.order.length) { resolveNight(); return; }
    n.stage = "handoff"; render();
  }
  function resolveNight() {
    var n = S.night, target = null;
    if (n.votes.length) {
      var tally = {}; n.votes.forEach(function (v) { tally[v] = (tally[v] || 0) + 1; });
      var best = 0; Object.keys(tally).forEach(function (k) { if (tally[k] > best) best = tally[k]; });
      var top = Object.keys(tally).filter(function (k) { return tally[k] === best; });
      target = Number(top[Math.floor(Math.random() * top.length)]);
    }
    var killed = (target != null && target !== n.save) ? target : null;
    if (killed != null) S.players[killed].alive = false;
    S.dawn = { killed: killed };
    setPhase("dawn"); render();
  }
  function startDay() { S.day = { endsAt: Date.now() + S.set.minutes * 60000 }; S.sel = null; setPhase("day"); render(); }
  /* winner firecrackers: plays once on the winner screen, up to 12 seconds */
  var FW = { src: "fireworks.mp3", maxSec: 12, el: null, ok: true };
  function fwInit() {
    if (FW.el || !FW.ok) return;
    try {
      var a = new Audio(); a.preload = "auto"; a.src = FW.src;
      a.addEventListener("error", function () { FW.ok = false; });
      a.addEventListener("timeupdate", function () { var t = a.currentTime; if (t >= FW.maxSec) { fwStop(); return; } try { a.volume = t > FW.maxSec - 2 ? Math.max(0, (FW.maxSec - t) / 2) : 1; } catch (e) {} });
      FW.el = a;
    } catch (e) { FW.ok = false; }
  }
  function fwPlay() {
    fwInit(); var a = FW.el; if (!a || !FW.ok) return;
    try { a.currentTime = 0; a.volume = 1; var p = a.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function fwStop() { if (FW.el) { try { FW.el.pause(); } catch (e) {} } }
  function finish(w) { S.winner = w; setPhase("end"); render(); fwPlay(); }

  /* ---------- views ---------- */
  function av(name, small) {
    var h = 0, i; for (i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    var ch = Array.from(name.trim())[0] || "?";
    return '<div class="avatar' + (small ? " sm" : "") + '" style="--h:' + h + '">' + esc(ch.toUpperCase()) + '</div>';
  }
  function steps(n) { var h = ""; for (var i = 1; i <= 4; i++) h += '<div class="step' + (i <= n ? " on" : "") + '"></div>'; return '<div class="progress" aria-hidden="true">' + h + '</div>'; }
  function grid(list) {
    return '<div class="players">' + list.map(function (i) { var p = S.players[i]; return '<div class="player' + (p.alive ? "" : " dead") + '">' + av(p.name) + '<small>' + esc(p.name) + (p.alive ? "" : " (out)") + '</small></div>'; }).join("") + '</div>';
  }
  function tally() { var t = teams(); return '<p class="tally">Mafia: ' + t.m + ' &nbsp;|&nbsp; Town: ' + t.o + '</p>'; }
  function tagHtml(role) { var r = ROLES[role]; return '<span class="tag" style="color:' + r.color + '">' + emblem(role, 18) + r.name + '</span>'; }

  function viewSetup() {
    var p = plan(), ok = planOk(p), mc = mafiaCount();
    var cards = S.names.map(function (n, i) {
      return '<div class="player">' + av(n) + '<small>' + esc(n) + '</small><button type="button" class="x" id="rm-' + i + '" data-act="remove" data-i="' + i + '" aria-label="Remove ' + esc(n) + '">&times;</button></div>';
    }).join("");
    var msg = "";
    if (p.n < 4) msg = "Add at least 4 players to start.";
    else if (p.c < 1) msg = "Too many special roles for this group. Turn one off or lower the Mafia count.";
    else if (!(p.m < p.n - p.m)) msg = "The Mafia would start with a majority. Lower the Mafia count.";
    var list = S.names.length ? '<div class="players">' + cards + '</div>' : '<div class="empty">No one is at the table yet. Type a name above and press Add.</div>';
    return '<div class="grid">' +
      '<section class="card"><div class="eyebrow gold">The lobby &middot; one phone</div><h2 class="title" tabindex="-1" data-focus>Set the table.</h2>' +
        '<p class="muted">Add everyone who is playing. The names shown are examples, so clear them and add your group.</p>' +
        '<form id="addForm" class="row" autocomplete="off"><input id="nameIn" class="field" type="text" maxlength="16" placeholder="Player name" aria-label="Player name"><button class="btn btn-gold" type="submit">Add</button></form>' +
        (S.nameErr ? '<p class="warn" role="alert">' + esc(S.nameErr) + '</p>' : '') +
        '<div class="row between"><b>Players <span class="muted">' + p.n + ' / ' + MAX + '</span></b>' + (S.names.length ? '<button class="linkbtn" id="clearBtn" data-act="clear">Clear all</button>' : '') + '</div>' +
        list +
        (msg ? '<p class="warn">' + msg + '</p>' : '') +
        '<button class="btn btn-red block" id="startBtn" data-act="start"' + (ok ? "" : " disabled") + '>Start game</button></section>' +
      '<section class="card"><div class="eyebrow gold">The cast &amp; the rules</div>' +
        '<div class="role-list">' +
        '<div class="role">' + emblem("mafia", 34, ROLES.mafia.color) + '<div><strong>Mafia × ' + p.m + '</strong><p>Eliminate the town without getting caught.</p></div></div>' +
        (p.p ? '<div class="role">' + emblem("police", 34, ROLES.police.color) + '<div><strong>Police × 1</strong><p>Investigate one player each night.</p></div></div>' : '') +
        (p.d ? '<div class="role">' + emblem("doctor", 34, ROLES.doctor.color) + '<div><strong>Doctor × 1</strong><p>Save one player each night.</p></div></div>' : '') +
        '<div class="role">' + emblem("citizen", 34, ROLES.citizen.color) + '<div><strong>Citizens × ' + Math.max(p.c, 0) + '</strong><p>Find the Mafia and vote them out.</p></div></div></div>' +
        '<div class="row between"><span>Mafia members' + (S.set.mafia == null ? ' <span class="muted">(auto)</span>' : '') + '</span><span class="stepper"><button type="button" id="mafMinus" data-act="mafia" data-d="-1" aria-label="Fewer Mafia">&minus;</button><output>' + mc + '</output><button type="button" id="mafPlus" data-act="mafia" data-d="1" aria-label="More Mafia">+</button></span></div>' +
        (S.set.mafia != null ? '<button class="linkbtn" id="mafAuto" data-act="mafiaAuto" style="align-self:flex-start">Set Mafia count automatically</button>' : '') +
        '<label class="toggle"><span>Doctor</span><input type="checkbox" id="optDoc"' + (S.set.doctor ? " checked" : "") + '></label>' +
        '<label class="toggle"><span>Police</span><input type="checkbox" id="optPol"' + (S.set.police ? " checked" : "") + '></label>' +
        '<label class="toggle"><span>Reveal a role when a player dies</span><input type="checkbox" id="optRev"' + (S.set.reveal ? " checked" : "") + '></label>' +
        '<div class="row between"><span>Discussion (minutes)</span><span class="stepper"><button type="button" id="minMinus" data-act="minutes" data-d="-1" aria-label="Shorter discussion">&minus;</button><output>' + S.set.minutes + '</output><button type="button" id="minPlus" data-act="minutes" data-d="1" aria-label="Longer discussion">+</button></span></div>' +
      '</section></div>';
  }

  function viewDeal() {
    var p = S.players[S.dealIdx], r = ROLES[p.role], partners = "";
    if (p.role === "mafia") {
      var others = S.players.filter(function (q, i) { return q.role === "mafia" && i !== S.dealIdx; }).map(function (q) { return esc(q.name); });
      partners = '<p class="team">' + (others.length ? "Your crew: " + others.join(", ") : "You work alone.") + '</p>';
    }
    var last = S.dealIdx === S.players.length - 1;
    return '<div class="narrow">' +
      '<div class="handoff"><div class="eyebrow gold">Player ' + (S.dealIdx + 1) + ' of ' + S.players.length + '</div><p class="muted">Hand the phone to</p><h2 class="bigname" tabindex="-1" data-focus>' + esc(p.name) + '</h2></div>' +
      '<div class="stage"><button class="card3d' + (S.flipped ? " flipped" : "") + '" id="card" data-act="flip" aria-label="Reveal your secret role">' +
        '<div class="face front">' + emblem("unknown", 64) + '<div class="eyebrow gold">Tap to reveal</div></div>' +
        '<div class="face back" style="--rc:' + r.color + ';--tint:' + r.tint + '"><div class="eyebrow gold">File ' + r.file + ' / Classified</div>' + emblem(p.role, 78) + '<h2>' + r.name.toUpperCase() + '</h2><div class="t">' + r.title + '</div><p>' + r.power + '</p>' + partners + '</div>' +
      '</button></div>' +
      '<p class="sr" id="roleLive" aria-live="polite"></p>' +
      '<button class="btn btn-red block" id="hideBtn" data-act="dealNext"' + (S.flipped ? "" : " hidden") + '>' + (last ? "Hide and begin Night 1" : "Hide and pass it on") + '</button>' +
      '<p class="hint">Make sure nobody else is looking before you tap the card.</p></div>';
  }

  function voteList(indices, withNone) {
    var h = indices.map(function (i) {
      return '<button class="vote" id="pick-' + i + '" data-act="sel" data-i="' + i + '" aria-pressed="' + (S.sel === i) + '">' + av(S.players[i].name, true) + '<span class="nm">' + esc(S.players[i].name) + '</span><span class="ring"></span></button>';
    }).join("");
    if (withNone) h += '<button class="vote" id="pick-none" data-act="sel" data-i="none" aria-pressed="' + (S.sel === "none") + '"><span class="nm">No one. Skip the vote</span><span class="ring"></span></button>';
    return '<div class="vote-list">' + h + '</div>';
  }

  function viewNight() {
    var n = S.night, idx = n.order[n.pos], p = S.players[idx];
    if (n.stage === "handoff") {
      return '<div class="narrow"><div class="card night"><div class="phase">Night ' + S.round + ' &middot; Everyone close your eyes</div><div class="moonbig"></div>' +
        '<p class="muted">Pass the phone to</p><h2 class="bigname" tabindex="-1" data-focus>' + esc(p.name) + '</h2><button class="btn btn-red block" data-act="nightOpen">I am ' + esc(p.name) + '</button></div></div>';
    }
    if (n.stage === "result") {
      var t = S.players[n.inspected], bad = t.role === "mafia";
      return '<div class="narrow"><div class="card night"><div class="phase">Investigation</div><h2 class="bigname" tabindex="-1" data-focus>' + esc(t.name) + '</h2>' +
        '<div class="role">' + emblem(bad ? "mafia" : "citizen", 34, bad ? "#ff6878" : "#7de7b4") + '<div style="text-align:left"><strong style="color:' + (bad ? "#ff6878" : "var(--green)") + '">' + (bad ? "MAFIA" : "NOT MAFIA") + '</strong><p>' + (bad ? "They are working against the town." : "They are not part of the Mafia.") + '</p></div></d
