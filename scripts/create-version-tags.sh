#!/usr/bin/env bash
# Creates the version tags (<board>/<version>) from the version commits on main,
# then pushes them. Run once from a full clone:
#   git clone https://github.com/Transition-Trails/trail-os-boards && cd trail-os-boards
#   bash scripts/create-version-tags.sh
set -euo pipefail
git fetch --unshallow 2>/dev/null || true
git log --format='%H %s' main | grep -E '^[0-9a-f]{40} (knowledge-studio|trail-crew|program-studio|academy|content-studio) v[0-9.]+$|^[0-9a-f]{40} academy contract-v2$' |
while read -r sha board version; do
  tag="$board/$version"
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then echo "exists  $tag"; else git tag "$tag" "$sha"; echo "created $tag"; fi
done
v1=$(git rev-parse program-studio/v1)
git rev-parse -q --verify refs/tags/program-studio/v1-active-2026-11-08 >/dev/null || git tag program-studio/v1-active-2026-11-08 "$v1"
git push origin --tags
