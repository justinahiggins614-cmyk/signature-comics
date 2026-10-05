#!/usr/bin/env python3
"""Signature Comic Store — catalog metadata builder.

Builds, from the sealed data volumes (never modifies issue records):
  1. data/index/series-index.json   — 9 series, permanent JAH-COMIC-SERIES-######## IDs
  2. data/index/characters-index.json — recurring characters mined from all
     issues, grouped by codename, permanent JAH-CHARACTER-######## IDs
  3. data/index/events-index.json   — 4 cosmic crossover events with
     participating issues/heroes (derived from event issue titles)
  4. data/index/hashes.json.gz      — per-issue SHA-256 over canonical JSON
  5. data/index/hash-manifest.json  — file-level SHA-256 for every data file
  6. data/index/*-schema.json       — JSON Schemas (comic, series, hero,
     character, event) + comic-record-example.json
  7. data/index/comics-manifest.json — the master manifest
  8. data/index/changelog.json      — catalog changelog
  9. Enriches data/index/api.json with schema_version, catalog_version,
     index_sha256, total_heroes, total_events, chunk_count
 10. Stamps the static crawlable count block into index.html
     (<!-- STATIC-COUNTS --> marker; JS replaces it live on load)

Canonical hash serialization (must match the client-side verifier in
index.html): json.dumps(record, sort_keys=True, separators=(",",":"),
ensure_ascii=False) encoded as UTF-8, SHA-256 hex. The hashed object is the
stored issue record with the "content_hash" key removed (there is none
stored; hashes live only in hashes.json.gz).

Safe to re-run at any time: outputs are fully regenerated from sealed
volumes; issue records are never rewritten.
"""
import gzip
import hashlib
import html
import json
import os
import re
import datetime
import zoneinfo

EDT = zoneinfo.ZoneInfo("America/New_York")


def edt_date(ts):
    """Snapshot date in Manon's timezone (America/New_York), not UTC.

    The drip runs in the small hours; a UTC date would read as tomorrow's
    date to him. Parse the UTC ISO timestamp and convert to EDT/EST.
    """
    try:
        dt = datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt.astimezone(EDT).date().isoformat()
    except Exception:
        return str(ts)[:10]

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
VOL = os.path.join(DATA, "volumes")
IDXF = os.path.join(DATA, "index")
SITE = "https://justinahiggins614-cmyk.github.io/signature-comics/"

SCHEMA_VERSION = "1.0"
CATALOG_VERSION = "1.0"
LICENSE = ("Free to read and share. Original generated works by/for the "
           "Signature system, by Justin Addam Higgins. No real publishers' "
           "characters, titles, or likenesses.")


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_records():
    recs = []
    fns = sorted(f for f in os.listdir(VOL)
                 if f.startswith("comics-c") and f.endswith(".json.gz"))
    chunks = {}
    for fn in fns:
        with gzip.open(os.path.join(VOL, fn), "rt", encoding="utf-8") as f:
            chunk = json.load(f)
        n = int(fn[8:13])
        chunks[n] = len(chunk)
        for r in chunk:
            r = dict(r)
            r["_chunk"] = n
            recs.append(r)
    recs.sort(key=lambda r: r["id"])
    return recs, chunks


def canon_bytes(rec):
    clean = {k: v for k, v in rec.items()
             if not k.startswith("_") and k != "content_hash"}
    return json.dumps(clean, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False).encode("utf-8")


def sha256_hex(b):
    return hashlib.sha256(b).hexdigest()


def write_json(name, obj):
    p = os.path.join(IDXF, name)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")
    return p


