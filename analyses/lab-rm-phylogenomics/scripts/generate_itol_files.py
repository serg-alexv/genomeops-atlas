#!/usr/bin/env python3
"""generate_itol_files.py — produce iTOL annotation files from R-M matrix.

Inputs:
  --matrix      genome_rm_matrix.tsv
  --label-map   label_to_accession.tsv
  --panel       selected_panel.tsv
  --out-dir     directory for iTOL files

Outputs (all iTOL v6 dataset format):
  itol_branch_colors.txt    — tip/clade colors by operational group
  itol_type1_ring.txt       — Type I binary/colored bars
  itol_type2_ring.txt       — Type II binary/colored bars
  itol_type3_ring.txt       — Type III binary/colored bars
  itol_type4_ring.txt       — Type IV binary/colored bars
  itol_symbols.txt          — validated-system symbols (V state)
  itol_clade_labels.txt     — operational group label blocks
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

# ── Group → branch/tip color (hex) ───────────────────────────────────────────
GROUP_COLORS: dict[str, str] = {
    "Lactococcus":              "#E63946",
    "Streptococcus_thermophilus": "#457B9D",
    "Lactiplantibacillus":      "#2D6A4F",
    "Lacticaseibacillus":       "#52B788",
    "Limosilactobacillus":      "#40916C",
    "Lactobacillus_sensu_stricto": "#1B4332",
    "Leuconostoc":              "#F4A261",
    "Pediococcus":              "#E76F51",
    "Oenococcus":               "#264653",
    "Weissella":                "#A8DADC",
}

# ── R-M type → ring colors (pale=partial, saturated=complete) ─────────────────
TYPE_COLORS: dict[str, dict[str, str]] = {
    "Type_I":   {"P": "#FFA8B8", "C": "#CC0022", "V": "#CC0022"},
    "Type_II":  {"P": "#A8C8FF", "C": "#0044CC", "V": "#0044CC"},
    "Type_III": {"P": "#B8FFB8", "C": "#00AA00", "V": "#00AA00"},
    "Type_IV":  {"P": "#FFEBB8", "C": "#CC7700", "V": "#CC7700"},
}

STATE_FIELDS: dict[str, str] = {
    "Type_I":   "Type_I_state",
    "Type_II":  "Type_II_state",
    "Type_III": "Type_III_state",
    "Type_IV":  "Type_IV_state",
}


def read_tsv(path: Path) -> list[dict]:
    if not path.exists():
        print(f"WARNING: {path} not found", file=sys.stderr)
        return []
    with path.open() as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def label_for(acc: str, label_map: dict[str, str]) -> str:
    return label_map.get(acc, acc)


def write_branch_colors(out: Path, panel: list[dict], label_map: dict[str, str]) -> None:
    with out.open("w") as fh:
        fh.write("TREE_COLORS\nSEPARATOR TAB\nDATA\n")
        for row in panel:
            acc   = row.get("accession", "")
            group = row.get("group", "")
            color = GROUP_COLORS.get(group, "#888888")
            label = label_for(acc, label_map)
            fh.write(f"{label}\tbranch\t{color}\tnormal\t2\n")


def write_rm_ring(out: Path, rm_type: str, matrix: list[dict],
                  label_map: dict[str, str], ring_pos: int) -> None:
    state_col = STATE_FIELDS[rm_type]
    colors    = TYPE_COLORS[rm_type]
    with out.open("w") as fh:
        fh.write("DATASET_COLORSTRIP\n")
        fh.write("SEPARATOR TAB\n")
        fh.write(f"DATASET_LABEL\t{rm_type}\n")
        fh.write(f"COLOR\t{colors['C']}\n")
        fh.write(f"STRIP_WIDTH\t25\n")
        fh.write(f"SHOW_STRIP_LABELS\t0\n")
        fh.write("DATA\n")
        for row in matrix:
            acc   = row.get("accession", "")
            state = row.get(state_col, "0")
            label = label_for(acc, label_map)
            if state == "0":
                color = "#FFFFFF"
            else:
                color = colors.get(state, "#CCCCCC")
            fh.write(f"{label}\t{color}\t{state}\n")


def write_symbols(out: Path, matrix: list[dict], label_map: dict[str, str]) -> None:
    """Write V-state markers (evidence-validated systems)."""
    with out.open("w") as fh:
        fh.write("DATASET_SYMBOL\n")
        fh.write("SEPARATOR TAB\n")
        fh.write("DATASET_LABEL\tValidated_systems\n")
        fh.write("COLOR\t#FFD700\n")
        fh.write("DATA\n")
        for row in matrix:
            acc = row.get("accession", "")
            for rm_type, sc in STATE_FIELDS.items():
                if row.get(sc) == "V":
                    label = label_for(acc, label_map)
                    fh.write(f"{label}\t1\t5\t{TYPE_COLORS[rm_type]['V']}\t1\t0\n")
                    break


def write_clade_labels(out: Path, panel: list[dict], label_map: dict[str, str]) -> None:
    """Write one label block per operational group."""
    from collections import defaultdict
    groups: dict[str, list[str]] = defaultdict(list)
    for row in panel:
        groups[row.get("group", "")].append(label_for(row.get("accession", ""), label_map))
    with out.open("w") as fh:
        fh.write("TREE_COLORS\nSEPARATOR TAB\nDATA\n")
        for group, labels in groups.items():
            if len(labels) < 2:
                continue
            color = GROUP_COLORS.get(group, "#888888")
            fh.write(f"{labels[0]}|{labels[-1]}\tclade\t{color}\tnormal\t4\t{group}\n")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--matrix",    required=True, type=Path)
    ap.add_argument("--label-map", required=True, type=Path)
    ap.add_argument("--panel",     required=True, type=Path)
    ap.add_argument("--out-dir",   required=True, type=Path)
    return ap.parse_args()


def main() -> None:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    matrix    = read_tsv(args.matrix)
    panel     = read_tsv(args.panel)
    label_raw = read_tsv(args.label_map)
    label_map = {r["accession"]: r["label"] for r in label_raw if "accession" in r}

    write_branch_colors(args.out_dir / "itol_branch_colors.txt",    panel, label_map)
    write_rm_ring(args.out_dir / "itol_type1_ring.txt", "Type_I",   matrix, label_map, 1)
    write_rm_ring(args.out_dir / "itol_type2_ring.txt", "Type_II",  matrix, label_map, 2)
    write_rm_ring(args.out_dir / "itol_type3_ring.txt", "Type_III", matrix, label_map, 3)
    write_rm_ring(args.out_dir / "itol_type4_ring.txt", "Type_IV",  matrix, label_map, 4)
    write_symbols(args.out_dir / "itol_symbols.txt",               matrix, label_map)
    write_clade_labels(args.out_dir / "itol_clade_labels.txt",     panel,  label_map)

    print(f"iTOL files written to {args.out_dir}")


if __name__ == "__main__":
    main()
