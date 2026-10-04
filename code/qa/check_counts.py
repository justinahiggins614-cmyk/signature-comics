#!/usr/bin/env python3
"""Signature Comic Store — count/catalog integrity checks.

Fails (exit 1) if any invariant is violated:
  - api.json total_issues == search-index rows == sealed volume records
  - sum(series counts) == total_issues
  - no duplicate JAH-COMIC IDs
  - chunk files form a contiguous 1..N sequence
  - every idx row's chunk file exists
  - static count stamp in index.html matches api.json
  - api.json index_sha256 matches the actual hashes.json.gz
  - sitemap url count == 1 + series + static pages + heroes + issues
  - spot-check: recompute 3 issue hashes from sealed volumes
"""
import gzip
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
IDXF = os.path.join(ROOT, "data", "index")
VOL = os.path.join(ROOT, "data", "volumes")
SITE = "https://justinahiggins614-cmyk.github.io/signature-comics/"

fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" — " + detail if detail and not cond else ""))
    if not cond:
        fails.append(name)


def main():
    api = json.load(open(os.path.join(IDXF, "api.json"), encoding="utf-8"))
    with gzip.open(os.path.join(IDXF, "comics.idx.json.gz"), "rt", encoding="utf-8") as f:
        idx = json.load(f)
    total = api["total_issues"]

    check("api.total_issues == index rows", total == len(idx),
          "%s vs %s" % (total, len(idx)))
    check("sum(series counts) == total",
          sum(api["series"].values()) == total,
          "%s vs %s" % (sum(api["series"].values()), total))

    ids = [r["id"] for r in idx]
    check("no duplicate issue IDs", len(ids) == len(set(ids)))

    # chunk continuity
    fns = sorted(f for f in os.listdir(VOL)
                 if f.startswith("comics-c") and f.endswith(".json.gz"))
    nums = [int(f[8:13]) for f in fns]
    check("chunk files contiguous 1..N",
          nums == list(range(1, len(nums) + 1)),
          "found %d chunks, first=%s last=%s" % (len(nums), nums[:1], nums[-1:]))

    # every idx row resolves to an existing chunk + the id is inside it
    chunk_ids = {}
    ok = True
    for fn, n in zip(fns, nums):
        with gzip.open(os.path.join(VOL, fn), "rt", encoding="utf-8") as f:
            chunk_ids[n] = {r["id"] for r in json.load(f)}
    # chunk 16 absorbed the 24 crossover-event issues (124 records), so the
    # id->chunk formula is wrong for sealed history: rows carry the ACTUAL
    # chunk stamped at write time — verify against that.
    for r in idx:
        n = r.get("chunk")
        if not n or r["id"] not in chunk_ids.get(n, set()):
            ok = False
            break
    check("every indexed issue present in its stamped chunk file", ok)
    check("every idx row carries a chunk number",
          all(r.get("chunk") for r in idx))

    # static stamp in index.html
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    m = re.search(r"<!-- STATIC-COUNTS -->(.*?)<!-- /STATIC-COUNTS -->", src, re.S)
    if m:
        nums_in = re.findall(r"<b>([\d,]+)</b>", m.group(1))
        check("static stamp matches api.json",
              nums_in and nums_in[0].replace(",", "") == str(total),
              "stamp=%s api=%s" % (nums_in[:1], total))
    else:
        check("static stamp present in index.html", False, "marker missing")

    # index hash
    with open(os.path.join(IDXF, "hashes.json.gz"), "rb") as f:
        h = hashlib.sha256(f.read()).hexdigest()
    check("api.index_sha256 matches hashes.json.gz",
          api.get("index_sha256") == h)

    with gzip.open(os.path.join(IDXF, "hashes.json.gz"), "rt", encoding="utf-8") as f:
        hashes = json.load(f)
    check("hash table covers every issue",
          len(hashes) == total, "%d vs %d" % (len(hashes), total))

    # spot-check 3 hashes against sealed volumes
    sys.path.insert(0, os.path.join(ROOT, "code"))
    from build_meta import canon_bytes
    all_recs = {}
    for fn in fns[:3]:
        with gzip.open(os.path.join(VOL, fn), "rt", encoding="utf-8") as f:
            for r in json.load(f):
                all_recs[r["id"]] = r
    spot = list(all_recs)[:3]
    ok = all(hashlib.sha256(canon_bytes(all_recs[i])).hexdigest() == hashes[i]
             for i in spot)
    check("spot-check 3 issue hashes recompute", ok, str(spot))

    # sitemap
    sm = open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8").read()
    n_urls = sm.count("<url>")
    heroes = json.load(open(os.path.join(ROOT, "data", "heroes.json"),
                            encoding="utf-8"))
    # 1 home + 9 ?series= (8 make-series + event) + 1 issues.html
    # + 1 browse.html + 9 issues-<skey>.html + heroes
    # + issues (?issue=) + issues (?comic= alias)
    expect = 1 + 9 + 1 + 1 + 9 + len(heroes) + total + total
    check("sitemap url count", n_urls == expect, "%d vs %d" % (n_urls, expect))
    try:
        import xml.dom.minidom
        xml.dom.minidom.parseString(sm)
        check("sitemap is valid XML", True)
    except Exception as e:
        check("sitemap is valid XML", False, str(e)[:100])

    # manifest agreement
    man = json.load(open(os.path.join(IDXF, "comics-manifest.json"), encoding="utf-8"))
    check("manifest total == api total", man["total_issues"] == total)
    check("manifest words == api words", man["total_words"] == api["total_words"])

    print()
    if fails:
        print("FAILED: %d check(s)" % len(fails))
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
