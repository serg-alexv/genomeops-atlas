#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, Iterator, List


def write_tsv(path: Path, rows: Iterable[Dict[str, str]], fields: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def fasta_records(path: Path) -> Iterator[tuple[str, str]]:
    header = None
    seq: List[str] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            line = line.rstrip("\n\r")
            if line.startswith(">"):
                if header is not None:
                    yield header, "".join(seq)
                header = line[1:]
                seq = []
            else:
                seq.append(line.strip())
        if header is not None:
            yield header, "".join(seq)


def classify_file(path: Path) -> str:
    name = path.name
    if name.endswith("_genomic.fna"):
        return "genome_fasta"
    if name == "protein.faa" or name.endswith("_protein.faa"):
        return "protein_fasta"
    if name == "cds_from_genomic.fna" or name.endswith("_cds_from_genomic.fna"):
        return "cds_fasta"
    if name.endswith(".gff") or name.endswith(".gff3"):
        return "gff3"
    if name.endswith(".gbff"):
        return "gbff"
    if name == "sequence_report.jsonl":
        return "sequence_report"
    return "other"


def group_for(organism_name: str) -> str:
    if organism_name == "Streptococcus thermophilus" or organism_name.startswith("Streptococcus thermophilus "):
        return "Streptococcus_thermophilus"
    genus = organism_name.split()[0] if organism_name else "Unknown"
    mapping = {
        "Lactococcus": "Lactococcus",
        "Lactiplantibacillus": "Lactiplantibacillus",
        "Lacticaseibacillus": "Lacticaseibacillus",
        "Limosilactobacillus": "Limosilactobacillus",
        "Lactobacillus": "Lactobacillus_sensu_stricto",
        "Leuconostoc": "Leuconostoc",
        "Pediococcus": "Pediococcus",
        "Oenococcus": "Oenococcus",
        "Weissella": "Weissella",
    }
    return mapping.get(genus, f"UNEXPECTED_{genus}")


def load_assembly_metadata(report: Path) -> Dict[str, Dict[str, str]]:
    result: Dict[str, Dict[str, str]] = {}
    with report.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            obj = json.loads(line)
            accession = obj.get("accession") or obj.get("current_accession")
            org = obj.get("organism") or {}
            assembly = obj.get("assembly_info") or {}
            biosample = assembly.get("biosample") or {}
            infraspecific = org.get("infraspecific_names") or {}
            strain = infraspecific.get("strain") or biosample.get("strain") or ""
            isolate = infraspecific.get("isolate") or biosample.get("isolate") or ""
            organism_name = org.get("organism_name", "")
            label_suffix = strain or isolate
            display_label = f"{organism_name} {label_suffix}".strip()
            result[accession] = {
                "group": group_for(organism_name),
                "assembly_accession": accession,
                "organism_name": organism_name,
                "tax_id": str(org.get("tax_id", "")),
                "strain": strain,
                "isolate": isolate,
                "display_label": display_label,
                "assembly_level": assembly.get("assembly_level", ""),
                "refseq_category": assembly.get("refseq_category", ""),
                "biosample": biosample.get("accession", ""),
                "bioproject": assembly.get("bioproject_accession", ""),
            }
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--accessions", type=Path, required=True)
    parser.add_argument("--package-root", type=Path, required=True)
    parser.add_argument("--file-manifest", type=Path, required=True)
    parser.add_argument("--assembly-summary", type=Path, required=True)
    parser.add_argument("--protein-summary", type=Path, required=True)
    parser.add_argument("--protein-accessions", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    accessions = [line.strip() for line in args.accessions.read_text().splitlines() if line.strip()]
    data_root = args.package_root / "ncbi_dataset" / "data"
    report_path = data_root / "assembly_data_report.jsonl"
    if not data_root.exists() or not report_path.exists():
        raise SystemExit(f"Incomplete NCBI package: {data_root}")
    metadata = load_assembly_metadata(report_path)

    file_rows: List[Dict[str, str]] = []
    assembly_rows: List[Dict[str, str]] = []
    proteome_rows: List[Dict[str, str]] = []
    all_protein_ids: List[str] = []

    for accession in accessions:
        meta = metadata.get(accession)
        if not meta:
            raise SystemExit(f"Assembly metadata missing for {accession}")
        assembly_dir = data_root / accession
        if not assembly_dir.exists():
            raise SystemExit(f"Missing assembly directory for {accession}")

        type_counts = Counter()
        total_bytes = 0
        protein_count = 0
        protein_residues = 0
        accession_ids: List[str] = []

        for path in sorted(p for p in assembly_dir.rglob("*") if p.is_file()):
            role = classify_file(path)
            size = path.stat().st_size
            total_bytes += size
            type_counts[role] += 1
            file_rows.append({
                **meta,
                "file_role": role,
                "relative_path": str(path.relative_to(args.package_root)),
                "bytes": str(size),
                "sha256": sha256(path),
            })
            if role == "protein_fasta":
                for header, seq in fasta_records(path):
                    protein_count += 1
                    protein_residues += len(seq)
                    pid = header.split()[0]
                    if pid:
                        accession_ids.append(pid)
                        all_protein_ids.append(pid)

        required = {"genome_fasta", "protein_fasta", "cds_fasta", "gff3", "gbff", "sequence_report"}
        missing = sorted(required - set(type_counts))
        assembly_rows.append({
            **meta,
            "assembly_directory_present": "yes",
            "total_files": str(sum(type_counts.values())),
            "total_bytes": str(total_bytes),
            "missing_required_roles": ";".join(missing),
            "download_complete": "yes" if not missing else "no",
        })
        proteome_rows.append({
            **meta,
            "protein_count": str(protein_count),
            "total_amino_acid_residues": str(protein_residues),
            "unique_header_ids": str(len(set(accession_ids))),
            "duplicate_header_ids": str(protein_count - len(set(accession_ids))),
        })

    base = ["group", "assembly_accession", "organism_name", "tax_id", "strain", "isolate", "display_label", "assembly_level", "refseq_category", "biosample", "bioproject"]
    write_tsv(args.file_manifest, file_rows, base + ["file_role", "relative_path", "bytes", "sha256"])
    write_tsv(args.assembly_summary, assembly_rows, base + ["assembly_directory_present", "total_files", "total_bytes", "missing_required_roles", "download_complete"])
    write_tsv(args.protein_summary, proteome_rows, base + ["protein_count", "total_amino_acid_residues", "unique_header_ids", "duplicate_header_ids"])
    args.protein_accessions.write_text("\n".join(all_protein_ids) + "\n", encoding="utf-8")

    complete = sum(row["download_complete"] == "yes" for row in assembly_rows)
    total_proteins = sum(int(row["protein_count"]) for row in proteome_rows)
    total_bytes = sum(int(row["total_bytes"]) for row in assembly_rows)
    group_counts = Counter(row["group"] for row in assembly_rows)
    unexpected = sorted(g for g in group_counts if g.startswith("UNEXPECTED_"))

    with args.report.open("w", encoding="utf-8") as handle:
        handle.write("# Stage 2 — NCBI genome and proteome acquisition\n\n")
        handle.write(f"- Frozen selected assemblies requested: **{len(accessions)}**\n")
        handle.write(f"- Assembly directories retrieved: **{len(assembly_rows)}**\n")
        handle.write(f"- Assemblies with all required file classes: **{complete}**\n")
        handle.write(f"- Annotated protein records inventoried: **{total_proteins:,}**\n")
        handle.write(f"- Uncompressed package content inventoried: **{total_bytes / 1e9:.2f} GB**\n")
        if unexpected:
            handle.write(f"- Unexpected taxonomic groups: **{', '.join(unexpected)}**\n")
        handle.write("\n## Assemblies by operational group\n\n")
        handle.write("| Group | Assemblies |\n|---|---:|\n")
        for group, count in sorted(group_counts.items()):
            handle.write(f"| {group} | {count} |\n")
        handle.write("\nAll file paths, byte sizes, and SHA-256 checksums are recorded in `genome_file_manifest.tsv`.\n")

    if complete != len(accessions):
        raise SystemExit(f"Only {complete}/{len(accessions)} assemblies contain every required file class")
    if unexpected:
        raise SystemExit(f"Unexpected taxonomic group assignments: {unexpected}")


if __name__ == "__main__":
    main()
