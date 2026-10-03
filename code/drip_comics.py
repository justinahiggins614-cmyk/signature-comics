#!/usr/bin/env python3
"""The Signature Comic Store — deterministic comic drip generator.

Usage:
    python3 code/drip_comics.py --n 1000    # seed the store
    python3 code/drip_comics.py --n 500     # cron: add more; IDs continue

Determinism: issue #i is always generated from seed SALT+i, so re-running
never changes an existing issue. New issues append into 100-issue gz chunks;
data/index/comics.idx.json.gz is extended; data/index/api.json and
sitemap.xml are regenerated; data/state.json tracks next_index.

Every issue is trademark-sanitized (code/trademark_safe.py) before storage:
character names are reject-and-regenerated until clean; titles/descriptions
get deterministic in-place substitution. All series, characters, places and
stories are ORIGINAL Signature inventions.
"""
import argparse, gzip, json, os, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_comics import make_issue, idx_row, SERIES, G, SALT
from trademark_safe import sanitize_text, sanitize_title, is_tm_clean

ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
VOL = os.path.join(DATA, "volumes")
IDXF = os.path.join(DATA, "index")
STATE_F = os.path.join(DATA, "state.json")
CHUNK = 100
SITE = "https://justinahiggins614-cmyk.github.io/signature-comics/"
GUARD_MB = 800

SNAME = {k: n for k, n, _ in SERIES}

# Extra series not produced by make_comics.make_issue (built by other scripts,
# e.g. code/make_events.py). Included in sitemap ?series= links + api counts.
EXTRA_SERIES = [("event", "COSMIC CROSSOVER EVENTS")]


def load_state():
    if os.path.exists(STATE_F):
        with open(STATE_F) as f:
            return json.load(f)
    return {"next_index": 1}


def save_state(st):
    with open(STATE_F, "w") as f:
        json.dump(st, f)


def chunk_path(i):
    n = (i - 1) // CHUNK + 1
    return os.path.join(VOL, "comics-c%05d.json.gz" % n)


def write_chunk(recs):
    """Write a full chunk. MERGE-writes: if the chunk file already exists
    (e.g. event issues merged in by make_events.py), existing records are
    preserved instead of being wiped — a truncate-write here once deleted
    24 COSMIC CROSSOVER EVENTS issues from chunk 16 (2026-10-02)."""
    fn = chunk_path(recs[0]["_i"])
    existing = []
    if os.path.exists(fn):
        with gzip.open(fn, "rt", encoding="utf-8") as f:
            existing = json.load(f)
    have = {r["id"] for r in existing}
    merged = existing + [{k: v for k, v in r.items() if k != "_i"}
                         for r in recs if r["id"] not in have]
    merged.sort(key=lambda r: r["id"])
    with gzip.open(fn, "wt", encoding="utf-8") as f:
        json.dump(merged, f)
    return fn


