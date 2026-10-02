# The Signature Comic Store (SITE TITLE PROVISIONAL — awaiting Manon's confirmation)

Manon's 13th website: a universal-and-beyond comic store of ORIGINAL Signature
comics — 8 original series, original heroes, original stories. Marching to
1,000,000 issues.

- Live: https://justinahiggins614-cmyk.github.io/signature-comics/
- Issues: JAH-COMIC-###### (deterministic from seed SALT+i — re-runs never change an issue)
- Data: data/volumes/comics-cNNNNN.json.gz (100 issues/chunk), data/index/comics.idx.json.gz
- Drip: `python3 code/drip_comics.py --n 500` every 2h (cron: jah-comic-drip)
- Trademark: code/trademark_safe.py — character names reject-and-regenerate until
  clean; titles/descriptions get deterministic in-place substitution; the drip
  asserts zero residual hits. No real publisher's characters, titles, or likenesses.
- Frontend: deterministic SVG covers + per-page panel art, tiered read-aloud
  (ResponsiveVoice → Google TTS failover), copy/download, per-issue Q&A AI
  (data-grounded, never invents), ?issue= deep links, sitemap.xml, robots.txt.
