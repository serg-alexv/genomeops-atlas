#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
ACCESSIONS="$ROOT/config/stage3_pilot_accessions.txt"
WORK="$ROOT/work/stage3_pilot"
RESULTS="$ROOT/results/stage3_pilot"
BIN="$ROOT/.tools"

rm -rf "$WORK" "$RESULTS"
mkdir -p "$WORK/input_faa" "$RESULTS" "$BIN"

DATASETS="$BIN/datasets"
if [[ ! -x "$DATASETS" ]]; then
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets" -o "$DATASETS"
  chmod +x "$DATASETS"
fi
"$DATASETS" version > "$RESULTS/ncbi_datasets_version.txt"

ZIP="$WORK/pilot.zip"
"$DATASETS" download genome accession --inputfile "$ACCESSIONS" --include protein,gbff,gff3,seq-report --filename "$ZIP" --no-progressbar
unzip -q "$ZIP" -d "$WORK/extracted"

while read -r accession; do
  [[ -z "$accession" ]] && continue
  src="$WORK/extracted/ncbi_dataset/data/$accession/protein.faa"
  test -s "$src"
  cp "$src" "$WORK/input_faa/$accession.faa"
done < "$ACCESSIONS"
find "$WORK/input_faa" -name '*.faa' -type f | sort > "$WORK/faa.list"

gtt-hmms > "$RESULTS/available_gtt_hmms.txt" 2>&1 || true
GToTree --version > "$RESULTS/gtotree_version.txt" 2>&1 || true

# `-A` is the GToTree input mode for amino-acid/proteome FASTA files.
# The previous diagnostic run intentionally exposed that `-f` treats files as
# nucleotide genomes and invokes Prodigal, yielding zero marker hits on protein FASTA.
GToTree -A "$WORK/faa.list" -H Firmicutes -o "$WORK/gtotree" -j 4 -d 2>&1 | tee "$RESULTS/gtotree.log"

test -s "$WORK/gtotree/Aligned_SCGs.faa"
test -s "$WORK/gtotree/Aligned_SCGs_mod_names.faa"
test -s "$WORK/gtotree/GToTree_output.tre"

cp -R "$WORK/gtotree" "$RESULTS/gtotree_output"
cp -R "$WORK/input_faa" "$RESULTS/input_proteomes"
cp "$ACCESSIONS" "$RESULTS/pilot_accessions.txt"
find "$RESULTS" -type f -printf '%P\t%s\n' | sort > "$RESULTS/output_inventory.tsv"
find "$RESULTS" -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 sha256sum > "$RESULTS/SHA256SUMS.txt"

retained=$(awk 'NR>1 {for(i=2;i<=NF;i++) if($i>0){seen[i]=1}} END{print length(seen)}' "$WORK/gtotree/SCG_hit_counts.tsv" 2>/dev/null || echo NA)
cat > "$RESULTS/PILOT_SUMMARY.md" <<EOF
# Stage 3 phylogenomics pilot

- Input proteomes: **$(wc -l < "$ACCESSIONS")**
- Marker set: **Firmicutes (119 HMM targets)**
- Input mode: **GToTree amino-acid files (`-A`)**
- Concatenated alignment and tree: **generated successfully**
- Purpose: verify the current GToTree installation, output layout, sequence-header retention, and availability of per-marker sequences before scaling to 177 LAB genomes.
EOF
