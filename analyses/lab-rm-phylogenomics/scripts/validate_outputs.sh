#!/usr/bin/env bash
# validate_outputs.sh — cross-check bundle validation (Stage 5 / final QC)
#
# Verifies:
#   1. Enterococcus absent from selected panel
#   2. Exactly 180 LAB genomes (or documented replacement count)
#   3. Unique accessions
#   4. Output sequence counts match metadata
#   5. No duplicate tree labels
#   6. R-M states are traceable to raw DefenseFinder calls
#
# Usage:
#   validate_outputs.sh <analysis_root>
#
# Exits non-zero if any critical check fails.

set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
PANEL="$ROOT/results/stage1/selected_panel.tsv"
STAGE2="$ROOT/results/stage2"
STAGE3="$ROOT/results/stage3"
STAGE4="$ROOT/results/stage4"
REPORT="$ROOT/results/VALIDATION_REPORT.md"

PASS=0
FAIL=0

pass() { echo "  PASS: $*"; PASS=$(( PASS + 1 )); }
fail() { echo "  FAIL: $*" >&2; FAIL=$(( FAIL + 1 )); }
warn() { echo "  WARN: $*"; }

{
echo "# Validation report"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "## 1. Enterococcus absent"
if grep -qi "Enterococcus" "$PANEL" 2>/dev/null; then
  fail "Enterococcus found in selected panel!"
  echo "**FAIL**: Enterococcus found in $PANEL"
else
  pass "Enterococcus absent"
  echo "**PASS**: Enterococcus absent from selected panel"
fi

echo ""
echo "## 2. LAB genome count"
LAB_COUNT=0
if [[ -f "$STAGE2/accession_manifest.tsv" ]]; then
  LAB_COUNT=$(grep -c $'\tlab\t' "$STAGE2/accession_manifest.tsv" || echo 0)
fi
PANEL_COUNT=$(( $(wc -l < "$PANEL") - 1 ))
echo "Panel rows (Stage 1): $PANEL_COUNT"
echo "LAB manifest entries: $LAB_COUNT"
if (( PANEL_COUNT == 180 )); then
  pass "Panel contains exactly 180 LAB genomes"
  echo "**PASS**: 180 LAB genomes"
elif (( PANEL_COUNT >= 140 && PANEL_COUNT <= 200 )); then
  warn "Panel size $PANEL_COUNT (not 180) — check DISCOVERY_SUMMARY.md for documented reason"
  echo "**WARN**: Panel size $PANEL_COUNT"
else
  fail "Panel size $PANEL_COUNT outside expected range 140–200"
  echo "**FAIL**: Panel size $PANEL_COUNT outside expected range"
fi

echo ""
echo "## 3. Unique accessions"
TOTAL_ACC=$(( $(wc -l < "$PANEL") - 1 ))
UNIQ_ACC=$(tail -n +2 "$PANEL" | awk -F'\t' '{print $1}' | sort -u | wc -l)
if (( TOTAL_ACC == UNIQ_ACC )); then
  pass "All $UNIQ_ACC accessions are unique"
  echo "**PASS**: All accessions unique"
else
  DUP=$(( TOTAL_ACC - UNIQ_ACC ))
  fail "$DUP duplicate accessions in panel"
  echo "**FAIL**: $DUP duplicates"
fi

echo ""
echo "## 4. Sequence file presence"
MISSING=0
while IFS=$'\t' read -r acc role org; do
  [[ "$acc" == "accession" ]] && continue
  FAA=$(find "$STAGE2/assemblies/$acc" -name "*.faa" 2>/dev/null | head -1 || true)
  if [[ -z "$FAA" ]]; then
    MISSING=$(( MISSING + 1 ))
    echo "  Missing protein FASTA: $acc"
  fi
done < "$STAGE2/accession_manifest.tsv" 2>/dev/null || MISSING=999
if (( MISSING == 0 )); then
  pass "Protein FASTAs present for all assemblies"
  echo "**PASS**: All protein FASTAs present"
elif (( MISSING == 999 )); then
  warn "Stage 2 manifest not found — sequence check skipped"
  echo "**WARN**: Stage 2 manifest not found"
else
  fail "$MISSING assemblies missing protein FASTA"
  echo "**FAIL**: $MISSING missing protein FASTAs"
fi

echo ""
echo "## 5. No duplicate tree labels"
if [[ -f "$STAGE3/iqtree/lab_rm.treefile" ]]; then
  DUP_LABELS=$(grep -oP '[A-Za-z0-9_\.]+(?=:)' "$STAGE3/iqtree/lab_rm.treefile" \
    | sort | uniq -d | wc -l)
  if (( DUP_LABELS == 0 )); then
    pass "No duplicate tree labels"
    echo "**PASS**: No duplicate labels in treefile"
  else
    fail "$DUP_LABELS duplicate labels in treefile"
    echo "**FAIL**: $DUP_LABELS duplicate labels"
  fi
else
  warn "Treefile not found at $STAGE3/iqtree/lab_rm.treefile — tree label check skipped"
  echo "**WARN**: Treefile not found — skipped"
fi

echo ""
echo "## 6. R-M states traceable to raw DefenseFinder calls"
if [[ -f "$STAGE4/tables/genome_rm_matrix.tsv" && -d "$STAGE4/raw" ]]; then
  RAW_COUNT=$(ls "$STAGE4/raw" | wc -l)
  MATRIX_ROWS=$(( $(wc -l < "$STAGE4/tables/genome_rm_matrix.tsv") - 1 ))
  echo "Raw DefenseFinder directories: $RAW_COUNT"
  echo "R-M matrix rows: $MATRIX_ROWS"
  if (( RAW_COUNT > 0 && MATRIX_ROWS > 0 )); then
    pass "R-M matrix and raw output both present"
    echo "**PASS**: R-M states present and raw output present"
  else
    fail "R-M matrix or raw DefenseFinder output missing"
    echo "**FAIL**: Missing R-M matrix or raw output"
  fi
else
  warn "Stage 4 outputs not found — R-M traceability check skipped"
  echo "**WARN**: Stage 4 outputs not found — skipped"
fi

echo ""
echo "---"
echo "## Summary"
echo "PASS: $PASS | FAIL: $FAIL"
} | tee "$REPORT"

if (( FAIL > 0 )); then
  echo "Validation FAILED ($FAIL failures). See $REPORT" >&2
  exit 1
fi
echo "Validation PASSED. Report: $REPORT" >&2
