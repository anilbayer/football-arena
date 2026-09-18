
(function () {
  "use strict";

  var KEY = "multiview.v1";
  var state = { sites: [], open: [], layout: "auto", mode: "tabs", collapsed: {}, sideHidden: false, seeded: false };
  var focusId = null;
  var editingId = null;
  var players = new Map();

  var $ = function (s) { return document.querySelector(s); };

  /* ---------- Built-in sites (installed automatically) ---------- */
  var DEFAULT_SITES = [
    {
      "id": "smu72wkyankme",
      "name": "Netspor",
      "url": "https://netspor.co/",
      "category": "Football"
    },
    {
      "id": "smu72ww2xuza0",
      "name": "Inatbox",
      "url": "https://inattvgiris.one/",
      "category": "Football"
    },
    {
      "id": "smu72x6j4skty",
      "name": "PatronSpor",
      "url": "https://patronspor.is/",
      "category": "Football"
    },
    {
      "id": "smu72xdaw2w5h",
      "name": "TrGoal",
      "url": "https://trgoalsgiris.xyz/",
      "category": "Football"
    },
    {
      "id": "smu72xkxhcfdv",
      "name": "GolVar",
      "url": "https://golvar549.sbs/",
      "category": "Football"
    },
    {
      "id": "smu72y1qzs8g8",
      "name": "FCTV33",
      "url": "https://www.fctv33.com/tr",
      "category": "Football"
    },
    {
      "id": "smu72ybddb3e7",
      "name": "Liveball",
      "url": "https://liveball.sx/",
      "category": "Football"
    },
    {
      "id": "smu72yiq1k63h",
      "name": "EpicSports",
      "url": "https://live.epicsports.in/",
      "category": "Football"
    },
    {
      "id": "smu72ypwezlt4",
      "name": "Live-Match",
      "url": "https://live-match.net/",
      "category": "Football"
    },
    {
      "id": "smu72yyyhc173",
      "name": "VipBox",
      "url": "https://vipbox1.com/",
      "category": "Football"
    }
  ];


  /* ---------- Storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.sites)) {
          state.sites = d.sites;
          state.open = Array.isArray(d.open) ? d.open : [];
          state.layout = d.layout || "auto";
          state.mode = ["tabs", "block", "off"].indexOf(d.mode) >= 0 ? d.mode : "tabs";
          state.collapsed = d.collapsed || {};
          state.sideHidden = !!d.sideHidden;
          state.seeded = !!d.seeded;
        }
      }
    } catch (e) { /* storage unavailable */ }
    state.open = state.open.filter(function (id) { return byId(id); });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- Helpers ---------- */
  function byId(id) { return state.sites.find(function (s) { return s.id === id; }); }
  function uid() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function hue(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return "hsl(" + h + " 72% 66%)";
  }
  var ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    focus: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    external: '<path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    go: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function icon(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "i");
    s.setAttribute("viewBox", "0 0 24 24");
    s.innerHTML = ICONS[name];
    return s;
  }
  function iconBtn(name, title, onClick, extra) {
    var b = el("button", "icon-btn" + (extra ? " " + extra : ""));
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.appendChild(icon(name));
    b.addEventListener("click", function (e) { e.stopPropagation(); onClick(e); });
    return b;
  }

  /* ---------- URL handling ---------- */
  function normalizeUrl(input) {
    var u = (input || "").trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try { return new URL(u).href; } catch (e) { return null; }
  }
  function toEmbed(url) {
    try {
      var x = new URL(url);
      var h = x.hostname.replace(/^www\./, "").replace(/^m\./, "");
      if (h === "youtube.com") {
        if (x.pathname === "/watch" && x.searchParams.get("v")) {
          return "https://www.youtube.com/embed/" + x.searchParams.get("v") + "?autoplay=1";
        }
        var m = x.pathname.match(/^\/(live|shorts)\/([\w-]+)/);
        if (m) return "https://www.youtube.com/embed/" + m[2] + "?autoplay=1";
      }
      if (h === "youtu.be" && x.pathname.length > 1) {
        return "https://www.youtube.com/embed/" + x.pathname.slice(1) + "?autoplay=1";
      }
    } catch (e) { /* fall through */ }
    return url;
  }

  // Adds the built-in sites once per install (or once for older saved data), skipping any
  // that already exist. A site you delete later is not brought back.
  function seedDefaults() {
    if (state.seeded) return;
    DEFAULT_SITES.forEach(function (d) {
      var url = normalizeUrl(d.url);
      var exists = state.sites.some(function (s) {
        return s.id === d.id || (s.url === url && s.category === d.category);
      });
      if (!exists) state.sites.push({ id: d.id, name: d.name, url: url, category: d.category });
    });
    state.seeded = true;
    save();
  }

  /* ---------- Sidebar ---------- */
  function categories() {
    var seen = [];
    state.sites.forEach(function (s) { if (seen.indexOf(s.category) < 0) seen.push(s.category); });
    return seen;
  }

  function renderSide() {
    var wrap = $("#cats");
    wrap.innerHTML = "";
    var cats = categories();

    if (!cats.length) {
      wrap.appendChild(el("p", "hint", "No sites yet. Add your first one and give it a category."));
    }

    cats.forEach(function (cat) {
      var sites = state.sites.filter(function (s) { return s.category === cat; });
      var sec = el("section", "cat" + (state.collapsed[cat] ? " collapsed" : ""));
      sec.style.setProperty("--c", hue(cat));

      var head = el("div", "cat-head");
      var tog = el("button", "cat-toggle");
      tog.type = "button";
      tog.setAttribute("aria-expanded", String(!state.collapsed[cat]));
      var chev = icon("chev"); chev.classList.add("chev");
      tog.appendChild(chev);
      tog.appendChild(el("span", "swatch"));
      tog.appendChild(el("span", "cat-name", cat));
      tog.appendChild(el("span", "count", String(sites.length)));
      tog.addEventListener("click", function () {
        state.collapsed[cat] = !state.collapsed[cat];
        save(); renderSide();
      });
      head.appendChild(tog);

      var allOpen = sites.every(function (s) { return state.open.indexOf(s.id) >= 0; });
      head.appendChild(iconBtn(allOpen ? "close" : "play",
        allOpen ? "Close all in " + cat : "Open all in " + cat,
        function () { setCategoryOpen(cat, !allOpen); }));
      head.appendChild(iconBtn("edit", "Rename category", function () { renameCategory(cat); }));
      head.appendChild(iconBtn("trash", "Delete category", function () { deleteCategory(cat); }, "del"));
      sec.appendChild(head);

      var ul = el("ul", "sites");
      sites.forEach(function (s) {
        var on = state.open.indexOf(s.id) >= 0;
        var li = el("li", "site" + (on ? " on" : ""));
        li.style.setProperty("--c", hue(cat));
        var main = el("button", "site-main");
        main.type = "button";
        main.title = on ? "Close " + s.name : "Open " + s.name;
        main.setAttribute("aria-pressed", String(on));
        main.appendChild(el("span", "dot"));
        main.appendChild(el("span", "site-name", s.name));
        main.addEventListener("click", function () { toggleOpen(s.id); });
        li.appendChild(main);
        li.appendChild(iconBtn("edit", "Edit " + s.name, function () { openDialog(s.id); }));
        li.appendChild(iconBtn("trash", "Delete " + s.name, function () { deleteSite(s.id); }, "del"));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      wrap.appendChild(sec);
    });

    var list = $("#catList");
    list.innerHTML = "";
    cats.forEach(function (c) { var o = document.createElement("option"); o.value = c; list.appendChild(o); });
  }

  /* ---------- Players ---------- */
  var ALLOW = "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write";
  var SANDBOX = "allow-scripts allow-same-origin allow-forms allow-presentation";
  // "tabs": pop-ups open as normal browser tabs, but a player cannot redirect this page.
  var SANDBOX_TABS = SANDBOX + " allow-popups allow-popups-to-escape-sandbox";

  function effectiveMode(s) {
    return (s && s.popup && s.popup !== "default") ? s.popup : state.mode;
  }
  function applySandbox(fr, s) {
    var mode = effectiveMode(s);
    if (mode === "tabs") fr.setAttribute("sandbox", SANDBOX_TABS);
    else if (mode === "block") fr.setAttribute("sandbox", SANDBOX);
    else fr.removeAttribute("sandbox");
  }

  function buildPlayer(s) {
    var p = el("article", "player");
    p.style.setProperty("--c", hue(s.category));
    p.dataset.id = s.id;

    var bar = el("header", "pbar");
    var title = el("span", "ptitle", s.name);
    title.appendChild(el("span", "pcat", s.category));
    bar.appendChild(title);

    var fr = document.createElement("iframe");
    fr.title = s.name;
    fr.allow = ALLOW;
    fr.setAttribute("allowfullscreen", "");
    applySandbox(fr, s);
    fr.src = toEmbed(s.url);

    bar.appendChild(iconBtn("refresh", "Reload", function () { fr.src = fr.src; }));
    bar.appendChild(iconBtn("focus", "Make larger", function () { toggleFocus(s.id); }));
    bar.appendChild(iconBtn("fullscreen", "Full screen", function () {
      if (p.requestFullscreen) p.requestFullscreen();
    }));
    var ext = el("a", "icon-btn");
    ext.href = s.url; ext.target = "_blank"; ext.rel = "noopener";
    ext.title = "Open in a new tab"; ext.setAttribute("aria-label", "Open in a new tab");
    ext.appendChild(icon("external"));
    bar.appendChild(ext);
    bar.appendChild(iconBtn("close", "Close player", function () { toggleOpen(s.id); }));

    var abar = el("div", "abar");
    var addr = document.createElement("input");
    addr.type = "text";
    addr.spellcheck = false;
    addr.autocomplete = "off";
    addr.value = s.url;
    addr.title = "Page address";
    addr.setAttribute("aria-label", "Page address for " + s.name);
    function navigate() {
      var target = normalizeUrl(addr.value);
      if (!target) { addr.value = fr.src; return; }
      addr.value = target;
      fr.src = toEmbed(target);
    }
    addr.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); navigate(); addr.blur(); }
    });
    abar.appendChild(addr);
    abar.appendChild(iconBtn("go", "Go", navigate));

    var body = el("div", "pbody");
    body.appendChild(el("div", "loading", "Loading " + s.name + "…"));
    body.appendChild(fr);

    p.appendChild(bar);
    p.appendChild(abar);
    p.appendChild(body);
    return p;
  }

  function colsFor(n) {
    if (state.layout !== "auto") return parseInt(state.layout, 10);
    if (n <= 1) return 1;
    if (n === 2) return 2;
    if (n === 3) return 3;
    if (n === 4) return 2;
    if (n <= 9) return 3;
    return 4;
  }

  function syncPlayers() {
    var grid = $("#grid");
    players.forEach(function (p, id) {
      if (state.open.indexOf(id) < 0) { p.remove(); players.delete(id); }
    });
    state.open.forEach(function (id) {
      if (!players.has(id)) {
        var s = byId(id);
        if (!s) return;
        var p = buildPlayer(s);
        players.set(id, p);
        grid.appendChild(p);
      }
    });
    if (focusId && !players.has(focusId)) focusId = null;
    players.forEach(function (p, id) { p.classList.toggle("focus", id === focusId); });

    var n = players.size;
    grid.style.setProperty("--cols", colsFor(n));
    grid.style.display = n ? "" : "none";
    $("#playing").textContent = n ? n + (n === 1 ? " player" : " players") : "";
    $("#closeAll").disabled = !n;

    var empty = $("#empty");
    empty.hidden = n > 0;
    if (!n) {
      if (!state.sites.length) {
        $("#emptyTitle").textContent = "Add your first site";
        $("#emptyText").textContent = "Use Add site, choose a category, and it will show up in the list. Then click it to play.";
      } else {
        $("#emptyTitle").textContent = "Nothing playing";
        $("#emptyText").textContent = "Pick a site from the list to open it here. Open as many as you like and they will share the page.";
      }
    }
  }

  function renderAll() {
    renderSide();
    syncPlayers();
    document.querySelectorAll("[data-layout]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.layout === state.layout));
    });
    $("#popupMode").value = state.mode;
    $("#side").classList.toggle("hidden", state.sideHidden);
  }

  /* ---------- Actions ---------- */
  function toggleOpen(id) {
    var i = state.open.indexOf(id);
    if (i >= 0) state.open.splice(i, 1); else state.open.push(id);
    save(); renderAll();
  }
  function setCategoryOpen(cat, open) {
    state.sites.filter(function (s) { return s.category === cat; }).forEach(function (s) {
      var i = state.open.indexOf(s.id);
      if (open && i < 0) state.open.push(s.id);
      if (!open && i >= 0) state.open.splice(i, 1);
    });
    save(); renderAll();
  }
  function toggleFocus(id) {
    focusId = focusId === id ? null : id;
    players.forEach(function (p, pid) { p.classList.toggle("focus", pid === focusId); });
    var p = players.get(focusId);
    if (p) p.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function deleteSite(id) {
    var s = byId(id);
    if (!s || !confirm("Delete “" + s.name + "”?")) return;
    state.sites = state.sites.filter(function (x) { return x.id !== id; });
    state.open = state.open.filter(function (x) { return x !== id; });
    save(); renderAll();
  }
  function renameCategory(cat) {
    var name = prompt("Rename category", cat);
    if (name == null) return;
    name = name.trim();
    if (!name || name === cat) return;
    state.sites.forEach(function (s) { if (s.category === cat) s.category = name; });
    if (state.collapsed[cat]) { state.collapsed[name] = true; delete state.collapsed[cat]; }
    rebuildPlayers();
    save(); renderAll();
  }
  function deleteCategory(cat) {
    var n = state.sites.filter(function (s) { return s.category === cat; }).length;
    if (!confirm("Delete “" + cat + "” and its " + n + (n === 1 ? " site?" : " sites?"))) return;
    var ids = state.sites.filter(function (s) { return s.category === cat; }).map(function (s) { return s.id; });
    state.sites = state.sites.filter(function (s) { return s.category !== cat; });
    state.open = state.open.filter(function (id) { return ids.indexOf(id) < 0; });
    save(); renderAll();
  }
  function rebuildPlayers() {
    players.forEach(function (p) { p.remove(); });
    players.clear();
  }

  /* ---------- Dialog ---------- */
  var dlg = $("#dlg");
  function openDialog(id) {
    editingId = id || null;
    var s = id ? byId(id) : null;
    $("#dlgTitle").textContent = s ? "Edit site" : "Add site";
    $("#fName").value = s ? s.name : "";
    $("#fUrl").value = s ? s.url : "";
    $("#fCat").value = s ? s.category : "";
    $("#fPopup").value = s && s.popup ? s.popup : "default";
    $("#err").textContent = "";
    dlg.showModal();
    $("#fName").focus();
  }
  $("#addBtn").addEventListener("click", function () { openDialog(); });
  $("#cancelBtn").addEventListener("click", function () { dlg.close(); });
  $("#siteForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#fName").value.trim();
    var url = normalizeUrl($("#fUrl").value);
    var cat = $("#fCat").value.trim();
    var popup = $("#fPopup").value;
    if (!name) { $("#err").textContent = "Give the site a name."; return; }
    if (!url) { $("#err").textContent = "Enter a valid web address."; return; }
    if (!cat) { $("#err").textContent = "Choose or type a category."; return; }

    if (editingId) {
      var s = byId(editingId);
      s.name = name; s.url = url; s.category = cat; s.popup = popup;
      var p = players.get(editingId);
      if (p) { p.remove(); players.delete(editingId); }
    } else {
      var ns = { id: uid(), name: name, url: url, category: cat, popup: popup };
      state.sites.push(ns);
      state.open.push(ns.id);
    }
    dlg.close();
    save(); renderAll();
  });

  /* ---------- Toolbar ---------- */
  document.querySelectorAll("[data-layout]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.layout = b.dataset.layout;
      save(); renderAll();
    });
  });
  $("#popupMode").addEventListener("change", function (e) {
    state.mode = e.target.value;
    players.forEach(function (p, id) {
      var s = byId(id);
      if (s && s.popup && s.popup !== "default") return;
      var fr = p.querySelector("iframe");
      applySandbox(fr, s);
      fr.src = fr.src;
    });
    save();
  });
  $("#closeAll").addEventListener("click", function () {
    state.open = []; focusId = null;
    save(); renderAll();
  });
  $("#sideToggle").addEventListener("click", function () {
    state.sideHidden = !state.sideHidden;
    save(); renderAll();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && focusId && !dlg.open && !document.fullscreenElement) toggleFocus(focusId);
  });

  /* ---------- Export / import ---------- */
  $("#exportBtn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify({ sites: state.sites }, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "football-arena-sites.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $("#importBtn").addEventListener("click", function () { $("#importFile").click(); });
  $("#importFile").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        var list = Array.isArray(d) ? d : d.sites;
        if (!Array.isArray(list)) throw new Error("bad file");
        var added = 0;
        list.forEach(function (x) {
          var url = normalizeUrl(x && x.url);
          if (!url || !x.name || !x.category) return;
          var dupe = state.sites.some(function (s) { return s.url === url && s.category === x.category; });
          if (dupe) return;
          state.sites.push({ id: uid(), name: String(x.name), url: url, category: String(x.category) });
          added++;
        });
        save(); renderAll();
        alert("Imported " + added + (added === 1 ? " site." : " sites."));
      } catch (err) {
        alert("That file could not be read. Import a JSON file exported from Football Arena.");
      }
      e.target.value = "";
    };
    r.readAsText(f);
  });

  /* ---------- Start ---------- */
  load();
  seedDefaults();
  renderAll();
})();
