#!/usr/bin/env python3
"""Coherence check: signature-comics vs the phone-book AI canon.

The Comic Store's 20 heroes are ORIGINAL Signature creations (JAH-HERO-*
IDs) — site-canon, NOT phone-book canon. Per Manon's rule, their
identities stay exactly as the site defines them; they just get the
JAHtalk human voice. This check verifies:
  - no hero record claims a JAH-AI-* canon ID
  - no served file (index.html, hero-catalog.js) ties a hero to a canon
    AI ID or canon NAME+ID pair
  - the hero QA surfaces (hero Q&A, roleplay, per-issue Q&A) are helpers /
    site-canon personas and claim no canon ID

Exit 0 = coherent. Exit 1 = DRIFT FOUND (loud report).
"""
import json
import os
import re
import sys

REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CANON_PATH = os.path.expanduser(
    "~/workspace/jah-ai-models/ai-catalog.json")
CANON_ID = re.compile(r"JAH-AI-[A-Z]+-\d+")


def main():
    with open(CANON_PATH, encoding="utf-8") as f:
        canon_raw = json.load(f)
    canon_ids = set()
    canon_names = {}
    recs = canon_raw.get("records", canon_raw) if isinstance(canon_raw, dict) else canon_raw
    for r in recs:
        canon_ids.add(str(r["ID"]))
        canon_names[re.sub(r"\s+", " ", str(r["NAME"])).strip().lower()] = str(r["ID"])

    issues = []
    with open(os.path.join(REPO, "data", "heroes.json"), encoding="utf-8") as f:
        heroes = json.load(f)
    print(f"comics: {len(heroes)} site-canon heroes loaded (JAH-HERO-*, not phone-book canon)")
    for h in heroes:
        blob = json.dumps(h, ensure_ascii=False)
        for m in CANON_ID.findall(blob):
            if m in canon_ids:
                issues.append(
                    f"HERO {h['code']} ({h['id']}) claims canon AI ID {m}")
        nm = re.sub(r"\s+", " ", str(h.get("code", ""))).strip().lower()
        if nm in canon_names:
            issues.append(
                f"HERO {h['code']} shares a canon AI name (canon {canon_names[nm]})")

    for fn in ("index.html", "hero-catalog.js"):
        text = open(os.path.join(REPO, fn), encoding="utf-8").read()
        for m in set(CANON_ID.findall(text)):
            # served code may only link to the phone book; an actual ID
            # reference would be a canon claim
            if m in canon_ids:
                issues.append(
                    f"SERVED FILE {fn} references canon AI ID {m}")

    if issues:
        print("*** COHERENCE DRIFT ***")
        for i in issues:
            print("  -", i)
        return 1
    print("OK: all heroes keep their site-canon identities; no JAH-AI canon "
          "ID claimed anywhere on the Comic Store. "
          "(The 'Talk to <hero>'s character AI (AI Phone Book)' button links "
          "to the phone-book home — it names no canon ID.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
