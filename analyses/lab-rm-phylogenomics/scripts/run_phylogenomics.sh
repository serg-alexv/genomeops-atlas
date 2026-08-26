#!/usr/bin/env bash
# run_phylogenomics.sh — Stage 3 host phylogenomics
#
# Runs GToTree with the Firmicutes/Bacillota single-copy marker set on the
# selected protein FASTAs, then infers a maximum-likelihood tree with IQ-TREE 2.
# Produces all required alignment, partition, and Geneious-ready outputs.
#
# Usage:
#   run_phylogenomics.sh <analysis_root>
#
# Requires: GToTree >=1.8 (conda), IQ-TREE2 >=2.2 (conda), mafft, trimAl,
#           muscle, hmmer.

set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
STAGE2="$ROOT/results/stage2"
OUT="$ROOT/results/stage3"
OUTGROUPS_CFG="$ROOT/config/outgroups.tsv"

mkdir -p "$OUT/gtotree" "$OUT/iqtree" "$OUT/markers" "$OUT/geneious_ready"

PANEL="$ROOT/results/stage1/selected_panel.tsv"
if [[ ! -f "$PANEL" ]]; then
  echo "ERROR: Stage 1 panel not found: $PANEL" >&2; exit 1
fi

# ── software version capture ─────────────────────────────────────────────────
{
  printf "tool\tversion\n"
  GToTree --version 2>&1 | head -1 | awk '{print "GToTree\t"$0}'
  iqtree2 --version 2>&1 | grep -i "iq-tree" | head -1 | awk '{print "IQ-TREE2\t"$0}'
  trimal --version 2>&1 | head -1 | awk '{print "trimAl\t"$0}'
  hmmsearch -h 2>&1 | grep "HMMER" | head -1 | awk '{print "HMMER\t"$0}'
} > "$OUT/SOFTWARE_VERSIONS.tsv"

# ── build input file list for GToTree ────────────────────────────────────────
# GToTree accepts a file listing genome FASTAs or protein FASTAs.
# We use protein FASTAs (annotated proteomes) where available; otherwise genome FASTA.
FASTA_LIST="$OUT/gtotree_input_faa.txt"
: > "$FASTA_LIST"

while IFS=$'\t' read -r acc role org; do
  [[ "$acc" == "accession" ]] && continue
  FAA=$(find "$STAGE2/assemblies/$acc" -name "*.faa" | head -1 || true)
  if [[ -z "$FAA" ]]; then
    FNA=$(find "$STAGE2/assemblies/$acc" -name "*.fna" | head -1 || true)
    if [[ -n "$FNA" ]]; then
      echo "$FNA" >> "$FASTA_LIST"
    else
      echo "WARNING: no FASTA for $acc — skipping" >&2
    fi
  else
    echo "$FAA" >> "$FASTA_LIST"
  fi
done < "$STAGE2/accession_manifest.tsv"

# ── build accession-to-label map ─────────────────────────────────────────────
LABEL_MAP="$OUT/label_to_accession.tsv"
printf 'label\taccession\torganism_name\trole\n' > "$LABEL_MAP"
while IFS=$'\t' read -r acc role org; do
  [[ "$acc" == "accession" ]] && continue
  # Sanitise label: replace spaces/special chars with underscores, truncate to 60 chars
  label=$(printf '%s' "${org}__${acc}" | tr -cs 'A-Za-z0-9_.' '_' | cut -c1-60)
  printf '%s\t%s\t%s\t%s\n' "$label" "$acc" "$org" "$role"
done < "$STAGE2/accession_manifest.tsv" >> "$LABEL_MAP"

# ── run GToTree ───────────────────────────────────────────────────────────────
# Marker set: Firmicutes_and_Tenericutes (the Bacillota single-copy set in
# current GToTree distributions, equivalent to ~74 HMMs). If this set is not
# available in the installed GToTree, the next best Firmicutes set is used and
# documented.
MARKER_SET="Firmicutes_and_Tenericutes"
if ! GToTree -H 2>&1 | grep -q "$MARKER_SET"; then
  MARKER_SET=$(GToTree -H 2>&1 | grep -i "firmicute" | head -1 | awk '{print $1}')
  echo "NOTE: Marker set substitution — using $MARKER_SET (see METHODS.md)" | \
    tee "$OUT/gtotree/marker_set_note.txt"
