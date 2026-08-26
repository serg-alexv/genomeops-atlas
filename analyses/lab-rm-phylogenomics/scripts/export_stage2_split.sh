#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
ACCESSIONS="$ROOT/config/selected_accessions_stage1.txt"
WORK="$ROOT/work/stage2_export"
RESULTS="$ROOT/results/stage2_export"
BIN="$ROOT/.tools"

rm -rf "$WORK" "$RESULTS"
mkdir -p "$WORK" "$RESULTS/metadata" "$RESULTS/chunks" "$BIN"

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
"$DATASETS" version > "$RESULTS/metadata/ncbi_datasets_version.txt"
"$DATAFORMAT" version > "$RESULTS/metadata/ncbi_dataformat_version.txt"

ZIP="$WORK/lab_177_ncbi_genomes.zip"
EXTRACTED="$WORK/extracted"
"$DATASETS" download genome accession \
  --inputfile "$ACCESSIONS" \
  --include genome,protein,cds,gff3,gbff,seq-report \
  --filename "$ZIP" --no-progressbar
unzip -q "$ZIP" -d "$EXTRACTED"

python3 "$ROOT/scripts/inventory_ncbi_package_v2.py" \
  --accessions "$ACCESSIONS" --package-root "$EXTRACTED" \
  --file-manifest "$RESULTS/metadata/genome_file_manifest.tsv" \
  --assembly-summary "$RESULTS/metadata/downloaded_assembly_summary.tsv" \
  --protein-summary "$RESULTS/metadata/proteome_summary.tsv" \
  --protein-accessions "$RESULTS/metadata/all_annotated_protein_accessions.txt" \
  --report "$RESULTS/metadata/STAGE2_SUMMARY.md"

cp "$ACCESSIONS" "$RESULTS/metadata/selected_accessions_stage1.txt"
cp "$EXTRACTED/ncbi_dataset/data/assembly_data_report.jsonl" "$RESULTS/metadata/assembly_data_report.jsonl"
if [[ -f "$EXTRACTED/md5sum.txt" ]]; then
  cp "$EXTRACTED/md5sum.txt" "$RESULTS/metadata/ncbi_package_md5sum.txt"
  (cd "$EXTRACTED" && md5sum -c md5sum.txt) > "$RESULTS/metadata/ncbi_md5_verification.txt"
fi

zip_sha=$(sha256sum "$ZIP" | awk '{print $1}')
zip_size=$(stat -c %s "$ZIP")
split -b 240M -d -a 2 "$ZIP" "$RESULTS/chunks/lab_177_ncbi_genomes.zip.part"
part_count=$(find "$RESULTS/chunks" -name 'lab_177_ncbi_genomes.zip.part*' | wc -l)
if [[ "$part_count" -ne 3 ]]; then
  echo "Expected 3 chunks at 240M, generated $part_count" >&2
  exit 3
fi
sha256sum "$RESULTS/chunks"/* > "$RESULTS/metadata/chunk_SHA256SUMS.txt"

cat > "$RESULTS/metadata/REASSEMBLY.md" <<EOF
# Reassembling the Stage 2 NCBI genome package

The exact NCBI Datasets package was split into three byte-identical chunks because the connector download limit is 512 MiB per artifact.

## Linux/macOS/WSL

\`\`\`bash
cat lab_177_ncbi_genomes.zip.part00 \\
    lab_177_ncbi_genomes.zip.part01 \\
    lab_177_ncbi_genomes.zip.part02 \\
    > lab_177_ncbi_genomes.zip
sha256sum lab_177_ncbi_genomes.zip
\`\`\`

Expected reconstructed ZIP:

- Bytes: **$zip_size**
- SHA-256: **$zip_sha**

Then extract with \`unzip lab_177_ncbi_genomes.zip\`.
EOF
printf '%s  %s\n' "$zip_sha" "lab_177_ncbi_genomes.zip" > "$RESULTS/metadata/RECONSTRUCTED_ZIP_SHA256.txt"
find "$RESULTS/metadata" -maxdepth 1 -type f ! -name 'METADATA_SHA256SUMS.txt' -print0 | sort -z | xargs -0 sha256sum > "$RESULTS/metadata/METADATA_SHA256SUMS.txt"
