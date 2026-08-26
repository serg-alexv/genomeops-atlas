# METHODS — LAB R-M Phylogenomics Stage 2

## 1. Genome selection (Stage 1)

The frozen 180-genome panel is produced by `scripts/discover_genomes.sh` followed by `scripts/select_genomes.py`. Selection criteria:

- RefSeq GCF accession, annotated isolate genome only.
- CheckM completeness ≥ 95%; contamination ≤ 5%; ≤ 100 contigs.
- No MAG, atypical, multi-isolate, unclassified `sp.` records.
- Species-first deterministic round-robin balancing (18 per group, 10 groups).
- Enterococcus excluded entirely.

The exact accession list is committed to `results/stage1/selected_panel.tsv`. If any accession is replaced after marker quality review, the rejected accession, reason, and replacement are recorded in `results/stage1/DISCOVERY_SUMMARY.md`.

## 2. Sequence acquisition (Stage 2)

Command:
```bash
analyses/lab-rm-phylogenomics/scripts/download_sequences.sh analyses/lab-rm-phylogenomics
```

Uses NCBI Datasets CLI v2 (version captured in `results/stage2/ncbi_datasets_version.txt`).
Per-assembly downloads include: `--include genome,protein,gff3,gbff,seq-report`.

Two non-LAB Bacillota outgroups are included for tree rooting only and explicitly excluded from R-M ring annotation (see `config/outgroups.tsv`):

| Accession | Organism | Rationale |
|---|---|---|
| GCF_000009045.1 | *Bacillus subtilis* subsp. *subtilis* str. 168 | RefSeq reference; Firmicutes; outside Lactobacillales |
| GCF_000007045.1 | *Listeria monocytogenes* EGD-e | RefSeq reference; Firmicutes; outside Lactobacillales |

SHA-256 checksums: `results/stage2/SHA256SUMS.txt`.

## 3. Host phylogenomics (Stage 3)

Command:
```bash
analyses/lab-rm-phylogenomics/scripts/run_phylogenomics.sh analyses/lab-rm-phylogenomics
```

### 3.1 Marker identification

GToTree is run with the **Firmicutes_and_Tenericutes** single-copy marker set (current GToTree ≥ 1.8 distribution). If this exact set is unavailable in the installed version, the nearest available Firmicutes set is substituted and documented in `results/stage3/gtotree/marker_set_note.txt`.

All intermediate marker data are preserved:
- `results/stage3/markers/unaligned/` — one unaligned FASTA per marker
- `results/stage3/markers/aligned/`   — one aligned FASTA per marker
- `results/stage3/markers/marker_info.tsv` — marker ID, description, source
- `results/stage3/markers/marker_hit_table.tsv` — accession, organism, marker ID, protein accession, length, file
- `results/stage3/markers/marker_occupancy.tsv` — occupancy/missingness matrix

### 3.2 Alignment and concatenation

GToTree handles per-marker alignment (MAFFT), trimming (trimAl), and concatenation internally. Final outputs:

- `results/stage3/concat_alignment.faa` — concatenated aligned amino-acid FASTA
- `results/stage3/concat_alignment.phy` — PHYLIP copy
- `results/stage3/concat_alignment.nex` — NEXUS copy with CHARACTERS block
- `results/stage3/partition.txt`        — partition/charset map

### 3.3 Maximum-likelihood tree inference

```bash
iqtree2 \
  -s results/stage3/concat_alignment.faa \
  -m TEST \
  -B 1000 \
  -alrt 1000 \
  -o <outgroup_labels> \
  -T AUTO \
  --prefix results/stage3/iqtree/lab_rm
```

Branch support: 1000 ultrafast bootstrap replicates + 1000 SH-aLRT.  
Model: selected by ModelFinder (`-m TEST`), recorded in `results/stage3/iqtree/lab_rm.log`.

Trees produced:
- `lab_rm_unrooted.nwk` — unrooted ML tree
- `lab_rm_rooted.nwk`   — outgroup-rooted ML tree
- `lab_only.nwk`        — LAB-only display tree (outgroups pruned)

### 3.4 Geneious-ready directory

`results/stage3/geneious_ready/` contains:
- `concat_alignment.faa` (already aligned; import as FASTA into Geneious)
- `concat_alignment.phy`, `concat_alignment.nex`
- `partition.txt`, `lab_rm_rooted.nwk`, `lab_only.nwk`
- `label_to_accession.tsv`
- `GENEIOUS_WORKFLOW.md`

## 4. R-M annotation (Stage 4)

Command:
```bash
analyses/lab-rm-phylogenomics/scripts/run_rm_annotation.sh analyses/lab-rm-phylogenomics
```

### 4.1 DefenseFinder

DefenseFinder (current pinned release, version in `results/stage4/defensefinder_version.txt`) is run on each annotated protein FASTA with `defense-finder run`. Database models are updated at run start.

### 4.2 Classification

`scripts/classify_rm_systems.py` aggregates per-assembly raw output into:

- `results/stage4/tables/genome_rm_matrix.tsv` — Type I–IV state and count per genome
- `results/stage4/tables/locus_table.tsv` — locus-level detail with REBASE cross-reference columns (set to `not_resolved` when no match is established)
- `results/stage4/tables/partial_candidates.tsv` — component hits without complete system
- `results/stage4/tables/orphan_mtase_table.tsv` — standalone methyltransferases (not forced into an R-M type)
- `results/stage4/tables/rm_proteins.faa` — FASTA of all R-M-associated proteins

States:
- `0`: no convincing component
- `P`: curated partial candidate / component architecture
- `C`: complete computationally predicted system
- `V`: experimentally/genetically/biochemically/methylome-validated (requires concrete published evidence; never inferred from annotation alone)

Recognition motifs and REBASE fields are set to `not_resolved` unless supported by REBASE, methylome data, or a publication.

### 4.3 Published evidence

`results/stage4/RM_evidence.tsv` seeds classical LAB R-M literature entries (LlaAI, LlaBI, LlaDCHI, LlaDII, LlaJI, LlaFI, HsdS domain shuffling, Sth455I, Sth368I, L. plantarum donor-methylation phenotype). DOI/PMID fields are set to `not_resolved` where literature resolution is pending.

## 5. Figure annotation (Stage 5)

Command:
```bash
python3 analyses/lab-rm-phylogenomics/scripts/generate_itol_files.py \
  --matrix    results/stage4/tables/genome_rm_matrix.tsv \
  --label-map results/stage3/label_to_accession.tsv \
  --panel     results/stage1/selected_panel.tsv \
  --out-dir   results/stage5/itol
```

Outputs: `itol_branch_colors.txt`, `itol_type1_ring.txt`, `itol_type2_ring.txt`,
`itol_type3_ring.txt`, `itol_type4_ring.txt`, `itol_symbols.txt`, `itol_clade_labels.txt`.

Ring encoding: white = absent, pale color = partial (`P`), saturated color = complete (`C`), saturated + symbol = validated (`V`).

## 6. Validation

```bash
analyses/lab-rm-phylogenomics/scripts/validate_outputs.sh analyses/lab-rm-phylogenomics
```

Checks: Enterococcus absent; 180 LAB genomes; unique accessions; protein FASTAs present; no duplicate tree labels; R-M states traceable to raw calls. Report: `results/VALIDATION_REPORT.md`.
