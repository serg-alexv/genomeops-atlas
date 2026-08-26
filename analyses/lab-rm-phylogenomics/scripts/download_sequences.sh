#!/usr/bin/env bash
# download_sequences.sh — Stage 2 sequence acquisition
#
# Downloads genome FASTA, protein FASTA, GFF3, GBFF, and NCBI metadata for
# every accession in the frozen Stage 1 selected panel plus two outgroup
# assemblies defined in config/outgroups.tsv.
#
# Usage:
#   download_sequences.sh <analysis_root>
#
# Inputs:
#   <root>/results/stage1/selected_panel.tsv   — frozen 180-genome panel
#   <root>/config/outgroups.tsv               — two non-LAB outgroups
#
# Outputs (all under <root>/results/stage2/):
#   assemblies/<accession>/  — per-assembly download directory
#   accession_manifest.tsv   — accession, role, organism, downloaded files
#   SHA256SUMS.txt

set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
PANEL="$ROOT/results/stage1/selected_panel.tsv"
OUTGROUPS="$ROOT/config/outgroups.tsv"
OUT="$ROOT/results/stage2"
BIN="$ROOT/.tools"
DATASETS="$BIN/datasets"

if [[ ! -f "$PANEL" ]]; then
  echo "ERROR: Stage 1 selected panel not found: $PANEL" >&2
  echo "Run Stage 1 first (discover_genomes.sh) and commit the panel." >&2
  exit 1
fi

mkdir -p "$OUT/assemblies" "$BIN"

# ── install NCBI Datasets CLI if absent ─────────────────────────────────────
if [[ ! -x "$DATASETS" ]]; then
  echo "Downloading NCBI Datasets CLI..." >&2
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets" \
    -o "$DATASETS"
  chmod +x "$DATASETS"
fi
"$DATASETS" version | tee "$OUT/ncbi_datasets_version.txt"

# ── collect accession list ────────────────────────────────────────────────────
MANIFEST="$OUT/accession_manifest.tsv"
printf 'accession\trole\torganism_name\n' > "$MANIFEST"

# LAB panel (skip header)
tail -n +2 "$PANEL" | awk -F'\t' '{print $1"\tlab\t"$2}' >> "$MANIFEST"

# outgroups (skip header)
tail -n +2 "$OUTGROUPS" | awk -F'\t' '{print $1"\t"$3"\t"$2}' >> "$MANIFEST"

TOTAL=$(( $(wc -l < "$MANIFEST") - 1 ))
echo "Total assemblies to download: $TOTAL" >&2

# ── download each assembly ───────────────────────────────────────────────────
FAILED_ACC=""
while IFS=$'\t' read -r acc role org; do
  [[ "$acc" == "accession" ]] && continue
  DEST="$OUT/assemblies/$acc"
  if [[ -d "$DEST" && -f "$DEST/.download_complete" ]]; then
    echo "  [skip] $acc already downloaded" >&2
    continue
  fi
  mkdir -p "$DEST"
  echo "  Downloading $acc ($org) ..." >&2

  if ! "$DATASETS" download genome accession "$acc" \
      --include genome,protein,gff3,gbff,seq-report \
      --filename "$DEST/${acc}.zip" 2>"$DEST/download.log"; then
    echo "  WARNING: download failed for $acc — see $DEST/download.log" >&2
    FAILED_ACC="$FAILED_ACC $acc"
    continue
  fi

  # Unzip and remove archive to save space
  unzip -q "$DEST/${acc}.zip" -d "$DEST/unzipped" \
    && rm -f "$DEST/${acc}.zip"

  # Flatten files for easier downstream access
  find "$DEST/unzipped" -type f | while read -r f; do
    fname=$(basename "$f")
    cp "$f" "$DEST/$fname" 2>/dev/null || true
  done

  touch "$DEST/.download_complete"
done < "$MANIFEST"

# ── checksums for per-assembly FASTA / protein files ─────────────────────────
find "$OUT/assemblies" -name "*.fna" -o -name "*.faa" \
  | sort | xargs sha256sum > "$OUT/SHA256SUMS.txt" 2>/dev/null || true

# ── report failures ──────────────────────────────────────────────────────────
if [[ -n "$FAILED_ACC" ]]; then
  echo "FAILED_DOWNLOADS:$FAILED_ACC" | tr ' ' '\n' | grep -v '^$' \
    | tee "$OUT/failed_downloads.txt"
  echo "ERROR: Some assemblies failed to download. See $OUT/failed_downloads.txt" >&2
  exit 1
fi

echo "Stage 2 download complete. Assemblies in $OUT/assemblies" >&2
