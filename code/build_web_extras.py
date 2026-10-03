#!/usr/bin/env python3
"""Signature Comic Store — web extras builder.

Generates, from the sealed data volumes:
  1. data/index/comics-catalog.json  — compact machine-readable feed
     (id, title, series, series-key, issue number, words, pages, chunk).
  2. issues.html + issues-<skey>.html — pre-rendered STATIC per-series
     directory pages (title headings, issue numbers, descriptions, links)
     so non-JS crawlers can index every issue.
  3. Appends the static page URLs to sitemap.xml (series-tier entries).

Safe to re-run at any time: outputs are fully regenerated, and re-running
never changes issue records (they are deterministic from the seed).

Usage: python3 code/build_web_extras.py
"""
import gzip, json, os, html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
VOL = os.path.join(DATA, "volumes")
IDXF = os.path.join(DATA, "index")
SITE = "https://justinahiggins614-cmyk.github.io/signature-comics/"
CHUNK = 100


def load_records():
    recs = []
    fns = sorted(f for f in os.listdir(VOL)
                 if f.startswith("comics-c") and f.endswith(".json.gz"))
    for fn in fns:
        with gzip.open(os.path.join(VOL, fn), "rt", encoding="utf-8") as f:
            chunk = json.load(f)
        n = int(fn[8:13])
        for r in chunk:
            r = dict(r)
            r["_chunk"] = n
            recs.append(r)
    recs.sort(key=lambda r: r["id"])
    return recs


def build_feed(recs):
    feed = [{"id": r["id"], "t": r["title"], "s": r["series"],
             "sk": r["skey"], "n": r["num"], "w": r["words"],
             "pg": len(r["pages"]), "chunk": r["_chunk"]} for r in recs]
    p = os.path.join(IDXF, "comics-catalog.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(feed, f, separators=(",", ":"))
    return p, len(feed)


PAGE_CSS = ("body{margin:0;background:#0d0a12;color:#f7f2e4;"
            "font-family:Trebuchet MS,Verdana,Arial,sans-serif;line-height:1.55}"
            ".wrap{max-width:900px;margin:0 auto;padding:0 16px 60px}"
            "a{color:#ffd23f}h1{color:#fff;text-shadow:2px 2px 0 #e63946}"
            "article{background:#1c1528;border:3px solid #000;box-shadow:4px 4px 0 #000;"
            "border-radius:8px;padding:12px 16px;margin:14px 0}"
            "article h2{margin:.1em 0;font-size:1.1em;color:#ffd23f}"
            ".meta{font-size:.82em;color:#b9aed6}"
            ".desc{font-style:italic;color:#f7f2e4}"
            ".serieslist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));"
            "gap:12px;margin:18px 0}")


def static_page(title, body_html, crumbs):
    return ("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>" + html.escape(title) + " — The Signature Comic Store</title>"
            "<meta name=\"description\" content=\"" + html.escape(title) +
            ": original Signature comics by Justin Addam Higgins.\">"
            "<style>" + PAGE_CSS + "</style></head><body><div class=\"wrap\">"
            "<p>" + crumbs + "</p><h1>" + html.escape(title) + "</h1>" +
            body_html + "</div></body></html>")


def build_static_pages(recs):
    by_series = {}
    for r in recs:
        by_series.setdefault(r["skey"], (r["series"], []))[1].append(r)
    crumbs_home = ("<a href=\"" + SITE + "\">The Signature Comic Store</a> &gt; "
                   "<a href=\"" + SITE + "issues.html\">All series</a>")
    pages = []
    # index of series
    cards = "".join(
        "<article><h2>" + html.escape(sname) + "</h2>"
        "<p class=\"meta\">" + str(len(items)) + " issues</p>"
        "<p><a href=\"" + SITE + "issues-" + skey + ".html\">Browse the " +
        html.escape(sname) + " shelf &rarr;</a></p></article>"
        for skey, (sname, items) in sorted(by_series.items(),
                                           key=lambda kv: kv[1][0]))
    p = os.path.join(ROOT, "issues.html")
    with open(p, "w", encoding="utf-8") as f:
        f.write(static_page("Issue Directory — All Series",
                            "<p>" + str(len(recs)) + " original issues across " +
                            str(len(by_series)) + " series, by Justin Addam Higgins. "
                            "Every issue is an original generated comic — no real "
                            "publishers' characters, titles, or likenesses.</p>"
                            "<div class=\"serieslist\">" + cards + "</div>",
                            "<a href=\"" + SITE + "\">The Signature Comic Store</a>"))
    pages.append("issues.html")
    for skey, (sname, items) in sorted(by_series.items()):
        arts = []
        for r in items:
            arts.append(
                "<article><h2>" + html.escape(r["title"]) + "</h2>"
                "<p class=\"meta\">" + html.escape(r["series"]) + " #" +
                str(r["num"]) + " &middot; " + html.escape(r["id"]) +
                " &middot; " + str(len(r["pages"])) + " pages &middot; " +
                str(r["words"]) + " words</p>"
                "<p class=\"desc\">" + html.escape(r["desc"]) + "</p>"
                "<p><a href=\"" + SITE + "?issue=" + r["id"] +
                "\">Read the full issue &rarr;</a></p></article>")
        fn = "issues-" + skey + ".html"
        with open(os.path.join(ROOT, fn), "w", encoding="utf-8") as f:
            f.write(static_page(sname + " — Full Issue Shelf",
                                "<p>" + str(len(items)) + " issues. Original comics "
                                "by Justin Addam Higgins.</p>" + "".join(arts),
                                crumbs_home))
        pages.append(fn)
    return pages


def append_static_urls(pages):
    sp = os.path.join(ROOT, "sitemap.xml")
    with open(sp, encoding="utf-8") as f:
        xml = f.read()
    added = 0
    for fn in pages:
        url = SITE + fn
        if url not in xml:
            xml = xml.replace("</urlset>",
                              "<url><loc>" + url + "</loc></url>\n</urlset>")
            added += 1
    with open(sp, "w", encoding="utf-8") as f:
        f.write(xml)
    return added


def build_all(root=ROOT, data=DATA):
    global ROOT, DATA
    ROOT, DATA = root, data
    recs = load_records()
    feed_p, n_feed = build_feed(recs)
    pages = build_static_pages(recs)
    n_added = append_static_urls(pages)
    print("WEB-EXTRAS: %d records -> %s (%d feed rows), %d static pages, "
          "%d sitemap urls added"
          % (len(recs), os.path.basename(feed_p), n_feed, len(pages), n_added))
    return len(recs)


if __name__ == "__main__":
    build_all()