# ---------------------------------------------------------------- series
SERIES_META = [
    # (skey, genre, audience, description)
    ("signal", "Cosmic adventure", "General audiences",
     "A team of cosmic guardians keeps the beacon-network of the far colonies lit."),
    ("ember", "Fantasy adventure", "General audiences",
     "In a valley of ash and frost, young wardens carry living ember-flames between the last warm holds."),
    ("circuit", "Cyberpunk mystery", "Teen and up",
     "Neon-row couriers dive the city's ghost frequencies and find a signal never meant to be heard."),
    ("tide", "Sea adventure", "General audiences",
     "Harbor kids and old sailors bound by tide-oaths guard the sea-roads between Gullrest and the drowned places."),
    ("gloam", "Cozy mystery", "General audiences",
     "Lantern-keepers patrol the fog city after dark, solving the small strange mysteries the daylight misses."),
    ("starlog", "Science-fiction anthology", "General audiences",
     "The survey ship Wayfarer charts the far dark, one strange world per issue."),
    ("clockwork", "Steampunk adventure", "General audiences",
     "Tinkerers and their brass automatons keep the gear-city wound."),
    ("junior", "Kids adventure", "Ages 6 and up",
     "The Maple Street kids and their treehouse club: small heroes, big heart, everyday wonders."),
    ("event", "Crossover event", "General audiences",
     "Universe-shaking crossovers: united heroes face apocalypse-level threats across time and space."),
]


def build_series_index(recs):
    by_skey = {}
    for r in recs:
        by_skey.setdefault(r["skey"], []).append(r)
    meta = {m[0]: m for m in SERIES_META}
    out = []
    for i, (skey, items) in enumerate(
            sorted(by_skey.items(), key=lambda kv: kv[1][0]["series"]), 1):
        sname = items[0]["series"]
        m = meta.get(skey, (skey, "Adventure", "General audiences", ""))
        first, last = items[0]["id"], items[-1]["id"]
        h = sha256_hex((sname + "|" + m[3]).encode("utf-8"))
        out.append({
            "series_id": "JAH-COMIC-SERIES-%08d" % i,
            "skey": skey,
            "name": sname,
            "description": m[3],
            "genre": m[1],
            "audience": m[2],
            "creation_mode": "GENERATED",
            "creator": "Justin Addam Higgins",
            "issue_count": len(items),
            "first_issue": first,
            "last_issue": last,
            "canonical_url": SITE + "?series=" + skey,
            "version": "1.0",
            "content_hash": h,
        })
    return out


# ---------------------------------------------------------------- characters
def build_characters_index(recs):
    chars = {}
    for r in recs:
        for c in r.get("chars", []):
            code = c.get("code", "").strip()
            if not code:
                continue
            e = chars.setdefault(code, {"names": {}, "powers": set(),
                                        "series": set(), "issues": []})
            e["names"][c.get("name", "")] = e["names"].get(c.get("name", ""), 0) + 1
            if c.get("power"):
                e["powers"].add(c["power"])
            e["series"].add(r["series"])
            e["issues"].append(r["id"])
    out = []
    for i, code in enumerate(sorted(chars), 1):
        e = chars[code]
        name = max(e["names"], key=lambda k: e["names"][k])
        issues = sorted(set(e["issues"]))
        out.append({
            "character_id": "JAH-CHARACTER-%08d" % i,
            "code": code,
            "name": name,
            "aliases": sorted(n for n in e["names"] if n != name),
            "powers": sorted(e["powers"]),
            "series": sorted(e["series"]),
            "first_appearance": issues[0],
            "appearances": issues,
            "appearance_count": len(issues),
            "creation_mode": "GENERATED",
            "canonical_url": SITE + "?character=" + code.replace(" ", "+"),
            "version": "1.0",
            "grouping_note": ("Grouped by hero codename across all issues; "
                              "codename is the stable identity, secret-identity "
                              "names may vary by issue."),
        })
    return out


# ---------------------------------------------------------------- events
EVENTS = [
    ("JAH-COMIC-EVENT-00000001", "amalthea", "SIEGE OF AMALTHEA",
     "The Unmaking comes for Jupiter's first moon — and every hero answers.",
     "THE UNMAKING"),
    ("JAH-COMIC-EVENT-00000002", "saurian", "WAR IN THE SAURIAN DAWN",
     "The Maw of Eons hunts through deep time — the heroes follow it down.",
     "THE MAW OF EONS"),
    ("JAH-COMIC-EVENT-00000003", "farfallen", "THE FARFALLEN CENTURY",
     "In the 31st century, the Pale Extinction returns — and legends wake.",
     "THE PALE EXTINCTION"),
    ("JAH-COMIC-EVENT-00000004", "collapse", "WHEN TIMELINES COLLAPSE",
     "Every when is falling into every other when — the Null-King reigns the wreckage.",
     "THE NULL-KING"),
]