def load_idx():
    p = os.path.join(IDXF, "comics.idx.json.gz")
    if os.path.exists(p):
        with gzip.open(p, "rt", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_idx(idx):
    p = os.path.join(IDXF, "comics.idx.json.gz")
    with gzip.open(p, "wt", encoding="utf-8") as f:
        json.dump(idx, f)


def build_api(idx):
    series_counts = {}
    words = 0
    for r in idx:
        series_counts[r["s"]] = series_counts.get(r["s"], 0) + 1
        words += r["w"]
    api = {
        "site": "The Signature Comic Store",
        "site_note": "SITE TITLE PROVISIONAL — awaiting Manon's confirmation",
        "total_issues": len(idx),
        "total_words": words,
        "series": series_counts,
        "goal": 1000000,
        "updated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with open(os.path.join(IDXF, "api.json"), "w") as f:
        json.dump(api, f, indent=1)
    return api


def build_sitemap(idx):
    urls = [SITE]
    for k, n, _ in SERIES:
        urls.append(SITE + "?series=" + k)
    for k, n in EXTRA_SERIES:
        urls.append(SITE + "?series=" + k)
    # static per-series directory pages (pre-rendered issue fallbacks, series-tier)
    urls.append(SITE + "issues.html")
    for k, n, _ in SERIES:
        urls.append(SITE + "issues-" + k + ".html")
    for k, n in EXTRA_SERIES:
        urls.append(SITE + "issues-" + k + ".html")
    # hero archetype catalog deep links
    hp = os.path.join(DATA, "heroes.json")
    if os.path.exists(hp):
        with open(hp, encoding="utf-8") as f:
            for h in json.load(f):
                urls.append(SITE + "?hero=" + h["id"])
    for r in idx:
        urls.append(SITE + "?issue=" + r["id"])
    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append("<url><loc>%s</loc></url>" % u)
    xml.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write("\n".join(xml))
    return len(urls)


def data_size_mb():
    total = 0
    for dp, _, fns in os.walk(DATA):
        for fn in fns:
            total += os.path.getsize(os.path.join(dp, fn))
    return total / 1048576


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, required=True)
    args = ap.parse_args()
    os.makedirs(VOL, exist_ok=True)
    os.makedirs(IDXF, exist_ok=True)

    st = load_state()
    start = st["next_index"]
    idx = load_idx()
    have = {r["id"] for r in idx}

    recs, new_rows = [], []
    for i in range(start, start + args.n):
        rec = make_issue(i)
        g = G(SALT + i + 777000)  # separate stream for sanitizer draws
        rec["title"], _ = sanitize_title(rec["title"], g)
        rec["desc"], _ = sanitize_text(rec["desc"], g)
        for p in rec["pages"]:
            p["cap"], _ = sanitize_text(p["cap"], g)
            if p["dlg"]:
                p["dlg"], _ = sanitize_text(p["dlg"], g)
        # paranoia: full-record clean check
        blob = rec["title"] + " " + rec["desc"] + " " + \
            " ".join(p["cap"] + " " + p["dlg"] for p in rec["pages"]) + " " + \
            " ".join(c["name"] + " " + c["code"] for c in rec["chars"])
        assert is_tm_clean(blob), "residual trademark hit in issue %d" % i
        assert rec["id"] not in have, "duplicate id " + rec["id"]
        rec["_i"] = i
        recs.append(rec)
        row = idx_row(rec)
        # stamp the ACTUAL chunk number: chunk 16 absorbed the 24 event
        # issues (124 records), so the (i-1)//100+1 formula is wrong for
        # sealed history — always record the chunk at write time.
        row["chunk"] = (i - 1) // CHUNK + 1
        new_rows.append(row)
        have.add(rec["id"])
        # flush full chunks as we go
        if len(recs) == CHUNK:
            write_chunk(recs)
            recs = []
    if recs:
        write_chunk(recs)

    idx.extend(new_rows)
    save_idx(idx)
    api = build_api(idx)
    n_urls = build_sitemap(idx)
    # web extras: comics-catalog.json feed + static per-series directory pages
    # + static page urls in the sitemap (kept in lockstep with the drip)
    from build_web_extras import build_all as build_web_extras_all
    build_web_extras_all()

    # catalog metadata: series/character/event indexes, JSON schemas,
    # per-issue hashes, master manifest, api.json authority fields,
    # static count stamp in index.html (kept in lockstep with the drip)
    from build_meta import build_all as build_meta_all
    meta = build_meta_all()

    # count-integrity gate: the published counts must agree with the
    # sealed volumes before anything is committed
    assert meta["total"] == len(idx), "count mismatch: meta vs idx"
    assert sum(api["series"].values()) == meta["total"], \
        "count mismatch: series sum vs total"

    st["next_index"] = start + args.n
    save_state(st)

    size = data_size_mb()
    print("DRIP: +%d issues (%s..%s), total %d, %d words, %d sitemap urls, data %.1fMB%s"
          % (args.n, "JAH-COMIC-%06d" % start,
             "JAH-COMIC-%06d" % (start + args.n - 1),
             len(idx), api["total_words"], n_urls, size,
             " OVER GUARD" if size > GUARD_MB else ""))
    if size > GUARD_MB:
        print("GUARD TRIPPED: data/ exceeds %dMB — do NOT push" % GUARD_MB)
        sys.exit(2)


if __name__ == "__main__":
    main()
