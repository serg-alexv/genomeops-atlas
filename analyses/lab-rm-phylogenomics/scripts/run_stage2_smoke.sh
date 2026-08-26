#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${ROOT}/config/smoke_accessions.tsv"
WORK="${ROOT}/smoke-work"

rm -rf "${WORK}"
mkdir -p "${WORK}"/{download,proteins,genomes,gff3,gbff,metadata,logs,defensefinder,iqtree,trees}

exec > >(tee "${WORK}/logs/smoke.stdout.log") 2> >(tee "${WORK}/logs/smoke.stderr.log" >&2)

echo "[smoke] started: $(date -u +%FT%TZ)"

# ---------------------------------------------------------------------------
# Tool inventory. Version probes are deliberately non-fatal because some
# current CLIs (notably DefenseFinder 3.x and dataformat) do not expose a
# conventional --version command.
# ---------------------------------------------------------------------------
{
  echo -e "tool\tversion_or_path"
  printf "datasets\t"; (datasets version 2>&1 || true) | tr '\n' ' '; echo
  printf "dataformat\t"; (dataformat version 2>&1 || true) | tr '\n' ' '; echo
  printf "GToTree\t"; (GToTree -v 2>&1 || true) | tr '\n' ' '; echo
  printf "IQ-TREE\t"; ((iqtree3 --version 2>/dev/null || iqtree2 --version 2>/dev/null || iqtree --version 2>/dev/null) || true) | tr '\n' ' '; echo
  printf "DefenseFinder\t"; python - <<'PY' | tr '\n' ' '; echo
import importlib.metadata as md
for name in ("mdmparis-defense-finder", "defense-finder"):
    try:
        print(md.version(name))
        break
    except md.PackageNotFoundError:
        pass
else:
    matches=[]
    for dist in md.distributions():
        project=(dist.metadata.get("Name") or "").lower()
        if "defense" in project and "finder" in project:
            matches.append(f"{dist.metadata.get('Name')}={dist.version}")
    print(",".join(matches) if matches else "installed_version_not_resolved")
PY
  printf "Python\t"; python --version 2>&1
} > "${WORK}/SOFTWARE_VERSIONS.tsv"

GToTree -h > "${WORK}/logs/GToTree.help.txt" 2>&1 || true
defense-finder --help > "${WORK}/logs/defense-finder.help.txt" 2>&1 || true
defense-finder run --help > "${WORK}/logs/defense-finder-run.help.txt" 2>&1 || true

# ---------------------------------------------------------------------------
# Validate and download exact assemblies
# ---------------------------------------------------------------------------
python - "${CONFIG}" <<'PY'
import csv, sys
from collections import Counter
p=sys.argv[1]
rows=list(csv.DictReader(open(p), delimiter='\t'))
assert len(rows)==7, f"expected 7 smoke records, found {len(rows)}"
assert len({r['accession'] for r in rows})==7, "duplicate smoke accession"
assert Counter(r['role'] for r in rows)==Counter({'LAB':5,'OUTGROUP':2})
for r in rows:
    assert r['accession'].startswith('GCF_')
    assert r['label'] and ' ' not in r['label']
print('smoke accession validation: PASS')
PY

cut -f3 "${CONFIG}" | tail -n +2 > "${WORK}/accessions.txt"

datasets download genome accession \
  --inputfile "${WORK}/accessions.txt" \
  --include genome,protein,gff3,gbff \
  --filename "${WORK}/download/ncbi_dataset.zip"

unzip -q "${WORK}/download/ncbi_dataset.zip" -d "${WORK}/download/package"
cp -a "${WORK}/download/package/ncbi_dataset/data/dataset_catalog.json" "${WORK}/metadata/" 2>/dev/null || true
cp -a "${WORK}/download/package/ncbi_dataset/data/assembly_data_report.jsonl" "${WORK}/metadata/" 2>/dev/null || true
cp -a "${WORK}/download/package/README.md" "${WORK}/metadata/NCBI_DATASET_README.md" 2>/dev/null || true

printf "accession\tlabel\trole\tgroup\tprotein_fasta\tgenome_fasta\tgff3\tgbff\n" > "${WORK}/download_manifest.tsv"
: > "${WORK}/protein_paths.txt"
: > "${WORK}/gtt_labels.tsv"

while IFS=$'\t' read -r role group accession label; do
  [[ "${role}" == "role" ]] && continue
  base="${WORK}/download/package/ncbi_dataset/data/${accession}"
  protein="$(find "${base}" -maxdepth 1 -type f -name 'protein.faa' -print -quit)"
  genome="$(find "${base}" -maxdepth 1 -type f -name '*genomic.fna' -print -quit)"
  gff="$(find "${base}" -maxdepth 1 -type f -name 'genomic.gff' -print -quit)"
  gbff="$(find "${base}" -maxdepth 1 -type f -name 'genomic.gbff' -print -quit)"

  for required in "${protein}" "${genome}" "${gff}" "${gbff}"; do
    [[ -n "${required}" && -s "${required}" ]] || { echo "missing required NCBI package file for ${accession}" >&2; exit 31; }
  done

  cp "${protein}" "${WORK}/proteins/${accession}.faa"
  cp "${genome}" "${WORK}/genomes/${accession}.fna"
  cp "${gff}" "${WORK}/gff3/${accession}.gff3"
  cp "${gbff}" "${WORK}/gbff/${accession}.gbff"

  realpath "${WORK}/proteins/${accession}.faa" >> "${WORK}/protein_paths.txt"
  printf "%s.faa\t%s\n" "${accession}" "${label}" >> "${WORK}/gtt_labels.tsv"
  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
    "${accession}" "${label}" "${role}" "${group}" \
    "proteins/${accession}.faa" "genomes/${accession}.fna" \
    "gff3/${accession}.gff3" "gbff/${accession}.gbff" >> "${WORK}/download_manifest.tsv"