def build_events_index(recs):
    ev_issues = [r for r in recs if r.get("skey") == "event"]
    # Every event issue's desc opens with "{EVNAME} — Part N of {EVNAME}."
    # (see code/make_events.py) — the exact, reliable membership key.
    by_event = {}
    for r in ev_issues:
        d = r.get("desc", "")
        m = re.match(r"^(.+?) — Part \d+ of ", d)
        if m:
            by_event.setdefault(m.group(1).strip(), []).append(r)
    out = []
    for eid, key, name, desc, villain in EVENTS:
        parts = sorted(by_event.get(name, []), key=lambda r: r["num"])
        heroes = sorted({c["code"] for r in parts for c in r.get("chars", [])})
        series = sorted({r["series"] for r in parts})
        out.append({
            "event_id": eid,
            "name": name,
            "description": desc,
            "villain": villain,
            "status": "COMPLETE",
            "creation_mode": "GENERATED",
            "participating_series": series,
            "participating_heroes": heroes,
            "issues": [r["id"] for r in parts],
            "issue_count": len(parts),
            "reading_order": "by issue number within the event",
            "canonical_url": SITE + "?series=event",
            "version": "1.0",
            "derivation_note": ("Event membership from the issue description "
                                "pattern '{EVNAME} — Part N of {EVNAME}.' "
                                "(code/make_events.py); event issues carry "
                                "skey 'event'."),
        })
    return out


# ---------------------------------------------------------------- hashes
def build_hashes(recs):
    table = {}
    for r in recs:
        table[r["id"]] = sha256_hex(canon_bytes(r))
    p = os.path.join(IDXF, "hashes.json.gz")
    with gzip.open(p, "wt", encoding="utf-8") as f:
        json.dump(table, f, separators=(",", ":"))
    return p, table


def build_hash_manifest():
    files = []
    for dp, _, fns in os.walk(DATA):
        for fn in sorted(fns):
            fp = os.path.join(dp, fn)
            rel = os.path.relpath(fp, ROOT)
            with open(fp, "rb") as f:
                files.append({"file": rel,
                              "sha256": sha256_hex(f.read()),
                              "bytes": os.path.getsize(fp)})
    man = {"generated": utcnow(),
           "schema_version": SCHEMA_VERSION,
           "files": files}
    return write_json("hash-manifest.json", man), files


# ---------------------------------------------------------------- schemas
def schema_comic():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": SITE + "data/index/comics-schema.json",
        "title": "JAH Comic Issue Record",
        "description": ("One finished original generated comic issue. Records are "
                        "immutable: corrections create a new record version, never "
                        "an in-place rewrite."),
        "type": "object",
        "required": ["id", "series", "skey", "num", "title", "chars", "desc",
                     "words", "pages", "note"],
        "properties": {
            "id": {"type": "string", "pattern": "^JAH-COMIC-[0-9]{6}$",
                   "description": "Permanent immutable issue ID. Never reused."},
            "series": {"type": "string"},
            "skey": {"type": "string"},
            "num": {"type": "integer", "minimum": 1,
                    "description": "Issue number within its series. Never renumbered."},
            "title": {"type": "string"},
            "chars": {"type": "array", "items": {
                "type": "object",
                "required": ["code", "name", "power"],
                "properties": {
                    "code": {"type": "string",
                             "description": "Hero codename — the stable character identity."},
                    "name": {"type": "string",
                             "description": "Secret identity name (may vary by issue)."},
                    "power": {"type": "string"}}}},
            "desc": {"type": "string"},
            "words": {"type": "integer", "minimum": 1},
            "pages": {"type": "array", "minItems": 1, "items": {
                "type": "object",
                "required": ["cap", "beat", "scene"],
                "properties": {
                    "cap": {"type": "string"},
                    "dlg": {"type": "string"},
                    "who": {"type": "string"},
                    "scene": {"type": "string"},
                    "beat": {"type": "string",
                             "enum": ["hook", "complication", "escalation",
                                      "turn", "climax", "resolution"]}}}},
            "note": {"type": "string"},
            "creation_mode": {"type": "string", "enum": ["GENERATED"],
                              "description": "All catalog issues are generated originals."},
        },
    }


