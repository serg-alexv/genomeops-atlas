#!/usr/bin/env bash
# run_rm_annotation.sh — Stage 4 R-M annotation via DefenseFinder
#
# Runs DefenseFinder on every protein FASTA from Stage 2, classifies systems
# into Type I, II, III, IV states (0/P/C/V), and produces the required tables.
#
# Usage:
#   run_rm_annotation.sh <analysis_root>
#
# Requires: defense-finder (conda/pip, pinned version documented at runtime),
#           python3 >= 3.9

set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
STAGE2="$ROOT/results/stage2"
OUT="$ROOT/results/stage4"
PANEL="$ROOT/results/stage1/selected_panel.tsv"

mkdir -p "$OUT/raw" "$OUT/tables"

# ── software version ──────────────────────────────────────────────────────────
DEFENSE_FINDER_VERSION=$(defense-finder --version 2>&1 | head -1 || echo "unknown")
echo "DefenseFinder: $DEFENSE_FINDER_VERSION" | tee "$OUT/defensefinder_version.txt"

# Ensure DefenseFinder DB is up-to-date (pin to model data in environment.yml)
defense-finder update 2>&1 | tee "$OUT/defensefinder_update.log" || \
  echo "WARNING: defense-finder update failed — using cached models" >&2

# ── run DefenseFinder on each proteome ────────────────────────────────────────
while IFS=$'\t' read -r acc role org; do
  [[ "$acc" == "accession" ]] && continue
  FAA=$(find "$STAGE2/assemblies/$acc" -name "*.faa" | head -1 || true)
  if [[ -z "$FAA" ]]; then
    echo "WARNING: No protein FASTA for $acc — skipping DefenseFinder" >&2
    continue
  fi
  DEST="$OUT/raw/$acc"
  mkdir -p "$DEST"
  echo "  DefenseFinder: $acc ($org)..." >&2
  defense-finder run \
    --worker-nb 2 \
    --out-dir "$DEST" \
    "$FAA" 2>&1 | tee "$DEST/defensefinder.log" || {
      echo "WARNING: DefenseFinder failed for $acc" >&2
    }
done < "$STAGE2/accession_manifest.tsv"

# ── aggregate results ─────────────────────────────────────────────────────────
python3 "$ROOT/scripts/classify_rm_systems.py" \
  --raw-dir        "$OUT/raw" \
  --assemblies-dir "$STAGE2/assemblies" \
  --manifest       "$STAGE2/accession_manifest.tsv" \
  --panel          "$PANEL" \
  --out-dir        "$OUT/tables" \
  --rm-evidence    "$ROOT/results/stage4/RM_evidence.tsv"

echo "Stage 4 R-M annotation complete. Outputs in $OUT" >&2
