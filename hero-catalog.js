/* The Signature Comic Store — hero archetype catalog, hero detail view,
   roleplay Q&A, and the Hero Creator popup. Loaded by index.html before
   the main inline script. Uses globals from index.html: $, esc,
   figureSVG, rdSpeak, copyText, download, rdStop. */
var HEROES = null, HEROES_P = null;

function loadHeroes() {
  if (HEROES) return Promise.resolve(HEROES);
  if (!HEROES_P) HEROES_P = fetch("data/heroes.json")
    .then(function (r) { return r.json(); })
    .then(function (h) { HEROES = h; return h; });
  return HEROES_P;
}
function myHeroes() {
  try { return JSON.parse(localStorage.getItem("sigcomics_myheroes") || "[]"); }
  catch (e) { return []; }
}
function saveMyHeroes(a) {
  try { localStorage.setItem("sigcomics_myheroes", JSON.stringify(a)); }
  catch (e) {}
}
function heroById(id) {
  if (HEROES) for (var i = 0; i < HEROES.length; i++)
    if (HEROES[i].id === id) return HEROES[i];
  var mine = myHeroes();
  for (var j = 0; j < mine.length; j++)
    if (mine[j].id === id) return mine[j];
  return null;
}
function heroPortraitSVG(h, size) {
  var s = size || 1, seed = 0, i;
  for (i = 0; i < h.id.length; i++) seed += h.id.charCodeAt(i);
  return '<svg viewBox="0 0 300 380" width="' + (300 * s) + '" height="' + (380 * s) +
   '" role="img" aria-label="' + esc(h.code) + ' portrait">' +
   '<defs><linearGradient id="hp' + seed + '" x1="0" y1="0" x2="0" y2="1">' +
   '<stop offset="0" stop-color="#1b2340"/><stop offset="1" stop-color="#0a0d1c"/>' +
   '</linearGradient></defs>' +
   '<rect width="300" height="380" fill="url(#hp' + seed + ')"/>' +
   '<circle cx="150" cy="120" r="90" fill="' + h.look.cape + '" opacity="0.25"/>' +
   figureSVG(150, 235, 2.6, h.look.suit, h.look.cape, false) +
   '<rect x="20" y="330" width="260" height="40" rx="8" fill="#000" opacity="0.55"/>' +
   '<text x="150" y="355" text-anchor="middle" fill="#ffd23f" font-size="22" ' +
   'font-weight="900" font-family="Arial Black,sans-serif">' + esc(h.code) + '</text></svg>';
}
function heroText(h) {
  return h.code + " — " + h.archetype + ". Real name: " + h.name +
   ". Powers: " + h.powers.join(", ") + ". Look: " + h.look.desc +
   " Backstory: " + h.backstory + " Series: " + h.series + ". " + h.note +
   (h.by ? " Created by " + h.by + "." : "");
}
function renderHeroBand() {
  loadHeroes().then(function (hs) {
    $("heroband").innerHTML = hs.map(function (h) {
      return '<div class="hcard" data-h="' + esc(h.id) + '">' + heroPortraitSVG(h, 0.62) +
       '<h3>' + esc(h.code) + '</h3><div class="arch">' + esc(h.archetype) + '</div></div>';
    }).join("");
    var cards = $("heroband").querySelectorAll(".hcard");
    for (var i = 0; i < cards.length; i++) (function (el) {
      el.onclick = function () { location.hash = "#hero=" + el.dataset.h; };
    })(cards[i]);
  }).catch(function () {
    $("heroband").innerHTML = '<div class="loading">Heroes could not load.</div>';
  });
}
function heroFact(q, h) {
  var ql = q.toLowerCase();
  if (/power|ability|strong/.test(ql)) return h.code + "'s powers: " + h.powers.join(", ") + ".";
  if (/origin|story|became|backstory|history/.test(ql)) return h.backstory;
  if (/series|comic|appear/.test(ql)) return h.code + " stars in " + h.series + ".";
  if (/look|costume|suit|wear|appearance/.test(ql)) return h.look.desc;
  if (/who|name|identity/.test(ql)) return h.code + " is the hero name of " + h.name + " — " + h.archetype + ".";
  if (/creator|made|by/.test(ql)) return h.by ?
    h.code + " was created by " + h.by + " in the Hero Creator." : h.code + " is a " + h.note;
  return h.code + " — " + h.archetype + ". " + h.backstory + " Powers: " + h.powers.join(", ") + ".";
}
function heroQaAnswer(q, h, rp) {
  var ql = q.toLowerCase();
  if (rp) {
    if (/power|strong|ability|what can you do/.test(ql))
      return "\"My gifts? " + h.powers.join(", ") + ". I've trained with them every day since " +
        h.name + " became " + h.code + ".\"";
    if (/who are you|your name|identity|real name/.test(ql))
      return "\"They call me " + h.code + ". Under the mask I'm " + h.name +
        ". The rest is my story to tell — and I'll tell it.\"";
    if (/series|comic|appear/.test(ql))
      return "\"You'll find me in " + h.series + ", alongside the other Signature heroes. " +
        "Grab an issue — start at #1.\"";
    if (/look|costume|suit|wear/.test(ql))
      return "\"" + h.look.desc + " Practical. Distinctive. Mine.\"";
    if (/origin|story|became|backstory/.test(ql))
      return "\"Here's how it happened: " + h.backstory + "\"";
    if (/villain|enemy|fight/.test(ql))
      return "\"Every hero has a shadow. Mine's out there somewhere — and when it shows, " +
        "I'll be ready. " + h.powers[0] + " doesn't miss.\"";
    return "\"Good question. " + heroFact(q, h) + " Ask me anything else — I'm not going anywhere.\"";
  }
  return heroFact(q, h);
}
function renderHero(h) {
  var my = h.custom ? true : false;
  $("heroview").innerHTML =
   '<div class="issueview"><p><a href="#">' + "&larr;" + ' Back to the racks</a></p>' +
   '<div class="iv-top"><div class="iv-cover">' + heroPortraitSVG(h, 1) + '</div>' +
   '<div class="iv-info"><h1>' + esc(h.code) + '</h1>' +
   '<div class="byline">' + esc(h.archetype) + ' &middot; ' + esc(h.id) +
     (h.by ? ' &middot; Created by <b>' + esc(h.by) + '</b>' : '') + '</div>' +
   '<div class="chips"><span class="chip">' + esc(h.archetype) + '</span>' +
     '<span class="chip">' + esc(h.series) + '</span>' +
     '<span class="chip">Signature original</span>' +
     (my ? '<span class="chip">Fan-made</span>' : '') + '</div>' +
   '<div class="actions"><button class="btn red" id="hrdbtn">&#128266; Read aloud</button>' +
   '<button class="btn ghost" id="hcopybtn">&#10697; Copy file</button>' +
   '<button class="btn ghost" id="hdlbtn">&#11015; Download .txt</button>' +
   '<button class="btn ghost" id="hrpbtn">&#127917; Talk to ' + esc(h.code) + '</button></div>' +
   '<div class="desc"><b>Secret identity:</b> ' + esc(h.name) +
     '<br><b>Powers:</b> ' + esc(h.powers.join(", ")) +
     '<br><b>Look:</b> ' + esc(h.look.desc) + '</div>' +
   '<div class="desc" style="margin-top:10px">' + esc(h.backstory) + '</div>' +
   '<div class="collect"><b style="width:100%;color:var(--yel)">&#11088; COLLECT &amp; CONNECT</b>' +
   '<a class="btn" href="https://justinahiggins614-cmyk.github.io/signature-3d-print/" target="_blank" rel="noopener">' +
     '&#129717; Get the action figure (3D Print Depository)</a>' +
   '<a class="btn" href="https://justinahiggins614-cmyk.github.io/jah-ai-models/" target="_blank" rel="noopener">' +
     '&#129302; Talk to ' + esc(h.code) + '&rsquo;s character AI (AI Phone Book)</a></div>' +
   '<div class="honest">&#10022; ' + esc(h.note) + '</div>' + '</div></div>' +
   '<div class="qa"><h2>&#128172; Ask about ' + esc(h.code) + '</h2>' +
   '<div class="rpbar" id="hrpbar">&#127917; <b>Roleplay mode ON</b> — I answer AS ' + esc(h.code) +
     '. <button class="btn ghost" id="hrpoff">Turn off</button></div>' +
   '<div class="qlog" id="hqlog" aria-live="polite"><div class="msg a">I know ' + esc(h.code) +
     '&rsquo;s whole file — ask about their powers, their story, or their series. ' +
     'Or hit the roleplay button and I&rsquo;ll answer in character.</div></div>' +
   '<div class="qrow"><input id="hqin" maxlength="200" placeholder="Ask about ' + esc(h.code) +
     '&hellip;" aria-label="Ask about this hero"><button class="btn" id="hqask">ASK</button></div>' +
   '<div class="qsugs" id="hqsugs"></div></div>' +
   '<p><a href="#">' + "&larr;" + ' Back to the racks</a></p></div>';
  var RP = false;
  $("hrdbtn").onclick = function () { rdSpeak(heroText(h)); };
  $("hcopybtn").onclick = function () { copyText(heroText(h), "hcopybtn"); };
  $("hdlbtn").onclick = function () { download(h.id + ".txt", heroText(h), "text/plain"); };
  $("hrpbtn").onclick = function () {
    RP = true; $("hrpbar").classList.add("show");
    hqSay("a", "Roleplay: " + h.code + ' steps forward. "I\'m ' + h.code +
      '. Ask me anything — I\'ll answer as me."');
  };
  $("hrpoff").onclick = function () { RP = false; $("hrpbar").classList.remove("show"); };
  function hqSay(who, t) {
    var log = $("hqlog"), d = document.createElement("div");
    d.className = "msg " + who; d.textContent = t;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function hqAsk() {
    var q = $("hqin").value.trim(); if (!q) return;
    $("hqin").value = ""; hqSay("u", q); hqSay("a", heroQaAnswer(q, h, RP));
  }
  var hsug = ["What are their powers?", "What is their origin?",
              "What series are they in?", "What do they look like?"];
  $("hqsugs").innerHTML = hsug.map(function (s) {
    return '<button data-q="' + esc(s) + '">' + esc(s) + "</button>";
  }).join("");
  var bs = $("hqsugs").querySelectorAll("button");
  for (var bi = 0; bi < bs.length; bi++) (function (b) {
    b.onclick = function () { $("hqin").value = b.dataset.q; hqAsk(); };
  })(bs[bi]);
  $("hqask").onclick = hqAsk;
  $("hqin").addEventListener("keydown", function (e) { if (e.key === "Enter") hqAsk(); });
  document.title = h.code + " (" + h.archetype + ") — The Signature Comic Store";
}
function openCustomHero(h) {
  rdStop(); $("home").style.display = "none"; $("issueview").style.display = "none";
  $("heroview").style.display = "block"; window.scrollTo(0, 0); renderHero(h);
}
function creatorRecord() {
  var code = $("chCodename").value.trim().toUpperCase() || "UNTITLED HERO";
  var powers = $("chPowers").value.split(",").map(function (s) { return s.trim(); })
    .filter(function (s) { return s; });
  if (!powers.length) powers = ["courage", "heart"];
  var lookTxt = $("chLook").value.trim() ||
    ("A hero in a " + $("chSuit").value + " suit with " + $("chCape").value + " accents.");
  return {
    id: "JAH-HERO-CUSTOM-" + Date.now().toString(36).toUpperCase(),
    code: code, name: $("chName").value.trim() || "Unknown",
    archetype: $("chArch").value, powers: powers,
    look: { desc: lookTxt, suit: $("chSuit").value, cape: $("chCape").value },
    backstory: $("chOrigin").value.trim() || "A new legend begins.",
    series: $("chSeries").value.trim().toUpperCase() || "THE SIGNATURE CHRONICLES",
    by: $("chBy").value.trim() || "An anonymous creator",
    note: "Signature-original character created by a reader in the Hero Creator, not affiliated with any publisher.",
    custom: true
  };
}
function creatorPreview() {
  var h = creatorRecord();
  $("creatorPrev").innerHTML = heroPortraitSVG(h, 0.7) +
   '<div style="margin-top:6px"><b style="color:var(--yel)">' + esc(h.code) + '</b>' +
   '<div class="arch">' + esc(h.archetype) + '</div>' +
   (h.by ? '<div class="arch">Created by ' + esc(h.by) + '</div>' : '') + '</div>';
}
function renderMyHeroes() {
  var mine = myHeroes(), box = $("myHeroes");
  if (!box) return;
  if (!mine.length) { box.innerHTML = '<p class="sectsub">No heroes yet — yours could be the first.</p>'; return; }
  box.innerHTML = '<h3 style="color:var(--yel)">&#127775; Your heroes (' + mine.length + ')</h3>' +
   mine.map(function (h, i) {
    return '<div class="myhero"><div><b>' + esc(h.code) + '</b> ' +
     '<span style="color:var(--mut)">&middot; ' + esc(h.archetype) +
     ' &middot; Created by ' + esc(h.by || "you") + '</span></div>' +
     '<div><button class="btn ghost" data-open="' + i + '">Open</button> ' +
     '<button class="btn ghost" data-dl="' + i + '">&#11015;</button> ' +
     '<button class="btn ghost" data-del="' + i + '">&#10005;</button></div></div>';
   }).join("");
  function each(sel, fn) {
    var bs = box.querySelectorAll(sel);
    for (var k = 0; k < bs.length; k++) (function (b) { fn(b); })(bs[k]);
  }
  each("[data-open]", function (b) { b.onclick = function () { openCustomHero(mine[+b.dataset.open]); }; });
  each("[data-dl]", function (b) { b.onclick = function () {
    var h = mine[+b.dataset.dl]; download(h.id + ".txt", heroText(h), "text/plain"); }; });
  each("[data-del]", function (b) { b.onclick = function () {
    var m = myHeroes(); m.splice(+b.dataset.del, 1); saveMyHeroes(m); renderMyHeroes(); }; });
}
function wireCreator() {
  $("creatorBtn").onclick = function () { $("creatorModal").classList.add("show"); creatorPreview(); };
  $("chClose").onclick = function () { $("creatorModal").classList.remove("show"); };
  $("creatorModal").addEventListener("click", function (e) {
    if (e.target === $("creatorModal")) $("creatorModal").classList.remove("show");
  });
  $("chPreview").onclick = creatorPreview;
  var prev = ["chCodename", "chSuit", "chCape"];
  for (var i = 0; i < prev.length; i++) (function (id) {
    $(id).addEventListener("input", creatorPreview);
  })(prev[i]);
  $("chSave").onclick = function () {
    var h = creatorRecord(), mine = myHeroes();
    mine.push(h); saveMyHeroes(mine); renderMyHeroes();
    $("creatorModal").classList.remove("show");
    download(h.id + ".txt", heroText(h), "text/plain");
    location.hash = "#hero=" + h.id;
  };
  renderMyHeroes();
}