fi

echo "Running GToTree with marker set: $MARKER_SET" >&2
GToTree \
  -f "$FASTA_LIST" \
  -H "$MARKER_SET" \
  -o "$OUT/gtotree" \
  -n 4 \
  -j 4 \
  -T IQ-TREE \
  2>&1 | tee "$OUT/gtotree/gtotree.log"

# ── preserve intermediate marker data ────────────────────────────────────────
# GToTree places per-marker alignment files in gtotree/Aligned_SCGs_*
if [[ -d "$OUT/gtotree/Aligned_SCGs_hits" ]]; then
  cp -R "$OUT/gtotree/Aligned_SCGs_hits" "$OUT/markers/aligned"
fi
if [[ -d "$OUT/gtotree/Single_copy_gene_sequences" ]]; then
  cp -R "$OUT/gtotree/Single_copy_gene_sequences" "$OUT/markers/unaligned"
fi

# ── extract marker info table ─────────────────────────────────────────────────
MARKER_INFO="$OUT/markers/marker_info.tsv"
if [[ -f "$OUT/gtotree/SCG_HMMs/${MARKER_SET}.hmm" ]]; then
  grep "^NAME\|^DESC" "$OUT/gtotree/SCG_HMMs/${MARKER_SET}.hmm" | \
    paste - - | sed 's/NAME\t//;s/DESC\t/\t/' | \
    awk 'BEGIN{print "marker_id\tdescription"} {print $0}' > "$MARKER_INFO"
elif [[ -d "$OUT/gtotree/run_files" ]]; then
  # Fallback: extract from hit summary
  head -1 "$OUT/gtotree/"*.tsv 2>/dev/null | head -1 > "$MARKER_INFO" || \
    echo "marker_id\tdescription" > "$MARKER_INFO"
fi

# ── build long-format marker-hit table ───────────────────────────────────────
MARKER_TABLE="$OUT/markers/marker_hit_table.tsv"
printf 'accession\torganism\tmarker_id\tprotein_accession\tlength\tseq_file\n' > "$MARKER_TABLE"
if [[ -d "$OUT/markers/unaligned" ]]; then
  while IFS= read -r fa; do
    marker=$(basename "$fa" .faa)
    while IFS= read -r line; do
      if [[ "$line" =~ ^\> ]]; then
        header="${line#>}"
        acc=$(printf '%s' "$header" | awk '{print $1}')
        len=$(awk '/^>/{if(seq)print length(seq); seq=""} !/^>/{seq=seq$0} END{if(seq)print length(seq)}' "$fa" | tail -1)
        printf '%s\t%s\t%s\t%s\t%s\t%s\n' "unknown" "unknown" "$marker" "$acc" "$len" "$(basename "$fa")"
      fi
    done < "$fa"
  done < <(find "$OUT/markers/unaligned" -name "*.faa" | sort) >> "$MARKER_TABLE"
fi

# ── occupancy / missingness table ─────────────────────────────────────────────
if [[ -f "$OUT/gtotree/SCG_hit_counts.tsv" ]]; then
  cp "$OUT/gtotree/SCG_hit_counts.tsv" "$OUT/markers/marker_occupancy.tsv"
elif [[ -f "$OUT/gtotree/"*counts*.tsv ]]; then
  cp "$OUT/gtotree/"*counts*.tsv "$OUT/markers/marker_occupancy.tsv" 2>/dev/null || true
fi

# ── concatenated alignment ────────────────────────────────────────────────────
CONCAT_FA="$OUT/gtotree/Aligned_SCGs_hits/concat_alignment.faa"
if [[ ! -f "$CONCAT_FA" ]]; then
  CONCAT_FA=$(find "$OUT/gtotree" -name "*.faa" -newer "$OUT/gtotree/gtotree.log" | head -1 || true)
