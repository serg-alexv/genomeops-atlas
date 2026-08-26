#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
ACCESSIONS="$ROOT/config/stage4_pilot_accessions.txt"
WORK="$ROOT/work/stage4_pilot"
RESULTS="$ROOT/results/stage4_pilot"
BIN="$ROOT/.tools"

rm -rf "$WORK" "$RESULTS"
mkdir -p "$WORK" "$RESULTS/raw_outputs" "$BIN"

DATASETS="$BIN/datasets"
if [[ ! -x "$DATASETS" ]]; then
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets" -o "$DATASETS"
  chmod +x "$DATASETS"
fi
"$DATASETS" version > "$RESULTS/ncbi_datasets_version.txt"
defense-finder --version > "$RESULTS/defensefinder_version.txt" 2>&1 || true
defense-finder run --help > "$RESULTS/defensefinder_run_help.txt" 2>&1

ZIP="$WORK/pilot.zip"
"$DATASETS" download genome accession \
  --inputfile "$ACCESSIONS" \
  --include protein,gff3,gbff,seq-report \
  --filename "$ZIP" --no-progressbar
unzip -q "$ZIP" -d "$WORK/extracted"

printf 'assembly_accession\tprotein_fasta\tsystems_file\tgenes_file\thmmer_file\n' > "$RESULTS/output_manifest.tsv"
while read -r accession; do
  [[ -z "$accession" ]] && continue
  faa="$WORK/extracted/ncbi_dataset/data/$accession/protein.faa"
  test -s "$faa"
  out="$RESULTS/raw_outputs/$accession"
  mkdir -p "$out"
  echo "Running DefenseFinder on $accession" >&2
  defense-finder run "$faa" -o "$out" -w 2 --preserve-raw 2>&1 | tee "$RESULTS/${accession}.log"
  systems=$(find "$out" -maxdepth 1 -name '*_defense_finder_systems.tsv' -print -quit)
  genes=$(find "$out" -maxdepth 1 -name '*_defense_finder_genes.tsv' -print -quit)
  hmmer=$(find "$out" -maxdepth 1 -name '*_defense_finder_hmmer.tsv' -print -quit)
  test -n "$systems" && test -s "$systems"
  test -n "$genes" && test -s "$genes"
  test -n "$hmmer" && test -s "$hmmer"
  printf '%s\t%s\t%s\t%s\t%s\n' "$accession" "$faa" "$systems" "$genes" "$hmmer" >> "$RESULTS/output_manifest.tsv"
done < "$ACCESSIONS"

python3 "$ROOT/scripts/summarize_defensefinder_pilot.py" \
  --manifest "$RESULTS/output_manifest.tsv" \
  --systems "$RESULTS/combined_systems.tsv" \
  --genes "$RESULTS/combined_genes.tsv" \
  --hmmer "$RESULTS/combined_hmmer.tsv" \
  --rm-systems "$RESULTS/rm_systems_only.tsv" \
  --rm-hits "$RESULTS/rm_hmm_hits_only.tsv" \
  --summary "$RESULTS/STAGE4_PILOT_SUMMARY.md"

cp "$ACCESSIONS" "$RESULTS/pilot_accessions.txt"
find "$RESULTS" -type f -printf '%P\t%s\n' | sort > "$RESULTS/file_inventory.tsv"
find "$RESULTS" -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > "$RESULTS/SHA256SUMS.txt"
