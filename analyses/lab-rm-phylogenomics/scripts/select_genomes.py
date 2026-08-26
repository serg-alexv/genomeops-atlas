#!/usr/bin/env python3
"""Select a balanced, high-quality LAB genome panel from NCBI metadata.

Selection principles
--------------------
1. RefSeq, annotated, non-MAG, non-atypical assemblies are filtered upstream.
2. Named species are preferred; unclassified ``sp.`` records are excluded.
3. Duplicate assemblies of the same named strain/isolate are collapsed to the
   best assembly.
4. Within each operational taxon group, one best assembly per species is chosen
   first; remaining places are filled round-robin across species. This prevents
   over-sequenced species from dominating the panel while allowing multiple
   strains where a group contains only a few species (e.g. S. thermophilus).
5. Assembly quality ranking is deterministic and documented below.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


ASSEMBLY_RANK = {
    "complete genome": 0,
    "complete": 0,
    "chromosome": 1,
    "scaffold": 2,
    "contig": 3,
}

REFSEQ_RANK = {
    "reference genome": 0,
    "representative genome": 1,
    "na": 2,
    "": 2,
}


def clean(value: str | None) -> str:
    return (value or "").strip()


def norm(value: str | None) -> str:
    return re.sub(r"\s+", " ", clean(value)).strip().lower()


def to_int(value: str | None, default: int = 10**9) -> int:
    text = clean(value).replace(",", "")
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return default


def to_float(value: str | None, default: float) -> float:
    text = clean(value).replace("%", "")
    try:
        result = float(text)
        return result if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def date_rank(value: str | None) -> int:
    """Return negative ordinal so newer dates rank before older dates."""
    text = clean(value)[:10]
    try:
        return -dt.date.fromisoformat(text).toordinal()
    except ValueError:
        return 0


def named_species(organism_name: str) -> bool:
    name = norm(organism_name)
    bad_fragments = (
        " bacterium",
        "uncultured",
        "unclassified",
        "metagenome",
        "synthetic construct",
    )
    if any(fragment in name for fragment in bad_fragments):
        return False
    tokens = name.split()
    if len(tokens) < 2:
        return False
    if tokens[1] in {"sp.", "sp", "spp.", "spp"}:
        return False
    return True


def species_key(organism_name: str) -> str:
    tokens = clean(organism_name).split()
    if len(tokens) >= 2:
        return " ".join(tokens[:2])
    return clean(organism_name)


def strain_label(row: Dict[str, str]) -> str:
    return clean(row.get("strain")) or clean(row.get("isolate")) or clean(row.get("biosample"))


def dedup_key(row: Dict[str, str]) -> Tuple[str, str, str]:
    """Collapse multiple assemblies representing the same named biological isolate."""
    label = norm(strain_label(row))
    if not label:
        # Without strain/isolate metadata, BioSample is the most stable available key.
        label = norm(row.get("biosample")) or norm(row.get("accession"))
    return norm(row.get("group")), norm(row.get("organism_name")), label


def quality_key(row: Dict[str, str]) -> Tuple:
    level = norm(row.get("assembly_level"))
    refseq = norm(row.get("refseq_category"))
    type_material = 0 if clean(row.get("type_material")) else 1
    completeness = to_float(row.get("checkm_completeness"), default=-1.0)
    contamination = to_float(row.get("checkm_contamination"), default=999.0)
    contigs = to_int(row.get("contig_count"))
    length = to_int(row.get("total_length"), default=0)
    return (
        ASSEMBLY_RANK.get(level, 9),
        REFSEQ_RANK.get(refseq, 2),
        type_material,
        -completeness,
        contamination,
        contigs,
        -length,
        date_rank(row.get("release_date")),
        clean(row.get("accession")),
    )


def read_tsv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    if not rows:
        raise SystemExit(f"No metadata records found in {path}")
    return rows


def write_tsv(path: Path, rows: Iterable[Dict[str, str]], fields: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def select_group(rows: List[Dict[str, str]], target_n: int) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    excluded: List[Dict[str, str]] = []
    eligible: List[Dict[str, str]] = []

    for row in rows:
        if not clean(row.get("accession")).startswith("GCF_"):
            copy = dict(row)
            copy["exclusion_reason"] = "not_refseq_gcf"
            excluded.append(copy)
            continue
        if not named_species(clean(row.get("organism_name"))):
            copy = dict(row)
            copy["exclusion_reason"] = "unnamed_or_unclassified_species"
            excluded.append(copy)
            continue
        eligible.append(row)

    # Collapse duplicate assemblies of the same named isolate/strain.
    best_by_isolate: Dict[Tuple[str, str, str], Dict[str, str]] = {}
    for row in eligible:
        key = dedup_key(row)
        incumbent = best_by_isolate.get(key)
        if incumbent is None or quality_key(row) < quality_key(incumbent):
            if incumbent is not None:
                copy = dict(incumbent)
                copy["exclusion_reason"] = "inferior_duplicate_isolate_assembly"
                excluded.append(copy)
            best_by_isolate[key] = row
        else:
            copy = dict(row)
            copy["exclusion_reason"] = "inferior_duplicate_isolate_assembly"
            excluded.append(copy)

    by_species: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in best_by_isolate.values():
        by_species[species_key(clean(row.get("organism_name")))].append(row)
    for species in by_species:
        by_species[species].sort(key=quality_key)

    # Species are ordered by their best available assembly quality.
    species_order = sorted(by_species, key=lambda sp: (quality_key(by_species[sp][0]), sp))

    selected: List[Dict[str, str]] = []
    round_index = 0
    while len(selected) < target_n:
        added = False
        for species in species_order:
            candidates = by_species[species]
            if round_index < len(candidates):
                row = dict(candidates[round_index])
                row["species_key"] = species
                row["selection_round"] = str(round_index + 1)
                row["quality_rank_within_species"] = str(round_index + 1)
                selected.append(row)
                added = True
                if len(selected) >= target_n:
                    break
        if not added:
            break
        round_index += 1

    selected_accessions = {row["accession"] for row in selected}
    for species, candidates in by_species.items():
        for row in candidates:
            if row["accession"] not in selected_accessions:
                copy = dict(row)
                copy["exclusion_reason"] = "outside_balanced_group_quota"
                excluded.append(copy)

    return selected, excluded


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True, type=Path)
    parser.add_argument("--taxa-config", required=True, type=Path)
    parser.add_argument("--selected", required=True, type=Path)
    parser.add_argument("--excluded", required=True, type=Path)
    parser.add_argument("--summary", required=True, type=Path)
    args = parser.parse_args()

    candidates = read_tsv(args.candidates)
    config_rows = read_tsv(args.taxa_config)
    targets = {row["group"]: int(row["target_n"]) for row in config_rows}
    group_order = [row["group"] for row in config_rows]

    grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in candidates:
        grouped[row["group"]].append(row)

    selected_all: List[Dict[str, str]] = []
    excluded_all: List[Dict[str, str]] = []
    for group in group_order:
        selected, excluded = select_group(grouped.get(group, []), targets[group])
        selected_all.extend(selected)
        excluded_all.extend(excluded)

    # Add stable display labels and global panel order.
    order = 1
    for row in selected_all:
        label = strain_label(row)
        organism = clean(row.get("organism_name"))
        row["display_label"] = f"{organism} {label}".strip()
        row["panel_order"] = str(order)
        order += 1

    base_fields = list(candidates[0].keys())
    selected_fields = base_fields + [
        "species_key",
        "selection_round",
        "quality_rank_within_species",
        "display_label",
        "panel_order",
    ]
    excluded_fields = base_fields + ["exclusion_reason"]
    write_tsv(args.selected, selected_all, selected_fields)
    write_tsv(args.excluded, excluded_all, excluded_fields)

    args.summary.parent.mkdir(parents=True, exist_ok=True)
    with args.summary.open("w", encoding="utf-8") as handle:
        handle.write("# LAB genome panel discovery summary\n\n")
        handle.write("Selection is based only on NCBI metadata at this stage; no R-M annotation or phylogenetic marker extraction has yet been performed.\n\n")
        handle.write("| Operational group | Candidate assemblies | Named species | Selected | Target | Complete | Chromosome | Scaffold |\n")
        handle.write("|---|---:|---:|---:|---:|---:|---:|---:|\n")
        for group in group_order:
            group_candidates = grouped.get(group, [])
            group_selected = [row for row in selected_all if row["group"] == group]
            levels = Counter(norm(row.get("assembly_level")) for row in group_selected)
            species = {species_key(row["organism_name"]) for row in group_candidates if named_species(row["organism_name"])}
            handle.write(
                f"| {group} | {len(group_candidates)} | {len(species)} | {len(group_selected)} | {targets[group]} | "
                f"{levels.get('complete genome', 0) + levels.get('complete', 0)} | {levels.get('chromosome', 0)} | {levels.get('scaffold', 0)} |\n"
            )
        handle.write(f"\n**Total selected:** {len(selected_all)} assemblies.\n\n")
        handle.write("## Selection hierarchy\n\n")
        handle.write("1. Complete genome over chromosome over scaffold.\n")
        handle.write("2. RefSeq reference over representative over other RefSeq assemblies.\n")
        handle.write("3. Type-material assembly where reported.\n")
        handle.write("4. Higher CheckM completeness, lower contamination, fewer contigs.\n")
        handle.write("5. One best assembly per species first, then round-robin additional strains until the group quota is reached.\n")
        handle.write("6. Unnamed `sp.` and unclassified records are excluded from the visible panel.\n")


if __name__ == "__main__":
    main()