fi
if [[ -z "$CONCAT_FA" ]]; then
  CONCAT_FA=$(find "$OUT/gtotree" -name "concat*.faa" | head -1 || true)
fi

if [[ -z "$CONCAT_FA" ]]; then
  echo "ERROR: GToTree did not produce a concatenated alignment." >&2
  exit 1
fi

cp "$CONCAT_FA" "$OUT/concat_alignment.faa"

# ── PHYLIP conversion ─────────────────────────────────────────────────────────
python3 - <<'PYEOF' "$OUT/concat_alignment.faa" "$OUT/concat_alignment.phy"
import sys, re

def fasta_to_phylip(faa_path, phy_path):
    seqs = {}
    order = []
    name = None
    with open(faa_path) as fh:
        for line in fh:
            line = line.rstrip()
            if line.startswith('>'):
                name = re.sub(r'\s+', '_', line[1:])[:60]
                seqs[name] = []
                order.append(name)
            elif name:
                seqs[name].append(line)
    if not seqs:
        return
    sequences = {n: ''.join(seqs[n]) for n in order}
    ntaxa = len(sequences)
    nchar = max(len(s) for s in sequences.values())
    with open(phy_path, 'w') as out:
        out.write(f' {ntaxa} {nchar}\n')
        for n in order:
            out.write(f'{n:<60}{sequences[n]}\n')

fasta_to_phylip(sys.argv[1], sys.argv[2])
PYEOF

# ── NEXUS conversion ──────────────────────────────────────────────────────────
python3 - <<'PYEOF' "$OUT/concat_alignment.faa" "$OUT/concat_alignment.nex"
import sys, re

def fasta_to_nexus(faa_path, nex_path):
    seqs = {}
    order = []
    name = None
    with open(faa_path) as fh:
        for line in fh:
            line = line.rstrip()
            if line.startswith('>'):
                name = re.sub(r'\s+', '_', line[1:])[:60]
                seqs[name] = []
                order.append(name)
            elif name:
                seqs[name].append(line)
    if not seqs:
        return
    sequences = {n: ''.join(seqs[n]) for n in order}
    ntaxa = len(sequences)
    nchar = max(len(s) for s in sequences.values())
    with open(nex_path, 'w') as out:
        out.write('#NEXUS\n\nBEGIN TAXA;\n')
        out.write(f'  DIMENSIONS NTAX={ntaxa};\n')
        out.write('  TAXLABELS\n')
        for n in order:
            out.write(f'    {n}\n')
        out.write('  ;\nEND;\n\nBEGIN CHARACTERS;\n')
        out.write(f'  DIMENSIONS NCHAR={nchar};\n')
        out.write('  FORMAT DATATYPE=PROTEIN GAP=- MISSING=?;\n')
        out.write('  MATRIX\n')
        for n in order:
            out.write(f'    {n} {sequences[n]}\n')
        out.write('  ;\nEND;\n')

fasta_to_nexus(sys.argv[1], sys.argv[2])
PYEOF

# ── partition file ─────────────────────────────────────────────────────────────
PARTITION_FILE="$OUT/partition.txt"
if [[ -f "$OUT/gtotree/partitions.txt" ]]; then
  cp "$OUT/gtotree/partitions.txt" "$PARTITION_FILE"
elif [[ -f "$OUT/gtotree/"*partition*.txt ]]; then
  cp "$OUT/gtotree/"*partition*.txt "$PARTITION_FILE" 2>/dev/null || true
else
  echo "# Partition file not generated by GToTree — placeholder" > "$PARTITION_FILE"
  echo "# Regenerate with: iqtree2 -s concat_alignment.faa --partition ..." >> "$PARTITION_FILE"
fi

# ── IQ-TREE 2 maximum-likelihood tree ────────────────────────────────────────
OUTGROUP_LABELS=$(tail -n +2 "$OUTGROUPS_CFG" | awk -F'\t' '{print $2}' | \
  while IFS= read -r og; do
    grep "$og" "$LABEL_MAP" | awk -F'\t' '{print $1}' | head -1
  done | paste -sd ',' -)

