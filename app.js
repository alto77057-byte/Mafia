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
        '<div class="role">' + emblem(bad ? "mafia" : "citizen", 34, bad ? "#ff6878" : "#7de7b4") + '<div style="text-align:left"><strong style="color:' + (bad ? "#ff6878" : "var(--green)") + '">' + (bad ? "MAFIA" : "NOT MAFIA") + '</strong><p>' + (bad ? "They are working against the town." : "They are not part of the Mafia.") + '</p></div></div>' +
        '<button class="btn btn-red block" data-act="nightNext">Got it. Hide screen</button></div></div>';
    }
    var al = alive(), body, title, sub;
    if (p.role === "mafia") {
      var crew = S.players.filter(function (q, i) { return q.role === "mafia" && q.alive && i !== idx; }).map(function (q) { return esc(q.name); });
      title = "Choose your target"; sub = crew.length ? "Your crew: " + crew.join(", ") + ". If votes tie, one is picked at random." : "You are the last of your crew.";
      body = voteList(al.filter(function (i) { return S.players[i].role !== "mafia"; }));
    } else if (p.role === "doctor") {
      title = "Who do you protect?"; sub = "You may protect yourself."; body = voteList(al);
    } else if (p.role === "police") {
      title = "Who do you investigate?"; sub = "You will see whether they are Mafia."; body = voteList(al.filter(function (i) { return i !== idx; }));
    } else {
      title = "Who do you watch?"; sub = "You sleep through the night. Pick anyone; it changes nothing."; body = voteList(al.filter(function (i) { return i !== idx; }));
    }
    return '<div class="narrow"><div class="card night"><div class="phase">Night ' + S.round + ' &middot; ' + esc(p.name) + '</div><div class="moonbig sm"></div>' +
      '<h2 class="title" tabindex="-1" data-focus>' + title + '</h2><p class="muted">' + sub + '</p>' + body +
      '<button class="btn btn-red block" id="lockBtn" data-act="nightLock"' + (S.sel == null ? " disabled" : "") + '>Confirm night action</button></div></div>';
  }

  function viewDawn() {
    var k = S.dawn.killed, w = checkWin(), head, line;
    if (k == null) { head = "No one died"; line = "Someone may have been attacked, or the Mafia held back. Either way, everyone is still here."; }
    else {
      var p = S.players[k]; head = esc(p.name) + " is dead";
      line = S.set.reveal ? esc(p.name) + " was " + (p.role === "mafia" ? "<strong>Mafia</strong>" : "a <strong>" + ROLES[p.role].name + "</strong>") + "." : "Their role stays hidden.";
    }
    return '<div class="narrow"><div class="card"><div class="eyebrow gold">Day ' + S.round + '</div><h2 class="title" tabindex="-1" data-focus>The town awakens.</h2>' + steps(1) +
      '<h3 class="bigname" style="font-size:clamp(30px,9vw,44px)">' + head + '</h3><p class="muted">' + line + '</p>' + grid(allIdx()) + tally() +
      '<button class="btn btn-red block" data-act="afterDawn">' + (w ? "See how it ended" : "Start the discussion") + '</button></div></div>';
  }

  function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function viewDay() {
    var left = S.day.endsAt - Date.now();
    return '<div class="narrow"><div class="card"><div class="eyebrow gold">Day ' + S.round + '</div><h2 class="title" tabindex="-1" data-focus>The town talks.</h2><p class="muted">Accuse, defend, bluff. Call the vote when the timer ends, or sooner if everyone is ready.</p>' + steps(2) +
      '<div class="clock' + (left < 30000 ? " low" : "") + (left <= 0 ? " done" : "") + '" id="clock" role="timer">' + fmt(left) + '</div><p class="clocknote" id="clockNote">' + (left <= 0 ? "Time is up. Call the vote." : "") + '</p>' +
      '<div class="row"><button class="btn btn-ghost sm grow" id="subMin" data-act="subMin">&minus;1 min</button><button class="btn btn-ghost sm grow" id="addMin" data-act="addMin">+1 min</button></div>' +
      grid(alive()) + '<button class="btn btn-red block" data-act="toVote">Call the vote</button></div></div>';
  }

  function viewVote() {
    return '<div class="narrow"><div class="card"><div class="eyebrow gold">Day ' + S.round + '</div><h2 class="title" tabindex="-1" data-focus>The vote.</h2><p class="muted">Count hands out loud, then tap the player with the most votes.</p>' + steps(3) +
      voteList(alive(), true) +
      '<button class="btn btn-red block" id="voteBtn" data-act="confirmVote"' + (S.sel == null ? " disabled" : "") + '>Submit vote</button></div></div>';
  }

  function viewOut() {
    var k = S.out, w = checkWin(), cont = '<button class="btn btn-red block" data-act="afterOut">' + (w ? "See how it ended" : "Night falls") + '</button>';
    if (k == null) return '<div class="narrow"><div class="final"><div class="bigemb" style="color:var(--muted)">' + emblem("none", 84) + '</div><div class="eyebrow gold">The town could not decide</div><h2 tabindex="-1" data-focus>No one was eliminated</h2>' + tally() + cont + '</div></div>';
    var p = S.players[k], r = ROLES[p.role], bad = p.role === "mafia";
    var card = S.set.reveal
      ? '<div class="role">' + emblem(p.role, 34, r.color) + '<div><strong style="color:' + r.color + '">' + r.name.toUpperCase() + '</strong><p>' + (bad ? "One Mafia has been eliminated." : "An innocent has been eliminated.") + '</p></div></div>'
      : '<p class="muted">Their role stays hidden.</p>';
    return '<div class="narrow"><div class="final"><div class="bigemb" style="color:' + (S.set.reveal ? r.color : "var(--muted)") + '">' + emblem(S.set.reveal ? p.role : "unknown", 84) + '</div><div class="eyebrow gold">Player eliminated</div><h2 tabindex="-1" data-focus>' + esc(p.name) + '</h2><p class="muted">The town has made its choice.</p>' + card + grid(allIdx()) + tally() + cont + '</div></div>';
  }

  function viewEnd() {
    var town = S.winner === "town";
    return '<div class="narrow"><div class="final' + (town ? "" : " bad") + '"><div class="bigemb" style="color:' + (town ? "var(--gold)" : "#ff6878") + '">' + emblem(town ? "police" : "mafia", 84) + '</div><div class="eyebrow gold">The night is over &middot; ' + S.round + ' night' + (S.round === 1 ? "" : "s") + '</div>' +
      '<h2 tabindex="-1" data-focus>' + (town ? "TOWN WINS!" : "MAFIA WINS!") + '</h2><p class="muted">' + (town ? "All Mafia have been eliminated." : "The Mafia now equal the town.") + '</p>' +
      '<ul class="roster">' + S.players.map(function (p) {
        return '<li class="' + (p.alive ? "" : "dead") + '">' + av(p.name, true) + '<span class="nm">' + esc(p.name) + '</span>' + tagHtml(p.role) + '</li>';
      }).join("") + '</ul>' +
      '<button class="btn btn-red block" id="againBtn" data-act="again">Play again</button><button class="btn btn-ghost block" data-act="newSetup">Change players or rules</button><button class="btn btn-ghost block" data-act="toSite">Back to the title</button></div></div>';
  }

  var VIEWS = { setup: viewSetup, deal: viewDeal, night: viewNight, dawn: viewDawn, day: viewDay, vote: viewVote, out: viewOut, end: viewEnd };
  function stageKey() { return S.phase + "|" + (S.night && S.phase === "night" ? S.night.pos + S.night.stage : "") + "|" + S.dealIdx + "|" + S.round; }

  function updateBar() {
    var s = "Setting the table";
    if (S.phase === "deal") s = "Dealing roles";
    else if (S.phase === "end") s = "Game over";
    else if (S.round) s = "Round " + S.round + " · " + alive().length + " alive";
    var gs = $("gstatus"); if (gs) gs.textContent = s;
    var ask = $("leaveAsk"), btn = $("leaveBtn");
    if (ask && btn) { ask.hidden = !S.quit; btn.hidden = S.quit; }
  }

  function render() {
    stopClock();
    updateBar();
    if (S.mode !== "game") return;
    var key = stageKey(), changed = key !== S.key; S.key = key;
    if (changed) guard();
    var ae = document.activeElement, aid = ae && ae.id ? ae.id : "";
    var nameEl = $("nameIn"); if (nameEl) S.draft = nameEl.value;
    var app = $("app");
    app.innerHTML = '<div class="screen' + (changed ? " enter" : "") + '">' + VIEWS[S.phase]() + '</div>';
    var ne = $("nameIn"); if (ne) ne.value = S.draft || "";
    if (changed) {
      window.scrollTo(0, 0);
      var f = app.querySelector("[data-focus]"); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    } else if (aid) {
      var again = $(aid); if (again) { try { again.focus({ preventScroll: true }); } catch (e2) {} }
    }
    if (S.phase === "day") startClock();
    persist();
  }

  function startClock() {
    tick = setInterval(function () {
      var el = $("clock"); if (!el) { stopClock(); return; }
      var left = S.day.endsAt - Date.now();
      el.textContent = fmt(left); el.classList.toggle("low", left < 30000);
      if (left <= 0) {
        stopClock(); el.classList.add("done");
        var note = $("clockNote"); if (note) note.textContent = "Time is up. Call the vote.";
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    }, 250);
  }

  /* ---------- site / game mode ---------- */
  function setMode(m) {
    S.mode = m; S.quit = false;
    if (m === "game") { entryStop(); fwInit(); } else fwStop();
    document.body.setAttribute("data-mode", m);
    $("site").hidden = (m !== "site"); $("game").hidden = (m !== "game");
    if (m === "site") { document.body.setAttribute("data-phase", "site"); syncResume(); }
    window.scrollTo(0, 0);
    heroSync(); updateBar();
  }
  function goTo(id) { var el = $(id); if (!el) return; if (S.mode !== "site") return; try { el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); } }
  function openGame() { S.phase = "setup"; S.key = ""; setMode("game"); setPhase("setup"); render(); }
  function resumeGame() {
    var g = STORE.game; if (!validGame(g)) { STORE.game = null; syncResume(); return; }
    S.players = g.players; S.round = g.round; S.dealIdx = g.dealIdx; S.night = g.night || null; S.dawn = g.dawn || null; S.day = g.day || null; S.out = (g.out == null ? null : g.out);
    S.flipped = false; S.sel = null; S.winner = null; S.key = "";
    if (g.phase === "night" && S.night && S.night.stage === "act") S.night.stage = "handoff";
    if (g.phase === "day" && S.day) S.day.endsAt = Math.max(S.day.endsAt, Date.now() + 30000);
    setMode("game"); setPhase(g.phase); render();
  }
  function leaveGame() {
    stopClock(); fwStop(); STORE.game = null; S.players = []; S.round = 0; S.night = null; S.dawn = null; S.day = null; S.out = null; S.key = "";
    persist(); setPhase("setup"); setMode("site");
  }

  /* ---------- actions ---------- */
  var A = {
    play: openGame, resume: resumeGame,
    brand: function () { if (S.mode === "site") { window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }); } else A.leave(); },
    leave: function () {
      if (S.phase === "setup") { setMode("site"); return; }
      S.quit = true; updateBar(); var y = $("leaveYes"); if (y) y.focus();
    },
    leaveYes: leaveGame,
    leaveNo: function () { S.quit = false; updateBar(); var b = $("leaveBtn"); if (b) b.focus(); },
    toSite: function () { STORE.game = null; persist(); setMode("site"); },
    remove: function (d) { S.names.splice(Number(d.i), 1); S.nameErr = ""; render(); },
    clear: function () { S.names = []; S.nameErr = ""; S.draft = ""; render(); var n = $("nameIn"); if (n) n.focus(); },
    mafia: function (d) { var n = mafiaCount() + Number(d.d); S.set.mafia = Math.max(1, Math.min(n, 9)); render(); },
    mafiaAuto: function () { S.set.mafia = null; render(); },
    minutes: function (d) { S.set.minutes = Math.max(1, Math.min(10, S.set.minutes + Number(d.d))); render(); },
    start: startGame,
    flip: function () {
      if (S.flipped) return;
      S.flipped = true; var c = $("card"); if (c) c.classList.add("flipped");
      var b = $("hideBtn"); if (b) { b.hidden = false; }
      var p = S.players[S.dealIdx], r = ROLES[p.role], live = $("roleLive");
      if (live) live.textContent = "Your role: " + r.name + ", " + r.title + ". " + r.power;
    },
    dealNext: function () {
      S.flipped = false;
      if (S.dealIdx >= S.players.length - 1) { startNight(); return; }
      S.dealIdx++; render();
    },
    nightOpen: function () { S.night.stage = "act"; S.sel = null; render(); },
    sel: function (d) { S.sel = d.i === "none" ? "none" : Number(d.i); render(); },
    nightLock: function () {
      var n = S.night, p = S.players[n.order[n.pos]];
      if (S.sel == null || S.sel === "none") return;
      if (p.role === "mafia") n.votes.push(S.sel);
      else if (p.role === "doctor") n.save = S.sel;
      if (p.role === "police") { n.inspected = S.sel; n.stage = "result"; S.sel = null; render(); return; }
      nightNext();
    },
    nightNext: nightNext,
    afterDawn: function () { var w = checkWin(); if (w) finish(w); else startDay(); },
    addMin: function () { S.day.endsAt = Math.max(S.day.endsAt, Date.now()) + 60000; render(); },
    subMin: function () { S.day.endsAt = Math.max(Date.now() + 1000, S.day.endsAt - 60000); render(); },
    toVote: function () { S.sel = null; setPhase("vote"); render(); },
    confirmVote: function () {
      if (S.sel == null) return;
      if (S.sel === "none") S.out = null; else { S.out = S.sel; S.players[S.sel].alive = false; }
      setPhase("out"); render();
    },
    afterOut: function () { var w = checkWin(); if (w) finish(w); else startNight(); },
    again: function () { fwStop(); startGame(); },
    newSetup: function () { fwStop(); setPhase("setup"); S.key = ""; render(); },
    music: function () {
      if (ENTRY.waiting || (!ENTRY.playing && !ENTRY.muted)) { entryStart(); return; }
      ENTRY.muted = !ENTRY.muted; if (ENTRY.el) ENTRY.el.muted = ENTRY.muted; entryUI();
    },
    role: function (d, el) { openRole(d.role, el); },
    roleClose: closeRole,
    intro: function () { openIntro(); },
    introPlay: function () { playIntro(); },
    introClose: function () { closeIntro(); }
  };
  var GUARDED = { flip: 1, dealNext: 1, nightOpen: 1, nightLock: 1, nightNext: 1, afterDawn: 1, toVote: 1, confirmVote: 1, afterOut: 1 };

  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-go]");
    if (g) { e.preventDefault(); goTo(g.getAttribute("data-go")); return; }
    var t = e.target.closest("[data-act]"); if (!t || t.disabled) return;
    if (t.closest("#modal") && t === $("modal")) return;
    var act = t.getAttribute("data-act");
    if (GUARDED[act] && Date.now() < guardUntil) return;
    var f = A[act]; if (f) f(t.dataset, t);
  });
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeRole(); });
  document.addEventListener("submit", function (e) {
    if (e.target.id !== "addForm") return;
    e.preventDefault();
    var raw = $("nameIn").value.replace(/\s+/g, " ").trim();
    if (!raw) S.nameErr = "Type a name first.";
    else if (S.names.length >= MAX) S.nameErr = "The table is full (" + MAX + " players).";
    else if (S.names.some(function (n) { return n.toLowerCase() === raw.toLowerCase(); })) S.nameErr = raw + " is already at the table. Use a different name.";
    else { S.names.push(raw); S.nameErr = ""; raw = ""; }
    S.draft = raw; render();
    var n = $("nameIn"); if (n) n.focus();
  });
  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (id === "optDoc") S.set.doctor = e.target.checked;
    else if (id === "optPol") S.set.police = e.target.checked;
    else if (id === "optRev") S.set.reveal = e.target.checked;
    else return;
    render();
  });
  function onHide() {
    if (document.hidden) { persist(); fwStop(); if (ENTRY.playing && ENTRY.el) { ENTRY.paused = true; try { ENTRY.el.pause(); } catch (e) {} } }
    else if (ENTRY.paused && entryAllowed()) { ENTRY.paused = false; entryStart(); }
    heroSync();
  }
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", persist);

  /* ---------- modal ---------- */
  var M = { opener: null };
  function openRole(key, opener) {
    var d = ROLES[key]; if (!d) return;
    $("modalBody").innerHTML = '<div style="color:' + d.color + ';display:grid;place-items:center">' + emblem(key, 76) + '</div><div class="eyebrow gold" style="margin-top:12px">Identity declassified</div>' +
      '<h3 id="mTitle" style="color:' + d.color + ';margin:6px 0">' + d.name.toUpperCase() + '</h3><div class="sub">' + d.title + '</div><p>' + d.long + '</p><p class="power">' + d.power + '</p>' +
      '<div class="badges">' + d.tags.map(function (t) { return '<span class="badge">' + t + '</span>'; }).join("") + '</div>';
    M.opener = opener || null; $("modal").hidden = false; document.body.style.overflow = "hidden";
    $("mClose").focus();
  }
  function closeRole() {
    if ($("modal").hidden) return;
    $("modal").hidden = true; if ($("intro").hidden) document.body.style.overflow = "";
    if (M.opener && document.body.contains(M.opener)) M.opener.focus(); M.opener = null;
  }
  function trapTab(e, box) {
    var f = Array.prototype.filter.call(box.querySelectorAll("button, [href], input, select, [tabindex]:not([tabindex='-1'])"), function (n) { return !n.disabled && !n.hidden && n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!$("intro").hidden) closeIntro(); else closeRole(); return; }
    if (e.key === "Tab") { if (!$("intro").hidden) trapTab(e, $("intro")); else if (!$("modal").hidden) trapTab(e, $("modalBox")); }
  });

  /* ---------- skyline scene (hero and intro) ---------- */
  var FLASH = [2.3, 7.0, 12.4, 27.2];
  var LINES = [[0.6, "Ahad presents"], [3.4, "The city never sleeps. Neither do they."], [7.2, "Tonight, someone dies."], [10.0, "By dawn, someone pays."]];
  var ROLE_SEQ = [[19.6, "The Mafia", "Rule the night.", "#ff6878"], [21.4, "The Doctor", "Save a life.", "#7de7b4"], [23.2, "The Police", "Find the liar.", "#80bdff"], [25.0, "The Citizens", "Survive the vote.", "#d7aaff"]];
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function rnd(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }

  function buildCity(W, H) {
    var R = mulberry(7);
    var defs = [
      { c: "#1b1b2e", hmin: .18, hmax: .52, wmin: .05, wmax: .11, lit: .2 },
      { c: "#0f0f1d", hmin: .12, hmax: .42, wmin: .06, wmax: .13, lit: .3 },
      { c: "#06060c", hmin: .06, hmax: .28, wmin: .07, wmax: .16, lit: .14 }
    ];
    return defs.map(function (L) {
      var x = -30, bs = [];
      while (x < W + 30) {
        var w = (L.wmin + R() * (L.wmax - L.wmin)) * W, h = (L.hmin + R() * (L.hmax - L.hmin)) * H;
        var ww = Math.max(4, w / 9), cols = Math.max(1, Math.floor((w - ww) / (ww * 2))), rows = Math.max(1, Math.floor((h - ww) / (ww * 2.4))), win = [];
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) win.push({ lit: R() < L.lit, ph: R() * 6, c: c, r: r });
        bs.push({ x: x, w: w, h: h, ww: ww, win: win });
        x += w + R() * 6;
      }
      return { L: L, b: bs };
    });
  }
  function makeScene(cv) {
    var sc = { cv: cv, cx: null, W: 0, H: 0, city: null, rain: [] };
    sc.resize = function (w, h) {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      sc.W = w; sc.H = h; cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      sc.cx = cv.getContext("2d"); sc.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.city = buildCity(w, h); sc.rain = [];
      var cnt = Math.round(Math.min(220, Math.max(60, w * h / 6500)));
      for (var i = 0; i < cnt; i++) sc.rain.push({ x: Math.random() * w, y: Math.random() * h, l: 10 + Math.random() * 18, s: 600 + Math.random() * 500 });
    };
    return sc;
  }

  function drawTower(cx, W, H, t, x0) {
    var tw = Math.min(W * 0.17, 190), y = H, tiers = [[1, 0.3], [0.78, 0.13], [0.56, 0.1], [0.34, 0.07]], i;
    cx.fillStyle = "#0a0a17"; cx.strokeStyle = "rgba(255,230,160,.16)"; cx.lineWidth = 1;
    for (i = 0; i < tiers.length; i++) {
      var w = tw * tiers[i][0], h = H * tiers[i][1];
      cx.fillRect(x0 - w / 2, y - h, w, h + 2); cx.strokeRect(x0 - w / 2 + 0.5, y - h + 0.5, w - 1, h);
      cx.fillStyle = "rgba(240,190,95,.28)";
      for (var s = 1; s < 6; s++) cx.fillRect(x0 - w / 2 + (w / 6) * s - 1, y - h + 6, 2, h - 12);
      cx.fillStyle = "#0a0a17"; y -= h;
    }
    cx.beginPath(); cx.moveTo(x0 - tw * 0.1, y); cx.lineTo(x0, y - H * 0.16); cx.lineTo(x0 + tw * 0.1, y); cx.closePath(); cx.fill();
    cx.strokeStyle = "rgba(246,225,149," + (0.35 + 0.2 * Math.sin(t * 1.3)).toFixed(2) + ")"; cx.lineWidth = 1.5;
    for (i = 1; i <= 3; i++) { cx.beginPath(); cx.arc(x0, y, tw * 0.12 * i, Math.PI * 1.05, Math.PI * 1.95); cx.stroke(); }
    var bg = cx.createRadialGradient(x0, y - H * 0.16, 0, x0, y - H * 0.16, 26);
    var ba = 0.45 + 0.45 * Math.sin(t * 3);
    bg.addColorStop(0, "rgba(255,70,80," + ba.toFixed(2) + ")"); bg.addColorStop(1, "rgba(255,70,80,0)");
    cx.fillStyle = bg; cx.fillRect(x0 - 26, y - H * 0.16 - 26, 52, 52);
  }
  function drawFogCar(cx, W, H, t, hero) {
    var i;
    for (i = 0; i < 3; i++) {
      var fy = H * (0.6 + i * 0.12), fx = Math.sin(t * 0.12 + i * 2) * W * 0.1;
      var fg = cx.createLinearGradient(0, fy, 0, fy + H * 0.22);
      fg.addColorStop(0, "rgba(150,160,190,0)"); fg.addColorStop(0.5, "rgba(150,160,190,.11)"); fg.addColorStop(1, "rgba(150,160,190,0)");
      cx.fillStyle = fg; cx.fillRect(fx - W * 0.1, fy, W * 1.2, H * 0.22);
    }
    var ct = hero ? (t % 22) + 3.5 : t;
    if (ct > 3.5 && ct < 9.5) {
      var x = ((ct - 3.5) / 6) * W * 1.3 - W * 0.15, y = H * 0.955;
      for (i = 0; i < 2; i++) {
        var px = x - i * W * 0.035, hg = cx.createRadialGradient(px, y, 0, px, y, W * 0.06);
        hg.addColorStop(0, "rgba(255,244,210,.9)"); hg.addColorStop(1, "rgba(255,244,210,0)");
        cx.fillStyle = hg; cx.fillRect(px - W * 0.06, y - W * 0.06, W * 0.12, W * 0.12);
      }
      var bm = cx.createLinearGradient(x, 0, x + W * 0.25, 0);
      bm.addColorStop(0, "rgba(255,244,210,.22)"); bm.addColorStop(1, "rgba(255,244,210,0)");
      cx.fillStyle = bm; cx.beginPath(); cx.moveTo(x, y - 3); cx.lineTo(x + W * 0.25, y - H * 0.05); cx.lineTo(x + W * 0.25, y + H * 0.045); cx.lineTo(x, y + 3); cx.closePath(); cx.fill();
    }
  }
  function drawGlory(cx, W, H, t) {
    if (t < 12.4) return;
    var dt = t - 12.4, i, L = Math.max(W, H);
    var ra = Math.min(0.2, dt * 0.1) * (t > 27.2 ? 1.6 : 1);
    cx.save(); cx.translate(W / 2, H / 2); cx.rotate(dt * 0.05);
    var rg = cx.createRadialGradient(0, 0, 0, 0, 0, L * 0.8);
    rg.addColorStop(0, "rgba(246,225,149," + ra.toFixed(3) + ")"); rg.addColorStop(1, "rgba(246,225,149,0)");
    cx.fillStyle = rg; cx.beginPath();
    for (i = 0; i < 14; i++) { var an = i * 6.2832 / 14; cx.moveTo(0, 0); cx.lineTo(Math.cos(an - 0.05) * L, Math.sin(an - 0.05) * L); cx.lineTo(Math.cos(an + 0.05) * L, Math.sin(an + 0.05) * L); cx.closePath(); }
    cx.fill(); cx.restore();
    [12.4, 27.2].forEach(function (e) {
      var d = t - e; if (d < 0 || d > 1.8) return;
      cx.strokeStyle = "rgba(246,225,149," + ((1 - d / 1.8) * 0.7).toFixed(3) + ")"; cx.lineWidth = 3 + (1 - d / 1.8) * 6;
      cx.beginPath(); cx.arc(W / 2, H / 2, d * L * 0.8, 0, 6.2832); cx.stroke();
    });
    for (i = 0; i < 70; i++) {
      var r1 = rnd(i, 1), r2 = rnd(i, 2), r3 = rnd(i, 3);
      var y = H - ((dt * (20 + r2 * 45) + r3 * H) % (H * 1.1)), x = r1 * W + Math.sin(t * 0.7 + i) * 20;
      cx.fillStyle = "rgba(246,225,149," + (0.15 + 0.55 * r3 * Math.min(1, dt / 1.5)).toFixed(2) + ")";
      cx.beginPath(); cx.arc(x, y, 0.8 + r2 * 2, 0, 6.2832); cx.fill();
    }
  }
  function drawScene(sc, t, mode) {
    var cx = sc.cx, W = sc.W, H = sc.H; if (!cx || !sc.city || !W || !H) return;
    var hero = mode === "hero", intro = mode === "intro", still = mode === "still";
    var g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#03040a"); g.addColorStop(0.65, "#12121e"); g.addColorStop(1, "#3b1b23");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.save();
    var z = hero ? 1 + (Math.sin(t * 0.06) + 1) * 0.012 : 1 + Math.min(t, 26) * 0.006;
    cx.translate(W / 2, H * 0.9); cx.scale(z, z); cx.translate(-W / 2, -H * 0.9);
    var mr = Math.min(W, H) * 0.07, mx = hero ? W * 0.86 : W * 0.74, my = H * 0.2;
    var mg = cx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5);
    mg.addColorStop(0, "rgba(255,238,200,.35)"); mg.addColorStop(1, "rgba(255,238,200,0)");
    cx.fillStyle = mg; cx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    cx.fillStyle = "#f3e7c9"; cx.beginPath(); cx.arc(mx, my, mr, 0, 6.2832); cx.fill();
    var bx = W * 0.22, a = -Math.PI / 2 + Math.sin(t * 0.55) * 0.55, len = H * 1.3, sp = 0.07;
    var sg = cx.createLinearGradient(bx, H, bx + Math.cos(a) * len, H + Math.sin(a) * len);
    sg.addColorStop(0, "rgba(255,244,210,.32)"); sg.addColorStop(1, "rgba(255,244,210,0)");
    cx.fillStyle = sg; cx.beginPath(); cx.moveTo(bx, H);
    cx.lineTo(bx + Math.cos(a - sp) * len, H + Math.sin(a - sp) * len);
    cx.lineTo(bx + Math.cos(a + sp) * len, H + Math.sin(a + sp) * len); cx.closePath(); cx.fill();
    sc.city.forEach(function (layer, li) {
      layer.b.forEach(function (b) {
        var by = H - b.h;
        cx.fillStyle = layer.L.c; cx.fillRect(b.x, by, b.w + 1, b.h + 2);
        b.win.forEach(function (w) {
          if (!w.lit) return;
          var fl = 0.55 + 0.45 * Math.sin(t * (1.2 + w.ph * 0.2) + w.ph * 9);
          cx.fillStyle = "rgba(240,190,95," + (fl * (li === 2 ? 0.5 : 0.85)).toFixed(2) + ")";
          cx.fillRect(b.x + b.ww * 0.6 + w.c * b.ww * 2, by + b.ww + w.r * b.ww * 2.4, b.ww, b.ww * 1.4);
        });
      });
      if (li === 1) drawTower(cx, W, H, t, hero ? W * 0.68 : W * 0.5);
    });
    cx.restore();
    drawFogCar(cx, W, H, t, hero);
    cx.strokeStyle = "rgba(190,205,235,.26)"; cx.lineWidth = 1; cx.beginPath();
    sc.rain.forEach(function (r) {
      var y = (r.y + t * r.s) % (H + 40) - 20, x = (r.x - t * r.s * 0.12 + W * 10) % W;
      cx.moveTo(x, y); cx.lineTo(x - r.l * 0.12, y + r.l);
    });
    cx.stroke();
    if (intro) drawGlory(cx, W, H, t);
    var f = 0;
    if (intro) {
      FLASH.forEach(function (e) { var dt = t - e; if (dt >= 0) f = Math.max(f, Math.exp(-dt * 5), dt > 0.2 ? 0.7 * Math.exp(-(dt - 0.2) * 6) : 0); });
      if (f > 0.01) { cx.fillStyle = "rgba(235,240,255," + (f * (REDUCED ? 0.1 : 0.55)).toFixed(3) + ")"; cx.fillRect(0, 0, W, H); }
      if (t > 11) { cx.fillStyle = "rgba(150,15,28," + Math.min(0.38, (t - 11) * 0.12).toFixed(3) + ")"; cx.fillRect(0, 0, W, H); }
    } else if (hero && !REDUCED) {
      var ft = t % 17; if (ft > 2) f = Math.exp(-(ft - 2) * 5) * 0.2;
      if (f > 0.01) { cx.fillStyle = "rgba(235,240,255," + f.toFixed(3) + ")"; cx.fillRect(0, 0, W, H); }
    }
    var vg = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.72)");
    cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
    if (intro || still) {
      var bar = H * 0.09 * (still ? 1 : Math.min(1, t / 2));
      cx.fillStyle = "#000"; cx.fillRect(0, 0, W, bar); cx.fillRect(0, H - bar, W, bar);
      var dark = still ? 0.45 : (t < 2.5 ? 1 - t / 2.5 : 0);
      if (dark > 0) { cx.fillStyle = "rgba(0,0,0," + dark.toFixed(3) + ")"; cx.fillRect(0, 0, W, H); }
    }
  }

  /* ---------- hero loop ---------- */
  var HERO = { sc: null, raf: 0, on: false, vis: true, t: 0, last: 0, w: 0, h: 0, timer: 0 };
  function introOpen() { return !$("intro").hidden; }
  function wantHero() { return HERO.vis && !document.hidden && S.mode === "site" && !introOpen(); }
  function heroFrame(now) {
    if (!HERO.on) return;
    var dt = Math.min(0.1, (now - HERO.last) / 1000); HERO.last = now; HERO.t += dt;
    drawScene(HERO.sc, HERO.t, "hero");
    HERO.raf = requestAnimationFrame(heroFrame);
  }
  function heroStill() { if (HERO.sc && HERO.sc.cx) drawScene(HERO.sc, 6, "hero"); }
  function heroSync() {
    if (!HERO.sc) return;
    if (wantHero()) {
      heroResize();
      if (REDUCED) { heroStill(); return; }
      if (!HERO.on) { HERO.on = true; HERO.last = performance.now(); HERO.raf = requestAnimationFrame(heroFrame); }
    } else { HERO.on = false; cancelAnimationFrame(HERO.raf); }
  }
  function heroResize() {
    var el = $("home"); if (!el || !HERO.sc) return;
    var w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    if (Math.abs(w - HERO.w) < 2 && Math.abs(h - HERO.h) < 2) return;
    HERO.w = w; HERO.h = h; HERO.sc.resize(w, h);
    if (REDUCED || !HERO.on) heroStill();
  }
  function initHero() {
    var cv = $("heroCv"); if (!cv || !cv.getContext) return;
    HERO.sc = makeScene(cv);
    try {
      var io = new IntersectionObserver(function (es) { HERO.vis = es[0].isIntersecting; heroSync(); }, { threshold: 0 });
      io.observe($("home"));
    } catch (e) {}
    heroSync();
  }

  /* ---------- theme intro ---------- */
  var I = { raf: 0, t0: 0, A: null, playing: false, line: "", titleOn: false, tagOn: false, goOn: false, up: false, role: "", sc: null, opener: null };
  function resetIntroText() {
    I.line = ""; I.titleOn = false; I.tagOn = false; I.goOn = false; I.up = false; I.role = "";
    $("iLine").textContent = ""; $("iLine").classList.remove("show");
    $("iTitle").classList.remove("on"); $("iTitle").classList.remove("up"); $("iTag").classList.remove("on");
    $("iRoleBlock").classList.remove("show"); $("iRoleBlock").classList.remove("pop");
  }
  function updateIntroText(t) {
    var cur = ""; LINES.forEach(function (L) { if (t >= L[0] && t < L[0] + 2.4) cur = L[1]; });
    if (cur !== I.line) { I.line = cur; var el = $("iLine"); if (cur) { el.textContent = cur; el.classList.add("show"); } else el.classList.remove("show"); }
    if (t >= 12.4 && !I.titleOn) { I.titleOn = true; $("iTitle").classList.add("on"); }
    if (t >= 19.2 && !I.up) { I.up = true; $("iTitle").classList.add("up"); }
    var rc = null; ROLE_SEQ.forEach(function (r) { if (t >= r[0] && t < r[0] + 1.8) rc = r; });
    var rk = rc ? rc[1] : "";
    if (rk !== I.role) {
      I.role = rk; var rb = $("iRoleBlock");
      if (rc) { $("iRole").textContent = rc[1]; $("iRole").style.color = rc[3]; $("iSub").textContent = rc[2]; rb.classList.remove("pop"); void rb.offsetWidth; rb.classList.add("pop"); rb.classList.add("show"); }
      else rb.classList.remove("show");
    }
    if (t >= 27.2 && !I.tagOn) { I.tagOn = true; $("iTag").classList.add("on"); }
    if (t >= 29.5 && !I.goOn) { I.goOn = true; $("iGo").hidden = false; $("iGo").focus(); }
  }

  function makeAudio() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var ac; try { ac = new AC(); } catch (e) { return null; }
    try { if (ac.state === "suspended" && ac.resume) ac.resume(); } catch (e2) {}
    var master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime); master.gain.exponentialRampToValueAtTime(0.8, ac.currentTime + 1.2); var comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    var len = Math.floor(ac.sampleRate * 3), ib = ac.createBuffer(2, len, ac.sampleRate), c, k;
    for (c = 0; c < 2; c++) { var d = ib.getChannelData(c); for (k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 2.5); }
    var conv = ac.createConvolver(); conv.buffer = ib;
    var wet = ac.createGain(); wet.gain.value = 0.5; conv.connect(wet); wet.connect(master);
    var bus = ac.createGain(); bus.gain.value = 0.9; bus.connect(master); bus.connect(conv);
    var nl = ac.sampleRate * 2, nb = ac.createBuffer(1, nl, ac.sampleRate), nd = nb.getChannelData(0);
    for (k = 0; k < nl; k++) nd[k] = Math.random() * 2 - 1;
    return { ac: ac, master: master, bus: bus, noise: nb };
  }

  function scoreAudio(A) {
    var ac = A.ac, T = ac.currentTime + 0.15;
    function tone(f, t, dur, type, vol, cut, att, vib) {
      var o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), a = att || 0.03;
      o.type = type; o.frequency.setValueAtTime(f, T + t);
      fl.type = "lowpass"; fl.frequency.value = cut || 1500;
      g.gain.setValueAtTime(0.0001, T + t);
      g.gain.exponentialRampToValueAtTime(vol, T + t + a);
      g.gain.setValueAtTime(vol, T + t + Math.max(a, dur - 0.3));
      g.gain.exponentialRampToValueAtTime(0.0001, T + t + dur);
      if (vib) { var l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(T + t); l.stop(T + t + dur + 0.1); }
      o.connect(fl); fl.connect(g); g.connect(A.bus); o.start(T + t); o.stop(T + t + dur + 0.1);
    }
    function boom(t, vol, from, to, dur) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(from, T + t); o.frequency.exponentialRampToValueAtTime(to, T + t + dur * 0.7);
      g.gain.setValueAtTime(vol, T + t); g.gain.exponentialRampToValueAtTime(0.0001, T + t + dur);
      o.connect(g); g.connect(A.bus); o.start(T + t); o.stop(T + t + dur + 0.1);
    }
    function hiss(t, dur, vol, type, cut, loop) {
      var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = A.noise; s.loop = !!loop; fl.type = type; fl.frequency.value = cut;
      g.gain.setValueAtTime(0.0001, T + t); g.gain.exponentialRampToValueAtTime(vol, T + t + (loop ? 2 : 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, T + t + dur);
      s.connect(fl); fl.connect(g); g.connect(A.bus); s.start(T + t); s.stop(T + t + dur + 0.1);
    }
    var beat = 0.833, k;
    tone(55, 0, 36, "sawtooth", 0.1, 240, 4); tone(55.4, 0, 36, "sawtooth", 0.08, 240, 4); tone(110, 3, 33, "sine", 0.05, 400, 5);
    hiss(0, 33, 0.05, "bandpass", 4000, true);
    hiss(2.3, 3.2, 0.45, "lowpass", 160); boom(2.3, 0.5, 70, 28, 1.6);
    hiss(7.0, 3.2, 0.45, "lowpass", 160); boom(7.0, 0.5, 70, 28, 1.6);
    var walk = [55, 65.4, 82.4, 73.4, 55, 98, 82.4, 65.4];
    for (k = 0; 4.2 + k * beat < 33; k++) tone(walk[k % walk.length], 4.2 + k * beat, 0.7, "triangle", 0.34, 420, 0.02);
    [[440, 5.0, 1.2], [523.3, 6.4, 0.6], [493.9, 7.1, 0.6], [440, 7.8, 1.2], [329.6, 9.2, 1.0], [349.2, 10.3, 0.5], [329.6, 10.9, 1.0]].forEach(function (n) { tone(n[0], n[1], n[2], "sawtooth", 0.08, 1700, 0.08, true); });
    for (k = 0; 7 + k * beat < 12.3; k++) boom(7 + k * beat, k % 2 ? 0.45 : 0.75, 120, 48, 0.4);
    boom(12.4, 0.95, 90, 26, 3.2); hiss(12.4, 3.4, 0.35, "lowpass", 2800);
    [110, 164.8, 220, 261.6, 329.6].forEach(function (f) { tone(f, 12.4, 6, "sawtooth", 0.07, 1000, 0.05); });
    [220, 261.6, 329.6, 440].forEach(function (f) { tone(f, 12.6, 10, "sawtooth", 0.04, 1300, 2.5); tone(f * 1.004, 12.6, 10, "sawtooth", 0.03, 1300, 2.5); });
    [[440, 12.5, 1.6], [523.3, 14.2, 0.8], [659.3, 15.0, 1.6], [587.3, 16.7, 0.8], [523.3, 17.5, 0.8], [493.9, 18.3, 0.8], [440, 19.1, 2.6]].forEach(function (n) { tone(n[0], n[1], n[2], "sawtooth", 0.09, 2000, 0.08, true); tone(n[0] / 2, n[1], n[2], "sawtooth", 0.06, 900, 0.08); });
    for (k = 0; 10.4 + k * 0.14 < 12.35; k++) hiss(10.4 + k * 0.14, 0.12, 0.05 + k * 0.012, "highpass", 2500);
    var rs = ac.createBufferSource(), rf = ac.createBiquadFilter(), rg = ac.createGain();
    rs.buffer = A.noise; rs.loop = true; rf.type = "bandpass"; rf.Q.value = 1.2;
    rf.frequency.setValueAtTime(300, T + 9); rf.frequency.exponentialRampToValueAtTime(7000, T + 12.4);
    rg.gain.setValueAtTime(0.0001, T + 9); rg.gain.exponentialRampToValueAtTime(0.22, T + 12.35); rg.gain.exponentialRampToValueAtTime(0.0001, T + 12.7);
    rs.connect(rf); rf.connect(rg); rg.connect(A.bus); rs.start(T + 9); rs.stop(T + 12.8);
    [440, 523.3, 659.3, 880].forEach(function (f) { tone(f, 13, 13, "triangle", 0.03, 2400, 3, true); });
    [[19.6, [110, 155.6, 220]], [21.4, [261.6, 329.6, 392]], [23.2, [220, 261.6, 311.1]], [25.0, [196, 246.9, 293.7]]].forEach(function (r) {
      boom(r[0], 0.8, 110, 40, 0.9); hiss(r[0], 0.6, 0.2, "highpass", 1800);
      r[1].forEach(function (f) { tone(f, r[0], 1.5, "sawtooth", 0.08, 1400, 0.02); });
    });
    for (k = 0; 19.6 + k * beat < 27; k++) { boom(19.6 + k * beat, 0.5, 100, 45, 0.3); hiss(19.6 + k * beat + beat / 2, 0.12, 0.12, "highpass", 2200); }
    [[440, 24.0, 0.8], [523.3, 24.8, 0.8], [659.3, 25.6, 0.8], [880, 26.4, 0.8]].forEach(function (n) { tone(n[0], n[1], n[2], "sawtooth", 0.09, 2200, 0.05, true); });
    boom(27.2, 1, 90, 24, 3.6); hiss(27.2, 4, 0.4, "lowpass", 3200); hiss(27.2, 3, 0.25, "highpass", 5000);
    [110, 164.8, 220, 261.6, 329.6, 440].forEach(function (f) { tone(f, 27.2, 7, "sawtooth", 0.07, 1100, 0.05); });
  }

  function stopAudio() {
    var A = I.A; I.A = null; if (!A) return;
    try { A.master.gain.cancelScheduledValues(A.ac.currentTime); A.master.gain.setValueAtTime(A.master.gain.value, A.ac.currentTime); A.master.gain.linearRampToValueAtTime(0.0001, A.ac.currentTime + 0.35); setTimeout(function () { try { A.ac.close(); } catch (e) {} }, 450); } catch (e2) {}
  }


  function loop(now) { var t = (now - I.t0) / 1000; drawScene(I.sc, t, "intro"); updateIntroText(t); I.raf = requestAnimationFrame(loop); }
  function sizeIntro() { if (!I.sc) I.sc = makeScene($("iCv")); I.sc.resize(window.innerWidth, window.innerHeight); }
  function openIntro() {
    I.opener = document.activeElement; entryStop();
    $("intro").hidden = false; document.body.style.overflow = "hidden"; heroSync();
    $("iStart").hidden = false; $("iGo").hidden = true; resetIntroText();
    $("iLine").textContent = "Turn your sound on."; $("iLine").classList.add("show"); I.line = "Turn your sound on.";
    sizeIntro(); drawScene(I.sc, 4.5, "still"); I.playing = false;
    $("iStart").focus();
  }
  function playIntro() {
    if (I.playing) return;
    I.playing = true; $("iStart").hidden = true; resetIntroText();
    I.A = makeAudio(); if (I.A) { try { scoreAudio(I.A); } catch (e) {} }
    I.t0 = performance.now(); I.raf = requestAnimationFrame(loop);
    $("iSkip").focus();
  }
  function closeIntro() {
    if ($("intro").hidden) return;
    cancelAnimationFrame(I.raf); I.playing = false; stopAudio(); resetIntroText();
    $("intro").hidden = true; document.body.style.overflow = ""; heroSync();
    if (I.opener && document.body.contains(I.opener) && !I.opener.hidden) { try { I.opener.focus(); } catch (e) {} } I.opener = null;
  }
  window.addEventListener("resize", function () {
    clearTimeout(HERO.timer);
    HERO.timer = setTimeout(function () {
      if (introOpen()) { sizeIntro(); if (!I.playing) drawScene(I.sc, 4.5, "still"); }
      else if (S.mode === "site") heroResize();
    }, 150);
  });

  /* ---------- entry theme song (plays once, up to 30 seconds) ---------- */
  var ENTRY = { src: "The_Carusu256k.mp3", maxSec: 30, el: null, active: true, playing: false, waiting: false, muted: false, paused: false, gest: false };
  var GEST = ["pointerup", "touchend", "click", "keydown"];
  function entryUI() {
    var b = $("musicBtn"), tx = $("musicTxt"); if (!b || !tx) return;
    if (!ENTRY.active) { b.hidden = true; return; }
    b.hidden = false; b.classList.toggle("waiting", ENTRY.waiting);
    tx.textContent = ENTRY.waiting ? "Tap for theme" : (ENTRY.muted ? "Unmute" : "Mute");
    b.setAttribute("aria-label", ENTRY.waiting ? "Play the entry theme" : (ENTRY.muted ? "Unmute the entry theme" : "Mute the entry theme"));
  }
  function entryAllowed() { return ENTRY.active && S.mode === "site" && !introOpen(); }
  function entryStop() {
    ENTRY.active = false; ENTRY.playing = false; ENTRY.waiting = false; ENTRY.paused = false; removeGesture();
    if (ENTRY.el) { try { ENTRY.el.pause(); } catch (e) {} }
    entryUI();
  }
  function onGesture(e) {
    if (!entryAllowed()) return;
    if (e.type === "keydown" && (e.key === "Escape" || e.key === "Tab" || e.key === "Shift")) return;
    var t = e.target && e.target.closest ? e.target.closest("[data-act]") : null, act = t ? t.getAttribute("data-act") : "";
    if (act === "play" || act === "resume" || act === "intro" || act === "music") return;
    entryStart();
  }
  function addGesture() { if (ENTRY.gest) return; ENTRY.gest = true; GEST.forEach(function (n) { document.addEventListener(n, onGesture, true); }); }
  function removeGesture() { if (!ENTRY.gest) return; ENTRY.gest = false; GEST.forEach(function (n) { document.removeEventListener(n, onGesture, true); }); }
  function entryStart() {
    var a = ENTRY.el; if (!a || !entryAllowed()) return;
    var p; try { p = a.play(); } catch (e) { p = null; }
    if (p && typeof p.then === "function") {
      p.then(function () { if (!ENTRY.active) { try { a.pause(); } catch (e) {} return; } ENTRY.playing = true; ENTRY.waiting = false; ENTRY.paused = false; removeGesture(); entryUI(); })
       .catch(function (err) {
         if (!ENTRY.active) return;
         if (err && err.name === "NotAllowedError") { ENTRY.playing = false; ENTRY.waiting = true; addGesture(); entryUI(); }
         else entryStop();
       });
    } else { ENTRY.playing = true; ENTRY.waiting = false; entryUI(); }
  }
  function entryInit() {
    try {
      var a = new Audio(); a.preload = "auto"; a.src = ENTRY.src; ENTRY.el = a;
      a.addEventListener("ended", entryStop);
      a.addEventListener("error", entryStop);
      a.addEventListener("timeupdate", function () { var t = a.currentTime; if (t >= ENTRY.maxSec) { entryStop(); return; } if (!ENTRY.muted) { try { a.volume = t > ENTRY.maxSec - 2 ? Math.max(0, (ENTRY.maxSec - t) / 2) : 1; } catch (e) {} } });
      entryStart();
    } catch (e) { entryStop(); }
  }

  /* ---------- static content on the landing page ---------- */
  $("roleCards").innerHTML = ORDER.map(function (k) {
    var r = ROLES[k];
    return '<article class="rolecard" style="--glow:' + r.glow + ';--accent:' + r.color + '"><div class="emb-wrap">' + emblem(k, 104) + '</div>' +
      '<div class="serial">FILE ' + r.file + ' / CLASSIFIED</div><small>' + r.title + '</small><h3>' + r.name.toUpperCase() + '</h3><p>' + r.desc + '</p>' +
      '<button data-act="role" data-role="' + k + '" aria-label="Reveal identity: ' + r.name + '">REVEAL IDENTITY ↗</button></article>';
  }).join("");
  $("features").innerHTML = [
    ["city", "A Cinematic World", "Dark city atmosphere, a live rain-soaked skyline and an original score, wrapped in a gold-and-crimson identity."],
    ["people", "Play with Friends", "One phone passes around the table and runs the whole game: secret roles, night actions, a discussion timer and voting."],
    ["lock", "Secret by Design", "Roles hide behind a tap-to-reveal card and the phone hands off between turns, so nobody sees a screen that is not theirs."]
  ].map(function (f) { return '<article class="feature">' + emblem(f[0], 40) + '<h3>' + f[1] + '</h3><p>' + f[2] + '</p></article>'; }).join("");

  /* ---------- start ---------- */
  document.body.setAttribute("data-mode", "site"); document.body.setAttribute("data-phase", "site");
  syncResume(); updateBar(); initHero(); entryInit();
  window.__mafia = { state: S, openGame: openGame, entry: ENTRY, fw: FW };
})();
