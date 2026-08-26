#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
ACCESSIONS="$ROOT/config/selected_accessions_stage1.txt"
WORK="$ROOT/work/stage2"
RESULTS="$ROOT/results/stage2"
BIN="$ROOT/.tools"

rm -rf "$WORK" "$RESULTS"
mkdir -p "$WORK" "$RESULTS" "$BIN"

DATASETS="$BIN/datasets"
DATAFORMAT="$BIN/dataformat"

if [[ ! -x "$DATASETS" ]]; then
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets" -o "$DATASETS"
  chmod +x "$DATASETS"
fi
if [[ ! -x "$DATAFORMAT" ]]; then
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/dataformat" -o "$DATAFORMAT"
  chmod +x "$DATAFORMAT"
fi

"$DATASETS" version | tee "$RESULTS/ncbi_datasets_version.txt"
"$DATAFORMAT" version | tee "$RESULTS/ncbi_dataformat_version.txt"

expected=$(grep -cve '^\s*$' "$ACCESSIONS")
if [[ "$expected" -ne 177 ]]; then
  echo "Expected 177 frozen accessions, found $expected" >&2
  exit 2
fi

ZIP="$WORK/lab_177_ncbi_genomes.zip"
EXTRACTED="$WORK/extracted"

echo "Downloading $expected selected RefSeq assemblies from NCBI Datasets" >&2
"$DATASETS" download genome accession \
  --inputfile "$ACCESSIONS" \
  --include genome,protein,cds,gff3,gbff,seq-report \
  --filename "$ZIP" \
  --no-progressbar

unzip -q "$ZIP" -d "$EXTRACTED"

if [[ -f "$EXTRACTED/md5sum.txt" ]]; then
  (cd "$EXTRACTED" && md5sum -c md5sum.txt) > "$RESULTS/ncbi_md5_verification.txt"
fi

python3 "$ROOT/scripts/inventory_ncbi_package_v2.py" \
  --accessions "$ACCESSIONS" \
  --package-root "$EXTRACTED" \
  --file-manifest "$RESULTS/genome_file_manifest.tsv" \
  --assembly-summary "$RESULTS/downloaded_assembly_summary.tsv" \
  --protein-summary "$RESULTS/proteome_summary.tsv" \
  --protein-accessions "$RESULTS/all_annotated_protein_accessions.txt" \
  --report "$RESULTS/STAGE2_SUMMARY.md"

cp "$ACCESSIONS" "$RESULTS/selected_accessions_stage1.txt"
cp "$EXTRACTED/ncbi_dataset/data/assembly_data_report.jsonl" "$RESULTS/assembly_data_report.jsonl"
cp "$ZIP" "$RESULTS/lab_177_ncbi_genomes.zip"

find "$RESULTS" -maxdepth 1 -type f ! -name 'SHA256SUMS.txt' -print0 \
  | sort -z \
  | xargs -0 sha256sum > "$RESULTS/SHA256SUMS.txt"

echo "Stage 2 complete: $RESULTS" >&2