echo "IQ-TREE 2 outgroups: $OUTGROUP_LABELS" >&2

IQTREE_ARGS=(
  -s "$OUT/concat_alignment.faa"
  -m TEST
  -B 1000
  -alrt 1000
  --prefix "$OUT/iqtree/lab_rm"
  -T AUTO
  -ntmax 8
)
if [[ -f "$PARTITION_FILE" ]] && grep -v '^#' "$PARTITION_FILE" | grep -q '.'; then
  IQTREE_ARGS+=(-q "$PARTITION_FILE")
fi
if [[ -n "$OUTGROUP_LABELS" ]]; then
  IQTREE_ARGS+=(-o "$OUTGROUP_LABELS")
fi

iqtree2 "${IQTREE_ARGS[@]}" 2>&1 | tee "$OUT/iqtree/iqtree.log"

# ── produce LAB-only display tree (prune outgroups) ───────────────────────────
if [[ -f "$OUT/iqtree/lab_rm.treefile" ]]; then
  cp "$OUT/iqtree/lab_rm.treefile" "$OUT/iqtree/lab_rm_unrooted.nwk"
  # Rooted tree: IQ-TREE with -o already roots; rename for clarity
  cp "$OUT/iqtree/lab_rm.treefile" "$OUT/iqtree/lab_rm_rooted.nwk"

  # Prune outgroups to produce LAB-only display tree using Python/ete3
  python3 - <<'PYEOF' "$OUT/iqtree/lab_rm_rooted.nwk" "$OUTGROUPS_CFG" "$OUT/iqtree/lab_only.nwk"
import sys
try:
    from ete3 import Tree
    t = Tree(sys.argv[1])
    outgroup_accs = []
    with open(sys.argv[2]) as f:
        for line in f:
            if line.startswith('accession'):
                continue
            outgroup_accs.append(line.split('\t')[0].strip())
    for node in t.get_leaves():
        for acc in outgroup_accs:
            if acc in node.name:
                node.detach()
                break
    t.write(format=1, outfile=sys.argv[3])
    print("LAB-only display tree written.")
except ImportError:
    # ete3 not available — copy rooted tree as placeholder
    import shutil
    shutil.copy(sys.argv[1], sys.argv[3])
    print("WARNING: ete3 not installed. LAB-only tree is copy of rooted tree.")
PYEOF
fi

# ── Geneious-ready directory ──────────────────────────────────────────────────
GENEIOUS="$OUT/geneious_ready"
cp "$OUT/concat_alignment.faa"  "$GENEIOUS/concat_alignment.faa"
cp "$OUT/concat_alignment.phy"  "$GENEIOUS/concat_alignment.phy"  2>/dev/null || true
cp "$OUT/concat_alignment.nex"  "$GENEIOUS/concat_alignment.nex"  2>/dev/null || true
cp "$PARTITION_FILE"            "$GENEIOUS/partition.txt"          2>/dev/null || true
[[ -f "$OUT/iqtree/lab_rm_rooted.nwk" ]] && \
  cp "$OUT/iqtree/lab_rm_rooted.nwk" "$GENEIOUS/lab_rm_rooted.nwk"
[[ -f "$OUT/iqtree/lab_only.nwk" ]] && \
  cp "$OUT/iqtree/lab_only.nwk" "$GENEIOUS/lab_only.nwk"
cp "$LABEL_MAP" "$GENEIOUS/label_to_accession.tsv"
cp "$ROOT/docs/GENEIOUS_WORKFLOW.md" "$GENEIOUS/GENEIOUS_WORKFLOW.md" 2>/dev/null || \
  echo "# See analyses/lab-rm-phylogenomics/docs/GENEIOUS_WORKFLOW.md" > \
    "$GENEIOUS/GENEIOUS_WORKFLOW.md"

echo "Stage 3 phylogenomics complete. Outputs in $OUT" >&2
