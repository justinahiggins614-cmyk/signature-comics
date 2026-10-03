#!/usr/bin/env python3
"""The Signature Comic Store — cosmic crossover event builder.

Generates universe-shaking EVENT issues (skey "event", series
"COSMIC CROSSOVER EVENTS") starring the hero archetype catalog against
apocalypse-level villains across time/space backdrops:
  1. SIEGE OF AMALTHEA — on Jupiter's first moon
  2. WAR IN THE SAURIAN DAWN — the dinosaur era
  3. THE FARFALLEN CENTURY — the far future
  4. WHEN TIMELINES COLLAPSE — across collapsing timelines

IDs continue from data/state.json next_index (never regenerates existing
issues). Reuses make_comics' deterministic machinery (G, fill, BEATS).
Every name/text is trademark-scanned before storage. Rebuilds
comics.idx.json.gz, api.json, and sitemap.xml (adds ?series=event).
"""
import gzip, json, os, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_comics import (G, fill, BEATS, ADJ, NOUNS, QUIPS, TRUTHS, CLOSERS,
                         MOVING, TIMES, REVEALS, WEIGHTS, SKIES, HORIZONS,
                         YEARS, ARTIFACTS, FOE_DESC, SIGNS, GEN_NOTE, idx_row)
from trademark_safe import is_tm_clean, sanitize_text

ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
VOL = os.path.join(DATA, "volumes")
IDXF = os.path.join(DATA, "index")
STATE_F = os.path.join(DATA, "state.json")
CHUNK = 100
SITE = "https://justinahiggins614-cmyk.github.io/signature-comics/"
SALT = 20261002

EVENTS = [
    {"key": "amalthea",
     "name": "SIEGE OF AMALTHEA",
     "desc": "The Unmaking comes for Jupiter's first moon — and every hero answers.",
     "villain": "THE UNMAKING",
     "foe": "an entropy storm wearing a crown of dead stars",
     "scenes": ["the rust-red plains of Amalthea", "beneath Jupiter's looming eye",
                "the crater of First Landing", "the ice caves of Amalthea",
                "the shattered muster-field", "the long shadow of the gas giant"],
     "places": ["Amalthea", "the Jovian muster", "First Landing"]},
    {"key": "saurian",
     "name": "WAR IN THE SAURIAN DAWN",
     "desc": "The Maw of Eons hunts through deep time — the heroes follow it down.",
     "villain": "THE MAW OF EONS",
     "foe": "a devourer of eras with teeth like epochs",
     "scenes": ["the fern-choked valleys", "beneath the thunder-lizards' feet",
                "the tar-seep flats", "the nesting grounds",
                "the ash-fall ridges", "the inland sea at dusk"],
     "places": ["the Saurian Dawn", "Old Pangaea", "the Nesting Grounds"]},
    {"key": "farfallen",
     "name": "THE FARFALLEN CENTURY",
     "desc": "In the 31st century, the Pale Extinction returns — and legends wake.",
     "villain": "THE PALE EXTINCTION",
     "foe": "a white silence that unmakes memory itself",
     "scenes": ["the spire-cities of the 31st century", "the rust deserts of old Earth",
                "orbit above the museum-world", "the last library satellite",
                "the memorial fields", "the dawn vaults"],
     "places": ["the 31st century", "Museum-Earth", "the Last Library"]},
    {"key": "collapse",
     "name": "WHEN TIMELINES COLLAPSE",
     "desc": "Every when is falling into every other when — the Null-King reigns the wreckage.",
     "villain": "THE NULL-KING",
     "foe": "a king of the collapsed timeline, crowned in stopped clocks",
     "scenes": ["the shattering timestream", "between the seconds",
                "the crossroads of eras", "the unraveling now",
                "the museum of lost tomorrows", "the still point"],
     "places": ["the Timestream", "the Crossroads", "everywhen"]},
]

TITLE_PATTERNS = [
    "{evname} Part {part}: {hero} Holds the Line",
    "The {adj} {evnoun}",
    "{evname}: {power} Against {villain}",
    "{hero} at {place}",
    "{evname} — {ally}'s {noun2}",
    "When {place} {burns}",
]

EVNOUNS = ["Stand", "Reckoning", "Siege", "Vigil", "Storm", "Oath"]