def schema_series():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": SITE + "data/index/series-schema.json",
        "title": "JAH Comic Series Record",
        "type": "object",
        "required": ["series_id", "skey", "name", "issue_count",
                     "first_issue", "last_issue", "canonical_url"],
        "properties": {
            "series_id": {"type": "string",
                          "pattern": "^JAH-COMIC-SERIES-[0-9]{8}$"},
            "skey": {"type": "string"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "genre": {"type": "string"},
            "audience": {"type": "string"},
            "creation_mode": {"type": "string"},
            "creator": {"type": "string"},
            "issue_count": {"type": "integer", "minimum": 0},
            "first_issue": {"type": "string"},
            "last_issue": {"type": "string"},
            "canonical_url": {"type": "string", "format": "uri"},
            "version": {"type": "string"},
            "content_hash": {"type": "string", "pattern": "^[0-9a-f]{64}$"},
        },
    }


def schema_hero():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": SITE + "data/index/hero-schema.json",
        "title": "JAH Hero Record",
        "description": ("Signature-original hero. Heroes are site canon; they are "
                        "NOT phone-book canon AIs and claim no JAH-AI ID."),
        "type": "object",
        "required": ["id", "code", "name", "archetype", "powers", "look",
                     "backstory", "series", "note"],
        "properties": {
            "id": {"type": "string", "pattern": "^JAH-HERO-[0-9]{6}$"},
            "code": {"type": "string"},
            "name": {"type": "string"},
            "archetype": {"type": "string"},
            "powers": {"type": "array", "items": {"type": "string"}},
            "look": {"type": "object",
                     "required": ["desc", "suit", "cape"]},
            "backstory": {"type": "string"},
            "series": {"type": "string"},
            "by": {"type": "string"},
            "note": {"type": "string"},
            "custom": {"type": "boolean"},
            "creation_mode": {"type": "string",
                              "enum": ["GENERATED", "USER-CREATED"]},
        },
    }


def schema_character():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": SITE + "data/index/character-schema.json",
        "title": "JAH Character Record",
        "description": "Recurring character mined from issue records, grouped by codename.",
        "type": "object",
        "required": ["character_id", "code", "appearances", "first_appearance"],
        "properties": {
            "character_id": {"type": "string",
                             "pattern": "^JAH-CHARACTER-[0-9]{8}$"},
            "code": {"type": "string"},
            "name": {"type": "string"},
            "aliases": {"type": "array", "items": {"type": "string"}},
            "powers": {"type": "array", "items": {"type": "string"}},
            "series": {"type": "array", "items": {"type": "string"}},
            "first_appearance": {"type": "string"},
            "appearances": {"type": "array",
                            "items": {"type": "string",
                                      "pattern": "^JAH-COMIC-[0-9]{6}$"}},
            "appearance_count": {"type": "integer", "minimum": 1},
            "creation_mode": {"type": "string"},
            "canonical_url": {"type": "string"},
            "version": {"type": "string"},
        },
    }


def schema_event():
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": SITE + "data/index/event-schema.json",
        "title": "JAH Crossover Event Record",
        "type": "object",
        "required": ["event_id", "name", "issues", "issue_count"],
        "properties": {
            "event_id": {"type": "string",
                         "pattern": "^JAH-COMIC-EVENT-[0-9]{8}$"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "villain": {"type": "string"},
            "status": {"type": "string", "enum": ["COMPLETE", "ONGOING"]},
            "creation_mode": {"type": "string"},
            "participating_series": {"type": "array",
                                     "items": {"type": "string"}},
            "participating_heroes": {"type": "array",
                                      "items": {"type": "string"}},
            "issues": {"type": "array",
                       "items": {"type": "string",
                                 "pattern": "^JAH-COMIC-[0-9]{6}$"}},
            "issue_count": {"type": "integer", "minimum": 1},
            "reading_order": {"type": "string"},
            "canonical_url": {"type": "string"},
            "version": {"type": "string"},
        },
    }


