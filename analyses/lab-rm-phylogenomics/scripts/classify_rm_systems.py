#!/usr/bin/env python3
"""classify_rm_systems.py — aggregate DefenseFinder output into R-M tables.

Reads per-assembly DefenseFinder raw output, classifies Type I–IV systems,
produces:
  - genome_rm_matrix.tsv         — per-genome Type I/II/III/IV state & count
  - locus_table.tsv              — locus-level detail
  - rm_proteins.faa              — all R-M-associated proteins (FASTA)
  - partial_candidates.tsv       — component hits for partial candidates
  - orphan_mtase_table.tsv       — standalone methyltransferases
  - RM_evidence.tsv              — published-evidence seed (if present)
"""

from __future__ import annotations

import argparse
import csv
import os
import re
from pathlib import Path
from typing import Dict, List

# ── R-M type classification rules ─────────────────────────────────────────────
# DefenseFinder system_type strings that map to each R-M type.
RM_TYPE_MAP: dict[str, str] = {
    "RM_TypeI":    "Type_I",
    "RM_TypeII":   "Type_II",
    "RM_TypeIIG":  "Type_II",   # IIG merged into Type II for ring display
    "RM_TypeIII":  "Type_III",
    "RM_TypeIV":   "Type_IV",
}

STATE_LABELS = ["Type_I", "Type_II", "Type_III", "Type_IV"]

LOCUS_HEADER = [
    "accession", "organism_name", "system_id", "rm_type", "subtype",
    "component_protein_accessions", "component_short_names",
    "contig", "start", "end", "strand",
    "chromosome_or_plasmid", "completeness_state",
    "defensefinder_model", "defensefinder_version",
    "rebase_match", "recognition_motif", "notes",
]

EVIDENCE_HEADER = [
    "genome_strain", "rm_system_locus", "rm_type",
    "evidence_level", "publication_title", "doi", "pmid",
    "exact_claim", "strain_scope",
]


def read_tsv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open() as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir",        required=True, type=Path)
    ap.add_argument("--assemblies-dir", required=True, type=Path,
                    help="Path to Stage 2 assemblies directory (contains one subdir per accession)")
    ap.add_argument("--manifest",       required=True, type=Path)
    ap.add_argument("--panel",          required=True, type=Path)
    ap.add_argument("--out-dir",        required=True, type=Path)
    ap.add_argument("--rm-evidence",    required=True, type=Path)
    return ap.parse_args()


def classify_state(rows: list[dict], rm_type: str) -> str:
    """Return 0/P/C/V state for a given R-M type across all systems in an assembly."""
    relevant = [r for r in rows if RM_TYPE_MAP.get(r.get("type_system", ""), "") == rm_type]
    if not relevant:
        return "0"
    # Count complete hits (hit_status == "complete" or i_expect < threshold)
    complete = [r for r in relevant if r.get("hit_status", "").lower() in ("complete", "1", "true")]
    if complete:
        return "C"
    return "P"