def load_heroes():
    p = os.path.join(DATA, "heroes.json")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def make_event_issue(i, ev_idx, part, heroes):
    """Deterministic event issue. i = global 1-based comic index."""
    g = G(SALT + 700000 + i)
    ev = EVENTS[ev_idx]
    team = g.sample(heroes, g.num(3, 5))
    chars = [{"name": h["name"], "code": h["code"],
              "power": g.pick(h["powers"])} for h in team]
    hero, ally = chars[0], chars[1]
    ctx = {
        "evname": ev["name"], "part": str(part),
        "hero": hero["code"], "ally": ally["code"],
        "villain": ev["villain"],
        "scene": g.pick(ev["scenes"]), "scene2": g.pick(ev["scenes"]),
        "place": g.pick(ev["places"]),
        "power": hero["power"], "power2": hero["power"],
        "power3": ally["power"], "power4": g.pick(ally["power"].split()) ,
        "artifact": g.pick(ARTIFACTS), "foe_desc": ev["foe"],
        "signs": g.pick(SIGNS), "quips": g.pick(QUIPS),
        "truth": g.pick(TRUTHS), "closer": g.pick(CLOSERS),
        "moving": g.pick(MOVING), "time": g.pick(TIMES),
        "reveal": g.pick(REVEALS), "weight": g.pick(WEIGHTS),
        "sky": g.pick(SKIES), "horizon": g.pick(HORIZONS),
        "years": g.pick(YEARS), "adj": g.pick(ADJ),
        "nouns": g.pick(NOUNS), "noun2": "Oath",
        "evnoun": g.pick(EVNOUNS), "num2": str(g.num(100, 999)),
        "races": "races", "hurries": "hurries", "streaks": "streaks",
        "pushes": "pushes", "fails": "fails", "pulses": "pulses",
        "burns": "burns", "shakes": "shakes", "sings": "sings",
        "heals": "heals", "settles": "settles", "glows": "glows",
        "leaps": "leaps", "dives": "dives", "charges": "charges",
        "dims": "dims", "shatters": "shatters", "running": "running out",
        "final": "final exchange",
    }
    title = fill(g, g.pick(TITLE_PATTERNS), ctx)
    pages = []
    for beat, templates in BEATS:
        cap = fill(g, g.pick(templates), ctx)
        dlg = ""
        if g.num(0, 9) < 7:
            speaker = g.pick([hero, ally])
            dtemplates = [
                "\"{quips}\"", "\"{place} first. Everything else later.\"",
                "\"{villain} can't have gone far. Look for {signs}.\"",
                "\"Then we do it the loud way.\"",
                "\"{hero} — the {scene}! Now!\"",
                "\"Hold the line! For {place}!\"",
            ]
            dlg = fill(g, g.pick(dtemplates), ctx)
            dlg = dlg.replace("{hero}", speaker["code"])
            dlg_speaker = speaker["code"]
        else:
            dlg_speaker = ""
        pages.append({"cap": cap, "dlg": dlg, "who": dlg_speaker,
                      "scene": ctx["scene"] if beat in ("hook", "denouement") else ctx["scene2"],
                      "beat": beat})
    desc = ("%s — Part %d of %s. %s Starring %s. %s" % (
        ev["name"], part, ev["name"], ev["desc"],
        ", ".join(c["code"] + " (" + c["name"] + ")" for c in chars),
        pages[0]["cap"]))
    words = sum(len(p["cap"].split()) + len(p["dlg"].split()) for p in pages)
    rec = {
        "id": "JAH-COMIC-%06d" % i,
        "series": "COSMIC CROSSOVER EVENTS", "skey": "event",
        "num": ev_idx * 6 + part,
        "title": title, "chars": chars, "desc": desc,
        "pages": pages, "words": words,
        "note": GEN_NOTE + " Cosmic crossover event issue.",
        "event": ev["key"],
    }
    return rec


def main():
    heroes = load_heroes()
    # trademark-check event villains/names
    for ev in EVENTS:
        for label, text in (("villain", ev["villain"]), ("name", ev["name"]),
                            ("foe", ev["foe"])):
            if not is_tm_clean(text):
                print("TRADEMARK FAILURE:", ev["key"], label, text)
                sys.exit(1)
    with open(STATE_F) as f:
        st = json.load(f)
    start = st["next_index"]
    recs = []
    n = 0
    for ev_idx in range(4):
        for part in range(1, 7):
            i = start + n
            rec = make_event_issue(i, ev_idx, part, heroes)
            # sanitize all text fields
            g = G(SALT + 900000 + i)
            rec["title"], _ = sanitize_text(rec["title"], g)
            rec["desc"], _ = sanitize_text(rec["desc"], g)
            for p in rec["pages"]:
                p["cap"], _ = sanitize_text(p["cap"], g)
                p["dlg"], _ = sanitize_text(p["dlg"], g)
            rec["_i"] = i
            recs.append(rec)
            n += 1
    # write chunks
    by_chunk = {}
    for r in recs:
        cn = (r["_i"] - 1) // CHUNK + 1
        by_chunk.setdefault(cn, []).append(r)
    for cn, chunk_recs in sorted(by_chunk.items()):
        # merge with existing chunk if present
        fn = os.path.join(VOL, "comics-c%05d.json.gz" % cn)
        existing = []
        if os.path.exists(fn):
            with gzip.open(fn, "rt", encoding="utf-8") as f:
                existing = json.load(f)
        ids = {r["id"] for r in existing}
        merged = existing + [{k: v for k, v in r.items() if k != "_i"}
                             for r in chunk_recs if r["id"] not in ids]
        with gzip.open(fn, "wt", encoding="utf-8") as f:
            json.dump(merged, f)
    # extend index
    idxp = os.path.join(IDXF, "comics.idx.json.gz")
    with gzip.open(idxp, "rt", encoding="utf-8") as f:
        idx = json.load(f)
    have = {r["id"] for r in idx}
    for r in recs:
        if r["id"] not in have:
            row = idx_row({k: v for k, v in r.items() if k != "_i"})
            row["chunk"] = (r["_i"] - 1) // CHUNK + 1
            idx.append(row)
    with gzip.open(idxp, "wt", encoding="utf-8") as f:
        json.dump(idx, f)
    # state
    st["next_index"] = start + n
    with open(STATE_F, "w") as f:
        json.dump(st, f)
    # api + sitemap (reuse drip helpers)
    sys.path.insert(0, HERE)
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "drip_comics", os.path.join(HERE, "drip_comics.py"))
    drip = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(drip)
    api = drip.build_api(idx)
    api["heroes"] = len(heroes)
    api["events"] = [e["name"] for e in EVENTS]
    with open(os.path.join(IDXF, "api.json"), "w") as f:
        json.dump(api, f, indent=1)
    n_urls = drip.build_sitemap(idx)
    # add event series link if missing
    print("EVENTS: +%d issues (%s..%s), total %d, %d sitemap urls" % (
        n, recs[0]["id"], recs[-1]["id"], len(idx), n_urls))

if __name__ == "__main__":
    main()
