#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
CONFIG="$ROOT/config/taxa.tsv"
WORK="$ROOT/work/stage1"
RESULTS="$ROOT/results/stage1"
BIN="$ROOT/.tools"

mkdir -p "$WORK/raw_jsonl" "$WORK/raw_tsv" "$RESULTS" "$BIN"

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

HEADER="group\taccession\torganism_name\ttax_id\tstrain\tisolate\tassembly_level\trefseq_category\trelease_date\tassembly_name\tcontig_count\ttotal_length\tcheckm_completeness\tcheckm_contamination\ttype_material\tbiosample\tbioproject\tisolation_source\tannotation_pipeline\tannotation_status"
printf '%b\n' "$HEADER" > "$RESULTS/all_candidates.tsv"

FIELDS="accession,organism-name,organism-tax-id,organism-infraspecific-strain,organism-infraspecific-isolate,assminfo-level,assminfo-refseq-category,assminfo-release-date,assminfo-name,assmstats-number-of-contigs,assmstats-total-sequence-len,checkm-completeness,checkm-contamination,type-material-label,assminfo-biosample-accession,assminfo-bioproject,assminfo-biosample-isolation-source,annotinfo-pipeline,annotinfo-status"

while IFS=$'\t' read -r group query exact target_n; do
  [[ "$group" == "group" ]] && continue
  [[ -z "$group" ]] && continue

  slug=$(printf '%s' "$group" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9_' '_')
  jsonl="$WORK/raw_jsonl/${slug}.jsonl"
  tsv="$WORK/raw_tsv/${slug}.tsv"

  echo "Querying NCBI RefSeq for: $group [$query]" >&2
  args=(summary genome taxon "$query"
        --assembly-source RefSeq
        --assembly-level complete,chromosome,scaffold
        --annotated
        --exclude-atypical
        --exclude-multi-isolate
        --mag exclude
        --limit all
        --as-json-lines)
  if [[ "$exact" == "true" ]]; then
    args+=(--tax-exact-match)
  fi

  "$DATASETS" "${args[@]}" > "$jsonl"
  cat "$jsonl" | "$DATAFORMAT" tsv genome --fields "$FIELDS" > "$tsv"

  # Replace dataformat's presentation header with our stable machine header,
  # and prepend the operational group to every data row.
  tail -n +2 "$tsv" | awk -v g="$group" 'BEGIN{OFS="\t"} {print g, $0}' >> "$RESULTS/all_candidates.tsv"
done < "$CONFIG"

python3 "$ROOT/scripts/select_genomes.py" \
  --candidates "$RESULTS/all_candidates.tsv" \
  --taxa-config "$CONFIG" \
  --selected "$RESULTS/selected_panel.tsv" \
  --excluded "$RESULTS/excluded_candidates.tsv" \
  --summary "$RESULTS/DISCOVERY_SUMMARY.md"

cp "$CONFIG" "$RESULTS/taxa_config_used.tsv"
cp -R "$WORK/raw_jsonl" "$RESULTS/raw_ncbi_jsonl"
sha256sum "$RESULTS"/*.tsv > "$RESULTS/SHA256SUMS.txt"

echo "Stage 1 complete. Results are in $RESULTS" >&2
