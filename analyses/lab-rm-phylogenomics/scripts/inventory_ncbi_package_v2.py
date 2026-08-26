#!/usr/bin/env python3
"""Inventory an NCBI Datasets genome package for the frozen LAB panel."""
from __future__ import annotations

import argparse, csv, hashlib, json
from collections import Counter
from pathlib import Path


def pick(d, *keys, default=""):
    for k in keys:
        if isinstance(d, dict) and d.get(k) not in (None, "", [], {}):
            return d[k]
    return default


def role(path: Path) -> str:
    n = path.name
    # Test CDS first: cds_from_genomic.fna also ends with _genomic.fna.
    if n == "cds_from_genomic.fna" or n.endswith("_cds_from_genomic.fna"): return "cds_fasta"
    if n == "genomic.fna" or n.endswith("_genomic.fna"): return "genome_fasta"
    if n == "protein.faa" or n.endswith("_protein.faa"): return "protein_fasta"
    if n in {"genomic.gff", "genomic.gff3"} or n.endswith((".gff", ".gff3")): return "gff3"
    if n == "genomic.gbff" or n.endswith(".gbff"): return "gbff"
    if n == "sequence_report.jsonl": return "sequence_report"
    return "other"


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""): h.update(block)
    return h.hexdigest()


def fasta(path: Path):
    head, seq = None, []
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.rstrip()
            if line.startswith(">"):
                if head is not None: yield head, "".join(seq)
                head, seq = line[1:], []
            else: seq.append(line.strip())
    if head is not None: yield head, "".join(seq)


def attr(biosample, name):
    for x in pick(biosample, "attributes", default=[]):
        if str(pick(x, "name")).lower().replace("_", "-") == name:
            return str(pick(x, "value"))
    return ""


def op_group(name: str) -> str:
    clean = name.replace("[", "").replace("]", "")
    if clean.startswith("Streptococcus thermophilus"): return "Streptococcus_thermophilus"
    genus = clean.split()[0] if clean else "Unknown"
    return {
        "Lactococcus":"Lactococcus", "Lactiplantibacillus":"Lactiplantibacillus",
        "Lacticaseibacillus":"Lacticaseibacillus", "Limosilactobacillus":"Limosilactobacillus",
        "Lactobacillus":"Lactobacillus_sensu_stricto", "Leuconostoc":"Leuconostoc",
        "Pediococcus":"Pediococcus", "Oenococcus":"Oenococcus", "Weissella":"Weissella",
    }.get(genus, "UNEXPECTED_" + genus)


def load_meta(path: Path):
    out = {}
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if not line.strip(): continue
            o = json.loads(line)
            accession = str(pick(o, "accession", "current_accession", "currentAccession"))
            org = pick(o, "organism", default={}) or {}
            asm = pick(o, "assembly_info", "assemblyInfo", default={}) or {}
            bio = pick(asm, "biosample", "bioSample", default={}) or {}
            infra = pick(org, "infraspecific_names", "infraspecificNames", default={}) or {}
            name = str(pick(org, "organism_name", "organismName"))
            strain = str(pick(infra, "strain") or pick(bio, "strain") or attr(bio, "strain"))
            isolate = str(pick(infra, "isolate") or pick(bio, "isolate") or attr(bio, "isolate"))
            out[accession] = {
                "group":op_group(name), "assembly_accession":accession, "organism_name":name,
                "tax_id":str(pick(org, "tax_id", "taxId")), "strain":strain, "isolate":isolate,
                "display_label":f"{name} {strain or isolate}".strip(),
                "assembly_level":str(pick(asm, "assembly_level", "assemblyLevel")),
                "refseq_category":str(pick(asm, "refseq_category", "refseqCategory")),
                "biosample":str(pick(bio, "accession")),
                "bioproject":str(pick(asm, "bioproject_accession", "bioprojectAccession")),
            }
    return out


