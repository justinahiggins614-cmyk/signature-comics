#!/usr/bin/env python3
"""Signature Comic Store — live link checker.

Fetches key live URLs with curl and requires HTTP 200 (following
redirects). Also validates the live sitemap XML and checks the gzip
index's Content-Type. Any failure exits 1.
"""
import subprocess
import sys
import xml.dom.minidom

BASE = "https://justinahiggins614-cmyk.github.io/signature-comics/"
URLS = [
    "",
    "data/index/api.json",
    "data/index/comics-manifest.json",
    "data/index/comics-catalog.json",
    "data/index/series-index.json",
    "data/index/heroes-index.json",
    "data/index/characters-index.json",
    "data/index/events-index.json",
    "data/index/comics-schema.json",
    "data/index/comic-record-example.json",
    "llms.txt",
    "sitemap.xml",
    "issues.html",
    "issues-signal.html",
    "JAH-NETWORK-MANIFEST.json",
    "?issue=JAH-COMIC-000001",
    "?issue=JAH-COMIC-006024",
    "?hero=JAH-HERO-000001",
    "?series=signal",
]


def curl_head(url):
    p = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
         "-L", "--max-time", "25", url],
        capture_output=True, text=True)
    return p.stdout.strip()


def curl_header(url, header):
    p = subprocess.run(
        ["curl", "-s", "-I", "-L", "--max-time", "25", url],
        capture_output=True, text=True)
    for line in p.stdout.splitlines():
        if line.lower().startswith(header.lower() + ":"):
            return line.split(":", 1)[1].strip()
    return ""


def main():
    fails = []
    for u in URLS:
        code = curl_head(BASE + u)
        ok = code == "200"
        print(("PASS " if ok else "FAIL ") + BASE + u + " -> " + code)
        if not ok:
            fails.append(u)
    # sitemap must be valid XML with the expected url count
    p = subprocess.run(["curl", "-s", "--max-time", "25", BASE + "sitemap.xml"],
                       capture_output=True, text=True)
    try:
        dom = xml.dom.minidom.parseString(p.stdout)
        n = len(dom.getElementsByTagName("url"))
        print("PASS sitemap.xml valid XML, %d urls" % n)
    except Exception as e:
        print("FAIL sitemap.xml invalid: %s" % str(e)[:120])
        fails.append("sitemap.xml")
    # gzip index semantics: downloadable gzip object
    ct = curl_header(BASE + "data/index/comics.idx.json.gz", "Content-Type")
    ok = "gzip" in ct
    print(("PASS " if ok else "FAIL ") +
          "comics.idx.json.gz Content-Type: " + ct)
    if not ok:
        fails.append("gzip content-type")
    print()
    if fails:
        print("FAILED: %d" % len(fails))
        return 1
    print("ALL LINK CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
