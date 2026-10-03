/* The Signature Comic Store — hero archetype catalog, hero detail view,
   roleplay Q&A, and the Hero Creator popup. Loaded by index.html before
   the main inline script. Uses globals from index.html: $, esc,
   figureSVG, rdSpeak, copyText, download, rdStop. */
var HEROES = null, HEROES_P = null;
var _scrollLocks=0;
function lockScroll(){_scrollLocks++;document.body.style.overflow="hidden"}
function unlockScroll(){_scrollLocks=Math.max(0,_scrollLocks-1);if(!_scrollLocks)document.body.style.overflow=""}

/* ===== JAH NETWORK 10-FIX shared record helpers (additive) =====
   Used by hero-catalog.js AND index.html's inline script. */
var JN_ENGINE_LINE="<b>Engine:</b> Signature Llama (live where available) with the built-in JAHtalk on-device fallback — it always answers.";
function jnBadgeHTML(label){return '<div style="margin:6px 0"><span class="stbadge">'+esc(label)+'</span></div>'}
function jnPanelHTML(id,ver){return '<div class="recpanel" role="group" aria-label="Record actions"><span class="rpid">ID: '+esc(id)+'</span><span class="rpver">VERSION '+esc(ver||"v1.0")+'</span>'+
 '<button data-rp="open">OPEN</button><button data-rp="src">SOURCE</button><button data-rp="share">SHARE</button>'+
 '<button data-rp="copy">COPY</button><button data-rp="dl">DOWNLOAD</button><button data-rp="read">READ ALOUD</button></div>'}
function jnProvHTML(text){return '<div class="prov">Provenance: '+esc(text)+'</div>'}
function jnAICardHTML(prof){
  var duties=(prof.abilities||[]).map(function(x){return esc(x)}).join("; ");
  return '<div class="jaicard"><b>🤖 AI IDENTITY</b><br><b>Name:</b> '+esc(prof.name||"AI assistant")+' — '+esc(prof.description||"")+
   (duties?'<br><b>Duties:</b> '+duties:"")+'<br>'+JN_ENGINE_LINE+'</div>';
}
function jnShareLink(url){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){alert("Link copied.")},function(){prompt("Copy this link:",url)});}
  else prompt("Copy this link:",url);
}
function jnWireHeroPanel(h){
  var panel=document.querySelector("#heroview .recpanel");if(!panel)return;
  var deep="https://justinahiggins614-cmyk.github.io/signature-comics/?hero="+encodeURIComponent(h.id);
  panel.querySelectorAll("button").forEach(function(b){
    var a=b.getAttribute("data-rp");
    b.onclick=function(){
      if(a==="open"){location.hash="#hero="+h.id;}
      else if(a==="src"){if(!panel.querySelector(".srcnote")){var sn=document.createElement("span");sn.className="srcnote";sn.style.color="var(--mut)";sn.textContent="Source: "+(h.custom?"created in the on-site Hero Creator — saved on this device only":"Comic Store hero catalog · data/heroes.json");panel.appendChild(sn);}}
      else if(a==="share"){jnShareLink(deep);}
      else if(a==="copy"){copyText(heroText(h),"hcopybtn");}
      else if(a==="dl"){$("hdlbtn").click();}
      else if(a==="read"){$("hrdbtn").click();}
    };
  });
}


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
/* Famous-character guard: the store only publishes ORIGINAL Signature
   characters. If a user types a famous name we EXPLAIN what happens and
   offer original alternatives — never silently alter it. */
var FAMOUS = ("superman,batman,spiderman,wonderwoman,ironman,captainamerica,hulk,thor," +
 "flash,aquaman,greenlantern,wolverine,deadpool,xmen,avengers,justiceleague,joker,thanos," +
 "darthvader,lukeskywalker,harrypotter,goku,naruto,pikachu,mario,sonic,zelda,kratos," +
 "masterchief,geralt,optimusprime,bumblebee,godzilla,dracula,frankenstein,sherlockholmes," +
 "jamesbond,indianajones,terminator,robocop,predator,spongebob,shrek,elsa,moana,mulan," +
 "cinderella,peterpan,scoobydoo,garfield,snoopy,hellokitty,mickeymouse,transformers," +
 "powerrangers,tmnt,ghostbusters,heman,thundercats,gijoe,sephiroth,cloudstrife").split(",");
