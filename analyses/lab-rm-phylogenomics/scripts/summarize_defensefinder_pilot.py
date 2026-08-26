#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path
from typing import Dict, List


def read_tsv(path: Path) -> tuple[List[str], List[Dict[str, str]]]:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        rows = list(reader)
        return list(reader.fieldnames or []), rows


def write_tsv(path: Path, rows: List[Dict[str, str]], fields: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        writer.writeheader(); writer.writerows(rows)


def merge(manifest_rows, column, output):
    all_rows=[]; fields=["assembly_accession"]
    for m in manifest_rows:
        file=Path(m[column])
        f, rows=read_tsv(file)
        for x in f:
            if x not in fields: fields.append(x)
        all_rows.extend({"assembly_accession":m["assembly_accession"], **r} for r in rows)
    write_tsv(output, all_rows, fields)
    return fields, all_rows


def rm_like(row: Dict[str, str]) -> bool:
    text=" ".join(str(v) for v in row.values()).lower()
    explicit=("rm_type_" in text or "rm-type-" in text or "restriction-modification" in text)
    component=any(token in text for token in (
        "type_i_restriction", "type_i_methyl", "type_i_specific", "hsdr", "hsdm", "hsds",
        "type_ii_restriction", "type_ii_methyl", "type_iig", "type_iii_restriction", "type_iii_methyl",
        "mcrb", "mcrc", "mrr", "gmrsd", "restriction modification"
    ))
    return explicit or component


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--systems", type=Path, required=True)
    ap.add_argument("--genes", type=Path, required=True)
    ap.add_argument("--hmmer", type=Path, required=True)
    ap.add_argument("--rm-systems", type=Path, required=True)
    ap.add_argument("--rm-hits", type=Path, required=True)
    ap.add_argument("--summary", type=Path, required=True)
    a=ap.parse_args()
    _, manifest=read_tsv(a.manifest)
    sf, systems=merge(manifest,"systems_file",a.systems)
    gf, genes=merge(manifest,"genes_file",a.genes)
    hf, hmmer=merge(manifest,"hmmer_file",a.hmmer)
    rm_systems=[r for r in systems if rm_like(r)]
    rm_hits=[r for r in hmmer if rm_like(r)]
    write_tsv(a.rm_systems,rm_systems,sf)
    write_tsv(a.rm_hits,rm_hits,hf)

    def system_label(r):
        for key in ("subtype","type","system","name_of_system","model_fqn","model_name"):
            if r.get(key): return r[key]
        return "UNSPECIFIED"
    labels=Counter(system_label(r) for r in systems)
    rm_labels=Counter(system_label(r) for r in rm_systems)
    with a.summary.open("w",encoding="utf-8") as f:
        f.write("# Stage 4 — DefenseFinder pilot\n\n")
        f.write(f"- Assemblies analyzed: **{len(manifest)}**\n")
        f.write(f"- Complete defense systems detected: **{len(systems)}**\n")
        f.write(f"- Genes assigned to complete systems: **{len(genes)}**\n")
        f.write(f"- All HMM profile hits: **{len(hmmer)}**\n")
        f.write(f"- Preliminary R-M system rows: **{len(rm_systems)}**\n")
        f.write(f"- Preliminary R-M-related HMM rows: **{len(rm_hits)}**\n\n")
        f.write("## Detected system labels\n\n| Label | Rows |\n|---|---:|\n")
        for label,count in labels.most_common(): f.write(f"| {label} | {count} |\n")
        f.write("\n## Preliminary R-M labels\n\n| Label | Rows |\n|---|---:|\n")
        for label,count in rm_labels.most_common(): f.write(f"| {label} | {count} |\n")
        f.write("\nThe R-M filters in this pilot are deliberately permissive. Final classification will use the exact model names and columns observed here, then inspect component-level hits and genomic context.\n")

if __name__=="__main__": main()