done < "${CONFIG}"

[[ "$(find "${WORK}/proteins" -type f -name '*.faa' | wc -l)" -eq 7 ]]
seqkit stats -a -T "${WORK}"/proteins/*.faa > "${WORK}/protein_fasta_stats.tsv"
seqkit stats -a -T "${WORK}"/genomes/*.fna > "${WORK}/genome_fasta_stats.tsv"

# ---------------------------------------------------------------------------
# GToTree marker extraction/alignment. Keep every intermediate for inspection.
# ---------------------------------------------------------------------------
GToTree \
  -A "${WORK}/protein_paths.txt" \
  -H Firmicutes \
  -j 2 \
  -o "${WORK}/gtotree" \
  -m "${WORK}/gtt_labels.tsv" \
  -k -d -N

ALIGNMENT="$(find "${WORK}/gtotree" -type f -name 'Aligned_SCGs.faa' -print -quit)"
[[ -n "${ALIGNMENT}" && -s "${ALIGNMENT}" ]] || { echo 'GToTree did not produce Aligned_SCGs.faa' >&2; exit 41; }
cp "${ALIGNMENT}" "${WORK}/iqtree/smoke_concatenated_markers.faa"
seqkit stats -a -T "${WORK}/iqtree/smoke_concatenated_markers.faa" > "${WORK}/iqtree/concatenated_alignment_stats.tsv"

# ---------------------------------------------------------------------------
# Maximum-likelihood tree. Keep full IQ-TREE diagnostics.
# ---------------------------------------------------------------------------
if command -v iqtree3 >/dev/null 2>&1; then
  IQTREE=iqtree3
elif command -v iqtree2 >/dev/null 2>&1; then
  IQTREE=iqtree2
else
  IQTREE=iqtree
fi

"${IQTREE}" \
  -s "${WORK}/iqtree/smoke_concatenated_markers.faa" \
  -m MFP \
  -B 1000 \
  --alrt 1000 \
  -T AUTO \
  -pre "${WORK}/iqtree/smoke_ml"

UNROOTED="${WORK}/iqtree/smoke_ml.treefile"
[[ -s "${UNROOTED}" ]] || { echo 'IQ-TREE treefile missing' >&2; exit 42; }
cp "${UNROOTED}" "${WORK}/trees/smoke_unrooted.treefile"
python "${ROOT}/scripts/root_and_prune_tree.py" \
  --tree "${WORK}/trees/smoke_unrooted.treefile" \
  --outgroups Bacillus_subtilis_168 Listeria_monocytogenes_EGDe \
  --rooted "${WORK}/trees/smoke_outgroup_rooted.treefile" \
  --lab-only "${WORK}/trees/smoke_LAB_only_rooted.treefile"

# ---------------------------------------------------------------------------
# DefenseFinder: update the model database, run each original NCBI proteome,
# and preserve raw output exactly as produced by the pinned version.
# ---------------------------------------------------------------------------
defense-finder update 2>&1 | tee "${WORK}/logs/defense-finder-update.log"
defense-finder show 2>&1 | tee "${WORK}/logs/defense-finder-show.log" || true

while IFS=$'\t' read -r role group accession label; do
  [[ "${role}" == "role" ]] && continue
  mkdir -p "${WORK}/defensefinder/${accession}"
  (
    cd "${WORK}/defensefinder/${accession}"
    defense-finder run "${WORK}/proteins/${accession}.faa"
  ) 2>&1 | tee "${WORK}/logs/defense-finder-${accession}.log"
done < "${CONFIG}"

# ---------------------------------------------------------------------------
# Final smoke validation and forensic manifest.
# ---------------------------------------------------------------------------
python - "${WORK}" <<'PY'
from pathlib import Path
from Bio import AlignIO, Phylo
import sys
w=Path(sys.argv[1])
aln=AlignIO.read(w/'iqtree/smoke_concatenated_markers.faa','fasta')
assert len(aln)==7, f'expected 7 concatenated marker sequences, found {len(aln)}'
assert aln.get_alignment_length()>1000, f'alignment unexpectedly short: {aln.get_alignment_length()}'
for rel, expected in [
    ('trees/smoke_unrooted.treefile',7),
    ('trees/smoke_outgroup_rooted.treefile',7),
    ('trees/smoke_LAB_only_rooted.treefile',5),
]:
    t=Phylo.read(w/rel,'newick')
    assert len(t.get_terminals())==expected, (rel,len(t.get_terminals()))
for accession_dir in (w/'defensefinder').iterdir():
    files=[p for p in accession_dir.rglob('*') if p.is_file() and p.stat().st_size>0]
    assert files, f'no DefenseFinder outputs for {accession_dir.name}'
print('end-to-end smoke validation: PASS')
PY

find "${WORK}" -type f -printf '%P\t%s\n' | sort > "${WORK}/FILE_MANIFEST.tsv"
(
  cd "${WORK}"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

echo "[smoke] finished: $(date -u +%FT%TZ)"