# ---------------------------------------------------------------- manifest / api
def build_all():
    os.makedirs(IDXF, exist_ok=True)
    recs, chunks = load_records()
    total = len(recs)
    words = sum(r["words"] for r in recs)

    series_idx = build_series_index(recs)
    write_json("series-index.json", {
        "generated": utcnow(), "schema_version": SCHEMA_VERSION,
        "count": len(series_idx), "series": series_idx})

    chars_idx = build_characters_index(recs)
    write_json("characters-index.json", {
        "generated": utcnow(), "schema_version": SCHEMA_VERSION,
        "count": len(chars_idx),
        "grouping": "by hero codename across all issues",
        "characters": chars_idx})

    events_idx = build_events_index(recs)
    write_json("events-index.json", {
        "generated": utcnow(), "schema_version": SCHEMA_VERSION,
        "count": len(events_idx), "events": events_idx})

    # heroes: keep data/heroes.json as the store; publish a wrapped index
    heroes = []
    hp = os.path.join(DATA, "heroes.json")
    if os.path.exists(hp):
        with open(hp, encoding="utf-8") as f:
            heroes = json.load(f)
    write_json("heroes-index.json", {
        "generated": utcnow(), "schema_version": SCHEMA_VERSION,
        "count": len(heroes), "heroes": heroes})

    hash_path, hashes = build_hashes(recs)
    with open(hash_path, "rb") as f:
        index_sha = sha256_hex(f.read())
    hash_man_path, _files = build_hash_manifest()

    write_json("comics-schema.json", schema_comic())
    write_json("series-schema.json", schema_series())
    write_json("hero-schema.json", schema_hero())
    write_json("character-schema.json", schema_character())
    write_json("event-schema.json", schema_event())

    # example record: first issue + its hash
    ex = dict(recs[0])
    ex.pop("_chunk", None)
    ex["content_hash"] = hashes[ex["id"]]
    ex["canonical_url"] = SITE + "?issue=" + ex["id"]
    write_json("comic-record-example.json", {
        "schema": SITE + "data/index/comics-schema.json",
        "schema_version": SCHEMA_VERSION,
        "hash_algorithm": "SHA-256",
        "canonical_serialization": (
            'json.dumps(record, sort_keys=True, separators=(",",":"), '
            'ensure_ascii=False) as UTF-8'),
        "record": ex})

    manifest = {
        "site_id": "signature-comics",
        "site_name": "The Signature Comic Store",
        "site_note": "SITE TITLE PROVISIONAL — awaiting Manon's confirmation",
        "site_version": "1.0",
        "total_issues": total,
        "total_words": words,
        "series_count": len(series_idx),
        "series_counts": {s["name"]: s["issue_count"] for s in series_idx},
        "hero_count": len(heroes),
        "character_count": len(chars_idx),
        "event_count": len(events_idx),
        "chunk_count": len(chunks),
        "chunk_size": 100,
        "goal": 1000000,
        "progress_pct": round(total / 1000000 * 100, 4),
        "comic_schema_version": SCHEMA_VERSION,
        "catalog_version": CATALOG_VERSION,
        "index_sha256": index_sha,
        "sitemap_version": "1.0",
        "created": "2026-10-02",
        "updated": utcnow(),
        "license": LICENSE,
        "provenance_policy": ("Every issue is an original generated comic by/for "
                              "the Signature system. Records are immutable and "
                              "deterministic from their seed."),
        "originality_policy": ("No real publishers' characters, titles, or "
                               "likenesses. Automated trademark screening on "
                               "every record; results are an internal "
                               "originality check, not a legal determination."),
        "canonical_url": SITE,
        "machine_readable": {
            "api": "data/index/api.json",
            "manifest": "data/index/comics-manifest.json",
            "catalog": "data/index/comics-catalog.json",
            "index_gz": "data/index/comics.idx.json.gz",
            "series": "data/index/series-index.json",
            "heroes": "data/index/heroes-index.json",
            "characters": "data/index/characters-index.json",
            "events": "data/index/events-index.json",
            "hashes": "data/index/hashes.json.gz",
            "hash_manifest": "data/index/hash-manifest.json",
            "schemas": ["data/index/comics-schema.json",
                        "data/index/series-schema.json",
                        "data/index/hero-schema.json",
                        "data/index/character-schema.json",
                        "data/index/event-schema.json"],
            "llms_txt": "llms.txt",
            "sitemap": "sitemap.xml",
        },
    }
    write_json("comics-manifest.json", manifest)

    # changelog (preserve existing entries)
    clp = os.path.join(IDXF, "changelog.json")
    entries = []
    if os.path.exists(clp):
        try:
            entries = json.load(open(clp, encoding="utf-8")).get("entries", [])
        except Exception:
            entries = []
    stamp = utcnow()
    if not any(e.get("version") == "1.0-meta" and e.get("date") == stamp[:10]
               for e in entries):
        entries.append({
            "date": stamp[:10],
            "version": "1.0-meta",
            "change": ("Machine-readable suite published: series/character/event "
                       "indexes, JSON schemas, per-issue SHA-256 hashes, master "
                       "manifest, static count stamping."),
            "issues_added": 0,
        })
    write_json("changelog.json", {"entries": entries})

    # enrich api.json (keep build_api's core fields; add authority fields)
    api_p = os.path.join(IDXF, "api.json")
    api = json.load(open(api_p, encoding="utf-8")) if os.path.exists(api_p) else {}
    api.update({
        "total_issues": total,
        "total_words": words,
        "series": {s["name"]: s["issue_count"] for s in series_idx},
        "goal": 1000000,
        "schema_version": SCHEMA_VERSION,
        "catalog_version": CATALOG_VERSION,
        "index_sha256": index_sha,
        "total_heroes": len(heroes),
        "total_events": len(events_idx),
        "chunk_count": len(chunks),
        "updated": utcnow(),
    })
    write_json("api.json", api)

    stamp_static_counts(total, words, api["updated"], len(series_idx))
    return {"total": total, "words": words, "series": len(series_idx),
            "heroes": len(heroes), "characters": len(chars_idx),
            "events": len(events_idx), "hashes": len(hashes)}


