#!/bin/bash
# Signature Comic Store — QA runner: count/catalog checks, then live links.
set -u
cd "$(dirname "$0")"
echo "=== count/catalog integrity ==="
python3 check_counts.py || exit 1
echo
echo "=== live link checks ==="
python3 check_links.py || exit 1