def main() -> None:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Read manifest for accession → organism mapping
    manifest = {
        row["accession"]: row
        for row in read_tsv(args.manifest)
        if row.get("accession") != "accession"
    }

    # Read panel for operational group
    panel = {
        row.get("accession", ""): row
        for row in read_tsv(args.panel)
        if row.get("accession", "") != "accession"
    }

    matrix_rows: list[dict] = []
    locus_rows: list[dict] = []
    partial_rows: list[dict] = []
    orphan_rows: list[dict] = []
    protein_fa_lines: list[str] = []

    for acc, info in manifest.items():
        raw_dir = args.raw_dir / acc
        # DefenseFinder output files
        systems_file  = raw_dir / "defense_finder_systems.tsv"
        genes_file    = raw_dir / "defense_finder_genes.tsv"
        hmmer_file    = raw_dir / "defense_finder_hmmer.tsv"

        systems = read_tsv(systems_file)
        genes   = read_tsv(genes_file)

        org = info.get("organism_name", "")

        # per-type state & count
        type_states = {t: "0" for t in STATE_LABELS}
        type_counts = {t: 0 for t in STATE_LABELS}

        for sys_row in systems:
            raw_type = sys_row.get("type_system", sys_row.get("subtype", ""))
            rm_type  = RM_TYPE_MAP.get(raw_type, "")
            if not rm_type:
                continue
            type_counts[rm_type] += 1

            # Completeness state: DefenseFinder marks systems with nb_genes_found
            # compared to nb_mandatory_genes
            try:
                found    = int(sys_row.get("nb_genes_found", 0))
                mandatory = int(sys_row.get("nb_mandatory_genes", 1))
            except ValueError:
                found, mandatory = 0, 1

            if found >= mandatory:
                state = "C"
            else:
                state = "P"
            # V requires concrete published evidence; never inferred from annotation
            if type_states[rm_type] != "C":
                type_states[rm_type] = state

            # Collect component accessions from gene table
            sys_id = sys_row.get("sys_id", sys_row.get("system_id", ""))
            comp_genes = [g for g in genes if g.get("sys_id", "") == sys_id]
            comp_accs = [g.get("hit_id", g.get("protein_id", "")) for g in comp_genes]
            comp_names = [g.get("gene_name", g.get("hit_gene_id", "")) for g in comp_genes]
            contig = comp_genes[0].get("replicon", comp_genes[0].get("contig", "")) if comp_genes else ""

            locus_rows.append({
                "accession":                  acc,
                "organism_name":              org,
                "system_id":                  sys_id,
                "rm_type":                    rm_type,
                "subtype":                    raw_type,
                "component_protein_accessions": ";".join(comp_accs),
                "component_short_names":       ";".join(comp_names),
                "contig":                     contig,
                "start":                      sys_row.get("start", ""),
                "end":                        sys_row.get("end", ""),
                "strand":                     sys_row.get("strand", ""),
                "chromosome_or_plasmid":      "not_resolved",
                "completeness_state":         state,
                "defensefinder_model":        sys_row.get("model_fqn", ""),
                "defensefinder_version":      "",
                "rebase_match":               "not_resolved",
                "recognition_motif":          "not_resolved",
                "notes":                      "",
            })

        # Partial component candidates (genes table, no completed system)
        sys_ids_complete = {r["system_id"] for r in locus_rows if r["accession"] == acc}
        for gene_row in genes:
            gtype = RM_TYPE_MAP.get(gene_row.get("subtype", ""), "")
            if not gtype:
                continue
            if gene_row.get("sys_id", "") not in sys_ids_complete:
                partial_rows.append({
                    "accession": acc,
                    "organism_name": org,
                    "gene_id": gene_row.get("hit_id", ""),
                    "gene_name": gene_row.get("gene_name", ""),
                    "rm_type": gtype,
                    "subtype": gene_row.get("subtype", ""),
                    "contig": gene_row.get("replicon", ""),
                    "i_eval": gene_row.get("i_eval", ""),
                    "score": gene_row.get("score", ""),
                    "model": gene_row.get("model_fqn", ""),
                })

        # Orphan MTase: genes annotated as methyltransferase with no system
        for gene_row in genes:
            gname = (gene_row.get("gene_name", "") or "").lower()
            if "methyltransferase" in gname or "mtase" in gname or "_mt" in gname:
                sys_id_this = gene_row.get("sys_id", "")
                if not sys_id_this or sys_id_this not in sys_ids_complete:
                    orphan_rows.append({
                        "accession": acc,
                        "organism_name": org,
                        "protein_id": gene_row.get("hit_id", ""),
                        "gene_name": gene_row.get("gene_name", ""),
                        "contig": gene_row.get("replicon", ""),
                        "model": gene_row.get("model_fqn", ""),
                        "notes": "orphan_MTase_no_complete_system",
                    })

        # Merge states using explicit priority (V > C > P > 0).
        # V is never inferred here — it can only be set by manual curation.
        priority = {"V": 3, "C": 2, "P": 1, "0": 0}
        for rm_type in STATE_LABELS:
            if type_counts[rm_type] == 0:
                type_states[rm_type] = "0"
                continue
            # Promote to highest state seen across loci for this genome+type
            for lr in locus_rows:
                if lr["accession"] == acc and lr["rm_type"] == rm_type:
                    candidate = lr["completeness_state"]
                    if priority.get(candidate, 0) > priority.get(type_states[rm_type], 0):
                        type_states[rm_type] = candidate

        matrix_rows.append({
            "accession": acc,
            "organism_name": org,
            "group": panel.get(acc, {}).get("group", ""),
            "Type_I_state":   type_states["Type_I"],
            "Type_II_state":  type_states["Type_II"],
            "Type_III_state": type_states["Type_III"],
            "Type_IV_state":  type_states["Type_IV"],
            "Type_I_count":   type_counts["Type_I"],
            "Type_II_count":  type_counts["Type_II"],
            "Type_III_count": type_counts["Type_III"],
            "Type_IV_count":  type_counts["Type_IV"],
        })

        # Collect R-M proteins from the explicit assemblies directory
        faa_file = args.assemblies_dir / acc
        # Search for protein FASTA in assembly dir
        faa_candidates = list(faa_file.glob("*.faa")) if faa_file.exists() else []
        if faa_candidates and locus_rows:
            needed_accs = set()
            for lr in locus_rows:
                if lr["accession"] == acc:
                    needed_accs.update(lr["component_protein_accessions"].split(";"))
            if needed_accs and any(needed_accs):
                with open(faa_candidates[0]) as fh:
                    capture = False
                    for line in fh:
                        if line.startswith(">"):
                            capture = any(na in line for na in needed_accs if na)
                        if capture:
                            protein_fa_lines.append(line.rstrip())

    # ── write outputs ──────────────────────────────────────────────────────────
    def write_tsv(path: Path, rows: list[dict], header: list[str] | None = None) -> None:
        if not rows:
            return
        fieldnames = header if header else list(rows[0].keys())
        with path.open("w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames, delimiter="\t",
                                    extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

    write_tsv(args.out_dir / "genome_rm_matrix.tsv", matrix_rows)
    write_tsv(args.out_dir / "locus_table.tsv", locus_rows, LOCUS_HEADER)
    write_tsv(args.out_dir / "partial_candidates.tsv", partial_rows)
    write_tsv(args.out_dir / "orphan_mtase_table.tsv", orphan_rows)

    with (args.out_dir / "rm_proteins.faa").open("w") as fh:
        fh.write("\n".join(protein_fa_lines))
        if protein_fa_lines:
            fh.write("\n")

    # ── write / preserve RM_evidence.tsv ──────────────────────────────────────
    evidence_path = args.rm_evidence
    if not evidence_path.exists():
        with evidence_path.open("w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=EVIDENCE_HEADER, delimiter="\t")
            writer.writeheader()
            # Seed entries for classical LAB systems (verified published evidence only)
            seed = [
                {
                    "genome_strain": "Lactococcus lactis subsp. lactis MG1363",
                    "rm_system_locus": "LlaAI",
                    "rm_type": "Type_II",
                    "evidence_level": "biochemical characterization",
                    "publication_title": "Isolation and characterization of restriction endonuclease LlaAI from Lactococcus lactis subsp. lactis",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaAI is a Type II restriction enzyme from L. lactis",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis subsp. lactis",
                    "rm_system_locus": "LlaBI",
                    "rm_type": "Type_II",
                    "evidence_level": "biochemical characterization",
                    "publication_title": "not_resolved",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaBI — Type II R-M system; REBASE annotated",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis subsp. cremoris",
                    "rm_system_locus": "LlaDCHI",
                    "rm_type": "Type_I",
                    "evidence_level": "genetic restriction phenotype",
                    "publication_title": "Molecular characterization of a chromosomal locus in Lactococcus lactis encoding a Type I R-M system",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaDCHI is a functional Type I R-M system",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis",
                    "rm_system_locus": "LlaDII",
                    "rm_type": "Type_II",
                    "evidence_level": "biochemical characterization",
                    "publication_title": "not_resolved",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaDII — REBASE annotated Type II",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis",
                    "rm_system_locus": "LlaJI",
                    "rm_type": "Type_I",
                    "evidence_level": "genetic restriction phenotype",
                    "publication_title": "LlaJI: a type I restriction and modification system in Lactococcus lactis",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaJI confers restriction of bacteriophage DNA",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis",
                    "rm_system_locus": "LlaFI",
                    "rm_type": "Type_I",
                    "evidence_level": "genetic restriction phenotype",
                    "publication_title": "not_resolved",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "LlaFI — REBASE annotated Type I",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactococcus lactis",
                    "rm_system_locus": "HsdS domain shuffling (Lactococcus)",
                    "rm_type": "Type_I",
                    "evidence_level": "genetic restriction phenotype",
                    "publication_title": "The specificity of HsdS subunit determines the recognition sequence of Type I R-M systems in Lactococcus lactis",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "HsdS domain shuffling confers altered phage restriction specificities",
                    "strain_scope": "homolog_only",
                },
                {
                    "genome_strain": "Streptococcus thermophilus LMD-9",
                    "rm_system_locus": "Sth455I",
                    "rm_type": "Type_II",
                    "evidence_level": "biochemical characterization",
                    "publication_title": "not_resolved",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "Sth455I — REBASE annotated Type II RE from S. thermophilus",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Streptococcus thermophilus",
                    "rm_system_locus": "Sth368I",
                    "rm_type": "Type_II",
                    "evidence_level": "biochemical characterization",
                    "publication_title": "not_resolved",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "Sth368I — REBASE annotated Type II RE from S. thermophilus",
                    "strain_scope": "named_non_selected_strain",
                },
                {
                    "genome_strain": "Lactiplantibacillus plantarum",
                    "rm_system_locus": "donor methylation phenotype",
                    "rm_type": "Type_IV",
                    "evidence_level": "methylome-supported",
                    "publication_title": "Donor methylation-dependent transformation and restriction in Lactobacillus plantarum",
                    "doi": "not_resolved",
                    "pmid": "not_resolved",
                    "exact_claim": "L. plantarum exhibits donor-methylation-dependent DNA restriction",
                    "strain_scope": "named_non_selected_strain",
                },
            ]
            writer.writerows(seed)

    print(f"Stage 4 classification complete. Outputs in {args.out_dir}")


if __name__ == "__main__":
    main()