STATIC_MARK = "<!-- STATIC-COUNTS -->"
STATIC_END = "<!-- /STATIC-COUNTS -->"
MARCH_MARK = "<!-- STATIC-MARCH -->"
MARCH_END = "<!-- /STATIC-MARCH -->"


def stamp_static_counts(total, words, updated, n_series):
    """Replace the STATIC-COUNTS / STATIC-MARCH blocks in index.html with a
    crawlable, no-JS snapshot. The live JS replaces #stats content and the
    march text on load, so the stamp is only ever a fallback."""
    p = os.path.join(ROOT, "index.html")
    src = open(p, encoding="utf-8").read()
    date = edt_date(updated)
    pct = total / 1000000 * 100
    counts_block = (
        STATIC_MARK + "\n"
        '<div class="stats" id="stats">'
        '<div class="stat"><b>' + f"{total:,}" + "</b><span>finished issues</span></div>"
        '<div class="stat"><b>' + f"{n_series}" + "</b><span>original series</span></div>"
        '<div class="stat"><b>' + f"{words/1000:.0f}K" + "</b><span>words of story</span></div>"
        '<div class="stat"><b>1M</b><span>issue goal</span></div></div>\n'
        '<p class="matchline" id="staticsnap">Catalog snapshot ' + date + " · "
        + f"{total:,}" + " of 1,000,000 issues (" + f"{pct:.2f}" + "%)</p>\n"
        + STATIC_END
    )
    march_block = (
        MARCH_MARK
        + f"{total:,}" + " of 1,000,000 issues (" + f"{pct:.2f}"
        + "%) — catalog snapshot " + date
        + MARCH_END
    )
    changed = False
    pat_c = re.compile(re.escape(STATIC_MARK) + r".*?" + re.escape(STATIC_END), re.S)
    if pat_c.search(src):
        src = pat_c.sub(lambda m: counts_block, src)
        changed = True
    pat_m = re.compile(re.escape(MARCH_MARK) + r".*?" + re.escape(MARCH_END), re.S)
    if pat_m.search(src):
        src = pat_m.sub(lambda m: march_block, src)
        changed = True
    if changed:
        open(p, "w", encoding="utf-8").write(src)
    return changed


if __name__ == "__main__":
    r = build_all()
    print("META: %(total)d issues, %(words)d words, %(series)d series, "
          "%(heroes)d heroes, %(characters)d characters, %(events)d events, "
          "%(hashes)d hashes" % r)