function normName(s) { return String(s || "").toLowerCase().replace(/[^a-z]/g, ""); }
function famousHit(name) {
  var n = normName(name);
  if (!n) return null;
  for (var i = 0; i < FAMOUS.length; i++) if (n === FAMOUS[i]) return FAMOUS[i];
  return null;
}
function suggestNames(seed) {
  var h = 0, i;
  for (i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  var A = ["AE","VO","KY","ZE","THA","MI","SO","RA","LU","KA"],
      B = ["RI","LO","NA","THE","DA","RO"],
      C = ["ON","IX","ARA","EUS","OR","IA"], out = [];
  for (i = 0; i < 3; i++) {
    h = ((h * 1103515245) + 12345) >>> 0;
    out.push(A[h % 10] + B[(h >>> 4) % 6] + C[(h >>> 8) % 6]);
  }
  return out;
}
/* My Series: reader-started series, stored on-device. */
function mySeries() {
  try { return JSON.parse(localStorage.getItem("sigcomics_myseries") || "[]"); }
  catch (e) { return []; }
}
function saveMySeries(a) {
  try { localStorage.setItem("sigcomics_myseries", JSON.stringify(a)); }
  catch (e) {}
}
function upsertSeries(h) {
  var all = mySeries(), s = null, i;
  for (i = 0; i < all.length; i++) if (all[i].name === h.series) s = all[i];
  if (!s) { s = { name: h.series, heroIds: [], by: h.by }; all.push(s); }
  if (s.heroIds.indexOf(h.id) < 0) s.heroIds.push(h.id);
  saveMySeries(all);
  return s;
}
function heroById(id) {
  if (HEROES) for (var i = 0; i < HEROES.length; i++)
    if (HEROES[i].id === id) return HEROES[i];
  var mine = myHeroes();
  for (var j = 0; j < mine.length; j++)
    if (mine[j].id === id) return mine[j];
  return null;
}
/* Painted hero portraits (2026-10-03): original Signature heroes, painted
   comic-book portrait style. Falls back to the classic SVG silhouette for
   user-created heroes or if the art fails to load (offline). */
var HEROPORTRAIT={"BASTION":"portrait-bastion.jpg","SWIFTSURE":"portrait-swiftsure.jpg","NIGHTWARDEN":"portrait-nightwarden.jpg","STRANDLINE":"portrait-strandline.jpg","THE KINDRED":"portrait-kindred.jpg","STARWARDEN":"portrait-starwarden.jpg","PLATEFORGE":"portrait-plateforge.jpg","RUNESAYER":"portrait-runesayer.jpg","SHIELDMAIDEN SABLE":"portrait-sable.jpg","PRISMWARD":"portrait-prismward.jpg","PLIANT":"portrait-pliant.jpg","MAGNITUDE":"portrait-magnitude.jpg","TIDECROWN":"portrait-tidecrown.jpg","GALEFORGE":"portrait-galeforge.jpg","UMBRASTEP":"portrait-umbrastep.jpg","BRIARCLAW":"portrait-briarclaw.jpg","VOIDHERALD":"portrait-voidherald.jpg","MOUNTAINHEART":"portrait-mountainheart.jpg","SPROCKET":"portrait-sprocket.jpg","KINGSWARD":"portrait-kingsward.jpg"};
function heroPortraitSVG(h, size) {
  var s = size || 1, seed = 0, i;
  for (i = 0; i < h.id.length; i++) seed += h.id.charCodeAt(i);
  var pf = HEROPORTRAIT[h.code];
  if (pf) {
    var pid = "hp" + seed + "_" + Math.floor(s * 100);
    HEROPORTRAITROWS[pid] = {h:{id:h.id,code:h.code,look:h.look},size:s};
    return '<span class="hport" id="' + pid + '" style="display:block;width:' + (300 * s) + 'px;max-width:100%">' +
     '<img src="assets/covers/' + pf + '" alt="Painted portrait of ' + esc(h.code) + '" loading="lazy" style="width:100%;height:auto;display:block;border-radius:8px" ' +
     'onerror="heroPortraitFallback(\'' + pid + '\')">' +
     '</span>';
  }
  return heroPortraitSVGClassic(h, size);
}
function heroPortraitFallback(pid){
  var r = HEROPORTRAITROWS[pid]; if (!r) return;
  var el = document.getElementById(pid); if (el) el.innerHTML = heroPortraitSVGClassic(r.h, r.size);
}
var HEROPORTRAITROWS = {};
function heroPortraitSVGClassic(h, size) {
  if (typeof h === "string") { try { h = JSON.parse(h); } catch (e) { return ""; } }
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
  return "\u2726 ORIGINAL SIGNATURE CHARACTER \u2726\n" + h.code + " — " + h.archetype + ". Real name: " + h.name +
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
/* ---- JAHtalk voice (js/jah-talk-fallback.js): shared human-talk layer.
   The deterministic hero Q&A below stays primary and data-grounded.
   JAHtalk.reply handles conversational turns (hello/duties/who are you/
   thanks/bye); JAHtalk.guard scrubs every final reply into human words.
   NOTE: heroes are site-canon Signature originals (JAH-HERO-* IDs), NOT
   phone-book canon AIs — profiles keep their Comic Store identities
   exactly, and claim no JAH-AI ID. ---- */
function heroAIProfile(h, rp) {
  return {
    name: h.code,
    id: h.id,
    description: h.code + " is a " + h.archetype + " of the " + h.series +
      " series. Secret identity: " + h.name + ". " + h.backstory,
    abilities: ["answer questions about my powers", "tell my origin story",
      "talk about my series and the issues I appear in",
      rp ? "stay in character while we talk" : "answer as me when roleplay mode is on"],
    domain: "comics", kind: "persona",
    personaNote: "Original Signature comic hero, identity exactly as the " +
      "Comic Store defines it; not a phone-book canon AI." +
      (rp ? " Speaking in character right now." : "")
  };
}
function heroConversational(ql) {
  return /^(hi|hey|hello|yo|howdy|greetings|good (morning|afternoon|evening))\b/.test(ql)
    || /(what (are|is) your (duties|job|role)|your duties|^duties|what can you do)/.test(ql)
    || /who are you|your name|introduce yourself/.test(ql)
    || /\b(thank|thanks|thx)\b/.test(ql)
    || /^(bye|goodbye|good ?night|see you|later)\b/.test(ql)
    || /how are you|how('| i)s it going|how do you feel/.test(ql);
}
function heroAppearances(code) {
  if (typeof IDX === "undefined" || !IDX || !IDX.length) return null;
  var out = [];
  for (var i = 0; i < IDX.length; i++) {
    var b = IDX[i];
    if (b.c && b.c.indexOf(code) >= 0) out.push(b);
  }
  return out;
}
function renderHero(h) {
  var my = h.custom ? true : false;
  var apps = heroAppearances(h.code), appsHtml = "";
  if (apps && apps.length) {
    appsHtml = '<div class="cast"><h3>\uD83D\uDCDA Appearances — ' + apps.length +
      ' issue' + (apps.length === 1 ? "" : "s") + '</h3><p style="font-size:.85em">' +
      apps.slice(0, 12).map(function (b) {
        return '<a href="#issue=' + b.id + '">' + esc(b.s) + ' #' + b.n + '</a>';
      }).join(" \u00B7 ") +
      (apps.length > 12 ? ' <span style="color:var(--mut)">\u2026and ' +
        (apps.length - 12) + ' more</span>' : '') + '</p></div>';
  }
  var heroGreet = (typeof JAHtalk !== "undefined") ?
    esc(JAHtalk.greet(heroAIProfile(h, false))) : "";
  $("heroview").innerHTML =
   '<div class="issueview"><p><a href="#">' + "&larr;" + ' Back to the racks</a></p>' +
   '<div class="iv-top"><div class="iv-cover">' + heroPortraitSVG(h, 1) + '</div>' +
   '<div class="iv-info"><h1>' + esc(h.code) + '</h1>' +
   '<div class="byline">' + esc(h.archetype) + ' &middot; ' + esc(h.id) +
     (h.by ? ' &middot; Created by <b>' + esc(h.by) + '</b>' : '') + '</div>' +
   '<div class="chips"><span class="chip">' + esc(h.archetype) + '</span>' +
     '<span class="chip">' + esc(h.series) + '</span>' +
     '<span class="chip">Signature original</span>' +
     (my ? '<span class="chip">Fan-made</span><span class="chip">\u2726 Original Signature character</span>' : '') + '</div>' +
   jnBadgeHTML(my ? "USER CREATED" : "SIGNATURE ORIGINAL") +
   jnPanelHTML(h.id) +
   jnProvHTML(my ? "Created by a reader in the on-site Hero Creator — saved on this device only (localStorage)."
                : "Made by the Comic Store hero catalog (code/make_heroes.py) — original Signature characters, curated by the Signature system.") +
   '<div class="actions"><button class="btn red" id="hrdbtn">&#128266; Read aloud</button>' +
   '<button class="btn ghost" id="hcopybtn">&#10697; Copy file</button>' +
   '<button class="btn ghost" id="hdlbtn">&#11015; Download .txt</button>' +
   '<button class="btn ghost" id="hrpbtn">&#127917; Talk to ' + esc(h.code) + '</button></div>' +
   '<div class="desc"><b>Secret identity:</b> ' + esc(h.name) +
     '<br><b>Powers:</b> ' + esc(h.powers.join(", ")) +
     '<br><b>Look:</b> ' + esc(h.look.desc) + '</div>' +
   '<div class="desc" style="margin-top:10px">' + esc(h.backstory) + '</div>' +
   appsHtml +
   '<div class="collect"><b style="width:100%;color:var(--yel)">&#11088; COLLECT &amp; CONNECT</b>' +
   '<a class="btn" href="https://justinahiggins614-cmyk.github.io/signature-3d-print/" target="_blank" rel="noopener">' +
     '&#129717; Get the action figure (3D Print Depository)</a>' +
   '<a class="btn" href="https://justinahiggins614-cmyk.github.io/jah-ai-models/" target="_blank" rel="noopener">' +
     '&#129302; Talk to ' + esc(h.code) + '&rsquo;s character AI (AI Phone Book)</a></div>' +
   '<div class="honest">&#10022; ' + esc(h.note) + '</div>' + '</div></div>' +
   '<div class="qa"><h2>&#128172; Ask about ' + esc(h.code) + '</h2>' +
   '<div id="haiidcard">' + jnAICardHTML(heroAIProfile(h, false)) + '</div>' +
   '<div class="rpbar" id="hrpbar">&#127917; <b>Roleplay mode ON</b> — I answer AS ' + esc(h.code) +
     '. <button class="btn ghost" id="hrpoff">Turn off</button></div>' +
   '<div class="qlog" id="hqlog" aria-live="polite">' +
   (heroGreet ? '<div class="msg a">' + heroGreet + '</div>' : '') +
   '<div class="msg a">I know ' + esc(h.code) +
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
  jnWireHeroPanel(h);
  $("hrpbtn").onclick = function () {
    RP = true; $("hrpbar").classList.add("show");
    $("haiidcard").innerHTML = jnAICardHTML(heroAIProfile(h, true));
    hqSay("a", "Roleplay: " + h.code + ' steps forward. "I\'m ' + h.code +
      '. Ask me anything — I\'ll answer as me."');
  };
  $("hrpoff").onclick = function () { RP = false; $("hrpbar").classList.remove("show"); $("haiidcard").innerHTML = jnAICardHTML(heroAIProfile(h, false)); };
  function hqSay(who, t) {
    var log = $("hqlog"), d = document.createElement("div");
    d.className = "msg " + who; d.textContent = t;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function hqAsk() {
    var q = $("hqin").value.trim(); if (!q) return;
    $("hqin").value = ""; hqSay("u", q);
    var P = heroAIProfile(h, RP), ans;
    if (heroConversational(q.toLowerCase()) && typeof JAHtalk !== "undefined")
      ans = JAHtalk.reply(P, q);
    else
      ans = heroQaAnswer(q, h, RP);
    if (typeof JAHtalk !== "undefined") ans = JAHtalk.guard(ans, P);
    hqSay("a", ans);
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
    id: "JAH-HERO-CUSTOM-" + Date.now().toString(36).toUpperCase() +
        Math.floor(Math.random() * 46656).toString(36).toUpperCase(),
    code: code, name: $("chName").value.trim() || "Unknown",
    archetype: $("chArch").value, powers: powers,
    look: { desc: lookTxt, suit: $("chSuit").value, cape: $("chCape").value },
    backstory: $("chOrigin").value.trim() || "A new legend begins.",
    series: $("chSeries").value.trim().toUpperCase() || "THE SIGNATURE CHRONICLES",
    by: $("chBy").value.trim() || "An anonymous creator",
    note: "Signature-original character created by a reader in the Hero Creator, not affiliated with any publisher.",
    creation_mode: "USER-CREATED",
    custom: true
  };
}
function creatorPreview() {
  setStep(2);
  var h = creatorRecord(), warn = "";
  var hit = famousHit(h.code) || famousHit(h.name);
  if (hit) {
    var sug = suggestNames(h.code + h.name);
    warn = '<div class="creatorwarn"><b>\u26a0 That name is taken.</b> &ldquo;' + esc(h.code) +
     '&rdquo; matches a famous character from another publisher. The Comic Store only publishes ' +
     '<b>original Signature characters</b> \u2014 your idea is safe (powers, look, and origin are untouched), ' +
     'but the name has to be original. Pick a suggestion, or type a new name above and preview again:' +
     '<div style="margin-top:8px">' + sug.map(function (s) {
       return '<button class="btn ghost" data-sug="' + s + '">' + s + '</button>';
     }).join(" ") + '</div></div>';
  }
  $("creatorPrev").innerHTML = warn + heroPortraitSVG(h, 0.7) +
   '<div style="margin-top:6px"><span class="origbadge">\u2726 ORIGINAL SIGNATURE CHARACTER</span><br>' +
   '<b style="color:var(--yel)">' + esc(h.code) + '</b>' +
   '<div class="arch">' + esc(h.archetype) + '</div>' +
   (h.by ? '<div class="arch">Created by ' + esc(h.by) + '</div>' : '') + '</div>';
  var bs = $("creatorPrev").querySelectorAll("[data-sug]");
  for (var i = 0; i < bs.length; i++) (function (b) {
    b.onclick = function () { $("chCodename").value = b.dataset.sug; creatorPreview(); };
  })(bs[i]);
}
/* Creator workflow steps: Create -> Preview -> Edit -> Save -> Download -> Start series */
var CSTEPS = ["Create", "Preview", "Edit", "Save", "Download", "Start series"];
function setStep(n) {
  var box = $("creatorSteps");
  if (!box) return;
  box.innerHTML = CSTEPS.map(function (s, i) {
    return '<span class="' + (i + 1 === n ? "on" : (i + 1 < n ? "done" : "")) + '">' +
      (i + 1) + ". " + s + "</span>";
  }).join(" \u2192 ");
}
function renderMySeries() {
  var box = $("mySeries");
  if (!box) return;
  var all = mySeries();
  if (!all.length) {
    box.innerHTML = '<p class="sectsub">No series yet \u2014 start one from the Hero Creator.</p>';
    return;
  }
  box.innerHTML = '<h3 style="color:var(--yel)">\uD83D\uDCDA Your series (' + all.length + ')</h3>' +
   all.map(function (s, i) {
    var heroesHtml = s.heroIds.map(function (id) {
      var h = heroById(id);
      return h ? '<button class="btn ghost" data-sh="' + esc(id) + '">' + esc(h.code) + '</button>' : "";
    }).join(" ");
    return '<div class="myhero"><div><b>' + esc(s.name) + '</b><br>' +
     '<span style="color:var(--mut);font-size:.85em">' + s.heroIds.length +
     ' hero' + (s.heroIds.length === 1 ? "" : "es") + '</span>' +
     '<div class="sheros" style="margin-top:6px;display:none">' + heroesHtml + '</div></div>' +
     '<div><button class="btn ghost" data-sopen="' + i + '">Open</button> ' +
     '<button class="btn ghost" data-sdel="' + i + '">\u2715</button></div></div>';
   }).join("");
  function each(sel, fn) {
    var qs = box.querySelectorAll(sel);
    for (var k = 0; k < qs.length; k++) (function (b) { fn(b); })(qs[k]);
  }
  each("[data-sopen]", function (b) {
    b.onclick = function () {
      var card = b.parentNode.parentNode, d = card.querySelector(".sheros");
      if (d) d.style.display = (d.style.display === "none" ? "block" : "none");
    };
  });
  each("[data-sh]", function (b) {
    b.onclick = function () { var h = heroById(b.dataset.sh); if (h) openCustomHero(h); };
  });
  each("[data-sdel]", function (b) {
    b.onclick = function () {
      var a = mySeries(); a.splice(+b.dataset.sdel, 1); saveMySeries(a); renderMySeries();
    };
  });
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
  $("creatorBtn").onclick = function () {
    $("creatorModal").classList.add("show"); lockScroll(); setStep(1); creatorPreview();
  };
  $("chClose").onclick = function () { $("creatorModal").classList.remove("show"); unlockScroll(); };
  $("creatorModal").addEventListener("click", function (e) {
    if (e.target === $("creatorModal")) { $("creatorModal").classList.remove("show"); unlockScroll(); }
  });
  $("chPreview").onclick = creatorPreview;
  var prev = ["chCodename", "chSuit", "chCape"];
  for (var i = 0; i < prev.length; i++) (function (id) {
    $(id).addEventListener("input", creatorPreview);
  })(prev[i]);
  $("chEdit").onclick = function () {
    setStep(3);
    $("creatorBox").scrollTop = 0;
    var f = $("chCodename");
    if (f) f.focus();
  };
  $("chSave").onclick = function () {
    var h = creatorRecord();
    if (famousHit(h.code) || famousHit(h.name)) {
      creatorPreview(); /* shows the taken-name explainer; nothing saved silently */
      var w = $("creatorPrev");
      if (w && w.scrollIntoView) w.scrollIntoView();
      return;
    }
    setStep(4);
    var mine = myHeroes();
    mine.push(h); saveMyHeroes(mine); renderMyHeroes();
    upsertSeries(h); renderMySeries();
    var m = $("saveMsg");
    if (m) { m.textContent = "\u2713 Saved to My Heroes."; setTimeout(function () { m.textContent = ""; }, 2500); }
  };
  $("chDownload").onclick = function () {
    setStep(5);
    var h = creatorRecord();
    download(h.id + ".txt", heroText(h), "text/plain");
  };
  $("chStartSeries").onclick = function () {
    var h = creatorRecord();
    if (famousHit(h.code) || famousHit(h.name)) {
      creatorPreview(); setStep(2);
      return;
    }
    setStep(6);
    var mine = myHeroes(), found = false, j;
    for (j = 0; j < mine.length; j++) if (mine[j].id === h.id) found = true;
    if (!found) { mine.push(h); saveMyHeroes(mine); renderMyHeroes(); }
    var s = upsertSeries(h); renderMySeries();
    $("creatorModal").classList.remove("show"); unlockScroll();
    var el = document.getElementById("mySeries");
    if (el && el.scrollIntoView) el.scrollIntoView();
    var msg = $("seriesMsg");
    if (msg) {
      msg.textContent = "\uD83D\uDE80 Series \u201c" + s.name + "\u201d started \u2014 " +
        h.code + " stars in issue #1.";
      setTimeout(function () { msg.textContent = ""; }, 5000);
    }
  };
  renderMyHeroes();
  renderMySeries();
  /* export / import / delete-all for device-local heroes */
  var exB=$("expHeroes");
  if(exB)exB.onclick=function(){
    var mine=myHeroes();
    download("my-signature-heroes.json",JSON.stringify({exported:new Date().toISOString(),count:mine.length,heroes:mine},null,1),"application/json");
  };
  var imB=$("impHeroes"),imF=$("impFile");
  if(imB&&imF){
    imB.onclick=function(){imF.click()};
    imF.addEventListener("change",function(){
      var f=imF.files&&imF.files[0];if(!f)return;
      var rd=new FileReader();
      rd.onload=function(){
        try{
          var obj=JSON.parse(rd.result);
          var arr=Array.isArray(obj)?obj:obj.heroes;
          if(!Array.isArray(arr))throw new Error("bad file");
          var mine=myHeroes(),have={},added=0,skipped=0;
          mine.forEach(function(h){have[h.id]=1});
          arr.forEach(function(h){
            if(!h||typeof h!=="object"||!h.id||!h.code){skipped++;return}
            if(have[h.id]){skipped++;return}
            h.custom=true;
            h.creation_mode="USER-CREATED";
            if(!h.note)h.note="Signature-original character imported by a reader in the Hero Creator, not affiliated with any publisher.";
            mine.push(h);have[h.id]=1;added++;
          });
          saveMyHeroes(mine);renderMyHeroes();
          alert("Imported "+added+" hero"+(added===1?"":"s")+(skipped?" ("+skipped+" skipped: invalid or duplicate)":"")+".");
        }catch(e){alert("Could not import: that file is not a valid heroes export.")}
        imF.value="";
      };
      rd.readAsText(f);
    });
  }
  var delB=$("delHeroes");
  if(delB)delB.onclick=function(){
    var mine=myHeroes();
    if(!mine.length){alert("No saved heroes to delete.");return}
    if(confirm("Delete all "+mine.length+" of your saved heroes from this device? This cannot be undone.")){
      saveMyHeroes([]);renderMyHeroes();alert("All saved heroes deleted from this device.");
    }
  };
}
