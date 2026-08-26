#!/usr/bin/env python3
"""Root an IQ-TREE Newick tree with explicit outgroups and make an LAB-only copy."""

from __future__ import annotations

import argparse
from pathlib import Path
from Bio import Phylo


def terminals_by_name(tree, names):
    found = []
    for name in names:
        matches = [clade for clade in tree.get_terminals() if clade.name == name]
        if len(matches) != 1:
            raise SystemExit(f"Expected exactly one terminal named {name!r}; found {len(matches)}")
        found.append(matches[0])
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tree", required=True, type=Path)
    parser.add_argument("--outgroups", required=True, nargs="+")
    parser.add_argument("--rooted", required=True, type=Path)
    parser.add_argument("--lab-only", required=True, type=Path)
    args = parser.parse_args()

    tree = Phylo.read(args.tree, "newick")
    outgroups = terminals_by_name(tree, args.outgroups)
    tree.root_with_outgroup(*outgroups)
    args.rooted.parent.mkdir(parents=True, exist_ok=True)
    Phylo.write(tree, args.rooted, "newick")

    lab_tree = Phylo.read(args.rooted, "newick")
    for name in args.outgroups:
        target = next((c for c in lab_tree.get_terminals() if c.name == name), None)
        if target is None:
            raise SystemExit(f"Outgroup {name!r} disappeared before pruning")
        lab_tree.prune(target)
    Phylo.write(lab_tree, args.lab_only, "newick")


if __name__ == "__main__":
    main()
