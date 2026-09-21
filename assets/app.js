/* Judy@CS: renders the metro map from data/roadmap.json and data/resources.json.
   Plain JavaScript, no libraries. Progress is kept in this browser's localStorage only. */
(function () {
  "use strict";

  var STORE_KEY = "judycs.visited.v1";
  var LEVELS = { easy: "Easy start", medium: "Some effort", later: "When you are ready" };
  var TYPES = { site: "Website", video: "Video", course: "Course", book: "Book", tool: "Tool",
                community: "Community", event: "Event", program: "Programme" };
  var TOPICS = { start: "Start here", python: "Python", cpp: "C++", tools: "Tools", thinking: "Thinking",
                 maths: "Maths", computers: "How computers work", cairo: "Cairo and campus", perks: "Perks and passports", side: "Side quests" };
  var KINDS = { interchange: "Interchange", terminus: "Terminus" };
  var CHEERS = [
    [0, "The train is at the platform."],
    [1, "First stop done. The hardest one."],
    [5, "You are properly on your way."],
    [12, "A regular commuter now."],
    [25, "Halfway across the city."],
    [40, "You could draw this map from memory."],
    [999, "End of the line. Time to build your own map."]
  ];

  var resources = {};   // id -> resource
  var roadmap = null;
  var visited = loadVisited();

  function loadVisited() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveVisited() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(visited))); } catch (e) { /* private mode */ }
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style") node.setAttribute("style", v);
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return node;
  }

  function key(lineId, stId) { return lineId + "/" + stId; }

  // ---------- a resource card (used on stations and in the library)
  function pickCard(res, opts) {
    opts = opts || {};
    var top = el("div", { class: "pick-top" }, [
      el("a", { href: res.url, target: "_blank", rel: "noopener", text: res.name }),
      opts.star ? el("span", { class: "star-badge", text: "★ Start with this" }) : null
    ]);
    var meta = el("div", { class: "pick-meta" }, [
      el("span", { class: "tag", text: TYPES[res.type] || res.type }),
      el("span", { class: "tag", text: res.cost }),
      res.time ? el("span", { class: "tag", text: res.time }) : null,
      res.lang === "ar" ? el("span", { class: "tag tag-ar", text: "In Arabic · بالعربي" }) : null,
      opts.showLevel ? el("span", { class: "badge lvl-" + res.level, text: LEVELS[res.level] }) : null
    ]);
    return el("li", { class: "pick" + (opts.star ? " star" : "") }, [
      top, meta,
      el("p", { class: "pick-why", text: res.why }),
      opts.note ? el("p", { class: "pick-note", text: opts.note }) : null
    ]);
  }

  // ---------- a station
  function stationNode(line, st) {
    var k = key(line.id, st.id);
    var cardId = "card-" + line.id + "-" + st.id;
    var li = el("li", { class: "station k-" + st.kind + (visited.has(k) ? " visited" : ""), id: k, "data-key": k });

    var btn = el("button", { class: "st-btn", type: "button", "aria-expanded": "false", "aria-controls": cardId }, [
      el("span", { class: "st-name", text: st.name }),
      KINDS[st.kind] ? el("span", { class: "st-kind", text: KINDS[st.kind] }) : null,
      el("span", { class: "badge lvl-" + st.level, text: LEVELS[st.level] }),
      el("span", { class: "chev", "aria-hidden": "true" })
    ]);
    btn.addEventListener("click", function () { toggle(li); });

    var picks = el("ul", { class: "picks" }, st.picks.map(function (p) {
      var res = resources[p.ref];
      return res ? pickCard(res, { star: p.star, note: p.note }) : null;
    }));

    var connects = null;
    if (st.connects && st.connects.length) {
      connects = el("div", { class: "connects" }, [el("span", { class: "connects-label", text: "Change here for" })].concat(
        st.connects.map(function (c) {
          var target = lineById(c.line);
          return el("a", { class: "connect", href: "#" + key(c.line, c.station), style: "--line:" + target.color }, [
            el("span", { class: "roundel", text: target.code, "aria-hidden": "true" }),
            el("span", { text: c.label })
          ]);
        })));
    }

    var box = el("input", { type: "checkbox" });
    box.checked = visited.has(k);
    box.addEventListener("change", function () {
      if (box.checked) visited.add(k); else visited.delete(k);
      li.classList.toggle("visited", box.checked);
      saveVisited(); updateProgress();
    });

    var card = el("div", { class: "card", id: cardId, hidden: true }, [
      el("div", { class: "card-grid" }, [
        el("div", { class: "card-main" }, [
          el("h3", { text: "What is this, really?" }),
          el("p", { class: "intro", text: st.intro }),
          st.ar ? el("span", { class: "aside-ar", lang: "ar", dir: "rtl", text: st.ar }) : null,
          el("h3", { text: "For example" }),
          el("p", { class: "example", text: st.example }),
          el("h3", { text: "Why you will care" }),
          el("p", { text: st.why }),
          el("div", { class: "boss" }, [el("h3", { text: line.bossLabel || "Boss fight" }), el("p", { text: st.boss })])
        ]),
        el("div", { class: "card-side" }, [
          el("h3", { text: "Go here" }),
          picks
        ])
      ]),
      connects,
      el("label", { class: "visit" }, [box, el("span", { text: "I have visited this station" })])
    ]);

    li.appendChild(el("span", { class: "dot", "aria-hidden": "true" }));
    li.appendChild(btn);
    li.appendChild(card);
    return li;
  }

  function toggle(li, forceOpen) {
    var btn = li.querySelector(".st-btn"), card = li.querySelector(".card");
    var open = forceOpen === true ? true : card.hidden;
    card.hidden = !open;
    li.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  function lineById(id) { return roadmap.lines.filter(function (l) { return l.id === id; })[0]; }

  // ---------- render everything
  function render() {
    var nav = document.getElementById("network");
    var host = document.getElementById("lines");
    nav.textContent = ""; host.textContent = "";

    roadmap.lines.forEach(function (line) {
      nav.appendChild(el("a", { class: "net-chip", href: "#line-" + line.id, style: "--line:" + line.color }, [
        el("span", { class: "roundel", text: line.code, "aria-hidden": "true" }),
        el("span", { class: "net-name", text: line.name }),
        el("span", { class: "net-count", id: "net-count-" + line.id })
      ]));

      var section = el("section", { class: "line" + (line.dashed ? " dashed" : ""), id: "line-" + line.id, style: "--line:" + line.color, "aria-labelledby": "h-" + line.id }, [
        el("div", { class: "line-head" }, [
          el("span", { class: "roundel", text: line.code, "aria-hidden": "true" }),
          el("div", null, [
            el("h2", { id: "h-" + line.id, text: line.name }),
            el("p", { class: "line-tag", text: line.tagline }),
            el("p", { class: "line-count", id: "line-count-" + line.id })
          ])
        ]),
        el("ol", { class: "stations" }, line.stations.map(function (st) { return stationNode(line, st); }))
      ]);
      host.appendChild(section);
    });

    updateProgress();
    renderLibraryFilters();
    renderLibrary();
    openFromHash(false);
  }

  function updateProgress() {
    var total = 0, done = 0;
    roadmap.lines.forEach(function (line) {
      var n = line.stations.length, d = line.stations.filter(function (s) { return visited.has(key(line.id, s.id)); }).length;
      total += n; done += d;
      var txt = d + " of " + n + " stations visited";
      document.getElementById("line-count-" + line.id).textContent = txt;
      document.getElementById("net-count-" + line.id).textContent = d + "/" + n;
    });
    document.getElementById("overall-text").textContent = done + " of " + total + " stations visited";
    var bar = document.getElementById("overall-bar");
    bar.setAttribute("aria-valuemax", total); bar.setAttribute("aria-valuenow", done);
    bar.firstElementChild.style.width = (total ? (100 * done / total) : 0) + "%";
    var cheer = CHEERS[0][1];
    CHEERS.forEach(function (c) { if (done >= Math.min(c[0], total)) cheer = c[1]; });
    if (done < total && cheer === CHEERS[CHEERS.length - 1][1]) cheer = CHEERS[CHEERS.length - 2][1];
    document.getElementById("overall-cheer").textContent = cheer;
  }

  // ---------- deep links: #python/loops opens that station
  function openFromHash(scroll) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id || id.indexOf("/") === -1) return;
    var li = document.getElementById(id);
    if (!li) return;
    toggle(li, true);
    if (scroll !== false) {
      li.scrollIntoView({ block: "start" });
      var btn = li.querySelector(".st-btn"); if (btn) btn.focus({ preventScroll: true });
    } else {
      setTimeout(function () { li.scrollIntoView({ block: "start" }); }, 0);
    }
  }
  window.addEventListener("hashchange", function () { openFromHash(true); });

  // ---------- library
  function renderLibraryFilters() {
    var topicSel = document.getElementById("lib-topic"), typeSel = document.getElementById("lib-type");
    var topics = {}, types = {};
    Object.keys(resources).forEach(function (id) { topics[resources[id].topic] = 1; types[resources[id].type] = 1; });
    Object.keys(TOPICS).forEach(function (t) { if (topics[t]) topicSel.appendChild(el("option", { value: t, text: TOPICS[t] })); });
    Object.keys(TYPES).forEach(function (t) { if (types[t]) typeSel.appendChild(el("option", { value: t, text: TYPES[t] })); });
    ["lib-search", "lib-topic", "lib-type"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", renderLibrary);
    });
  }
  function renderLibrary() {
    var q = document.getElementById("lib-search").value.trim().toLowerCase();
    var topic = document.getElementById("lib-topic").value, type = document.getElementById("lib-type").value;
    var list = document.getElementById("lib-list"); list.textContent = "";
    var all = Object.keys(resources).map(function (id) { return resources[id]; });
    var shown = all.filter(function (r) {
      if (topic && r.topic !== topic) return false;
      if (type && r.type !== type) return false;
      if (!q) return true;
      var hay = (r.name + " " + r.why + " " + (TOPICS[r.topic] || "") + " " + (TYPES[r.type] || "") + " " + (r.lang === "ar" ? "arabic عربي" : "")).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
    });
    shown.forEach(function (r) { list.appendChild(pickCard(r, { showLevel: true })); });
    document.getElementById("lib-count").textContent = "Showing " + shown.length + " of " + all.length + ".";
  }

  // ---------- load
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " returned " + r.status);
      return r.json();
    });
  }
  Promise.all([getJSON("data/roadmap.json"), getJSON("data/resources.json")]).then(function (out) {
    roadmap = out[0];
    out[1].resources.forEach(function (r) { resources[r.id] = r; });
    render();
  }).catch(function (err) {
    var host = document.getElementById("lines"); host.textContent = "";
    var box = el("div", { class: "error" }, [
      el("p", null, [el("strong", { text: "The map could not load." })]),
      el("p", { text: "If you opened this file directly from your disk, the browser blocks the data files. Start a small local server in the project folder instead:" }),
      el("p", null, [el("code", { text: "python3 -m http.server 8000" })]),
      el("p", { text: "Then open http://localhost:8000 in the browser." }),
      el("p", { class: "fine", text: String(err) })
    ]);
    host.appendChild(box);
  });
})();