def write(path, rows, fields):
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        w.writeheader(); w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    for x in ["accessions","package_root","file_manifest","assembly_summary","protein_summary","protein_accessions","report"]:
        ap.add_argument("--" + x.replace("_", "-"), dest=x, type=Path, required=True)
    a = ap.parse_args()
    accessions = [x.strip() for x in a.accessions.read_text().splitlines() if x.strip()]
    root = a.package_root / "ncbi_dataset" / "data"
    meta = load_meta(root / "assembly_data_report.jsonl")
    files, assemblies, proteomes, protein_ids = [], [], [], []
    required = {"genome_fasta","protein_fasta","cds_fasta","gff3","gbff","sequence_report"}

    for acc in accessions:
        m, d = meta.get(acc), root / acc
        if not m: raise SystemExit(f"Metadata missing: {acc}")
        if not d.exists(): raise SystemExit(f"Directory missing: {acc}")
        counts, nprot, residues, ids, total = Counter(), 0, 0, [], 0
        for p in sorted(x for x in d.rglob("*") if x.is_file()):
            r, size = role(p), p.stat().st_size
            counts[r] += 1; total += size
            files.append({**m,"file_role":r,"relative_path":str(p.relative_to(a.package_root)),"bytes":str(size),"sha256":digest(p)})
            if r == "protein_fasta":
                for h, s in fasta(p):
                    pid = h.split()[0]; nprot += 1; residues += len(s); ids.append(pid); protein_ids.append(pid)
        missing = sorted(required - set(counts))
        assemblies.append({**m,"assembly_directory_present":"yes","total_files":str(sum(counts.values())),
            "total_bytes":str(total),"file_role_counts":";".join(f"{k}={counts[k]}" for k in sorted(counts)),
            "missing_required_roles":";".join(missing),"download_complete":"yes" if not missing else "no"})
        proteomes.append({**m,"protein_count":str(nprot),"total_amino_acid_residues":str(residues),
            "unique_header_ids":str(len(set(ids))),"duplicate_header_ids":str(nprot-len(set(ids)))})

    base=["group","assembly_accession","organism_name","tax_id","strain","isolate","display_label","assembly_level","refseq_category","biosample","bioproject"]
    write(a.file_manifest, files, base+["file_role","relative_path","bytes","sha256"])
    write(a.assembly_summary, assemblies, base+["assembly_directory_present","total_files","total_bytes","file_role_counts","missing_required_roles","download_complete"])
    write(a.protein_summary, proteomes, base+["protein_count","total_amino_acid_residues","unique_header_ids","duplicate_header_ids"])
    a.protein_accessions.write_text("\n".join(protein_ids)+"\n", encoding="utf-8")

    complete=sum(x["download_complete"]=="yes" for x in assemblies)
    groups=Counter(x["group"] for x in assemblies); missing=Counter(x["missing_required_roles"] or "none" for x in assemblies)
    with a.report.open("w", encoding="utf-8") as f:
        f.write("# Stage 2 — NCBI genome and proteome acquisition\n\n")
        f.write(f"- Assemblies requested/retrieved/complete: **{len(accessions)}/{len(assemblies)}/{complete}**\n")
        f.write(f"- Annotated proteins: **{sum(int(x['protein_count']) for x in proteomes):,}**\n")
        f.write(f"- Inventoried uncompressed content: **{sum(int(x['total_bytes']) for x in assemblies)/1e9:.2f} GB**\n\n")
        f.write("## Groups\n\n| Group | N |\n|---|---:|\n")
        for g,n in sorted(groups.items()): f.write(f"| {g} | {n} |\n")
        f.write("\n## Missing-file patterns\n\n| Pattern | N |\n|---|---:|\n")
        for p,n in missing.most_common(): f.write(f"| {p} | {n} |\n")

    unexpected=[g for g in groups if g.startswith("UNEXPECTED_")]
    if complete != len(accessions): raise SystemExit(f"Only {complete}/{len(accessions)} complete packages")
    if unexpected: raise SystemExit(f"Unexpected groups: {unexpected}")

if __name__ == "__main__": main()
