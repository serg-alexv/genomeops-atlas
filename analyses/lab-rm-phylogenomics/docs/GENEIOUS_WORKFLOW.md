# Geneious Workflow — LAB R-M Phylogenomics Concatenated Alignment

This guide explains how to import the pre-built concatenated protein alignment and infer or view the maximum-likelihood phylogeny in Geneious Prime.

---

## Files in this directory

| File | Description |
|---|---|
| `concat_alignment.faa` | Concatenated trimmed amino-acid alignment (FASTA) — **already aligned, do not re-align** |
| `concat_alignment.phy` | Same alignment in PHYLIP format |
| `concat_alignment.nex` | Same alignment in NEXUS format |
| `partition.txt`        | Partition/charset map for each marker in the concatenated alignment |
| `lab_rm_rooted.nwk`    | Outgroup-rooted maximum-likelihood tree (Newick) |
| `lab_only.nwk`         | LAB-only display tree (outgroups pruned; Newick) |
| `label_to_accession.tsv` | Mapping of tree tip labels to NCBI accessions and organism names |

---

## 1. Import the alignment

1. Open **Geneious Prime**.
2. Choose **File → Import → From Files…** (or drag-and-drop).
3. Select `concat_alignment.faa` (FASTA format).
4. Geneious will detect it as a multiple-sequence alignment. Accept the import — do **not** re-align.

> **Official documentation:** [Geneious — Importing files](https://www.geneious.com/features/import-export/)

---

## 2. View the tree built by IQ-TREE

1. Import `lab_rm_rooted.nwk` (or `lab_only.nwk`) via **File → Import → From Files…**.
2. Select the imported Newick file in the document list, then click **View → Tree**.
3. The tree viewer shows bootstrap support values and branch lengths inferred by IQ-TREE 2.

---

## 3. Re-run maximum-likelihood reconstruction inside Geneious (optional)

### Using the built-in Tree operation

1. Select the `concat_alignment.faa` document.
2. Choose **Tools → Tree** (top menu) or click the **Tree** button in the toolbar.
3. Select **Build** in the Tree panel.
4. In the **Method** drop-down choose **IQ-TREE** (if installed as a plugin) or **FastTree / PhyML** (built-in).
5. Set the substitution model. For protein data, **WAG+G4** or the auto-selected model is appropriate.
6. Click **OK**. Geneious runs the tree and displays it in the same folder.

> **Official documentation:** [Geneious — Building trees](https://www.geneious.com/features/phylogenetics/)

### Using the RAxML plugin (if installed)

1. Install the **RAxML** plugin via **Tools → Plugins → Browse plugins → RAxML**.
2. Select the alignment document.
3. Choose **Tools → RAxML**.
4. Select protein model (e.g., **PROTGAMMAWAG**) and set bootstrap replicates to 1000.
5. Click **OK**.

> **Official documentation:** [Geneious — RAxML plugin](https://www.geneious.com/plugins/raxml-plugin/)

### Using the PhyML plugin (if installed)

1. Install the **PhyML** plugin via **Tools → Plugins → Browse plugins → PhyML**.
2. Select the alignment and choose **Tools → PhyML**.
3. For amino-acid data select the **LG** or **WAG** model with gamma rate variation.
4. Enable bootstrap (100–1000 replicates).
5. Click **OK**.

> **Official documentation:** [Geneious — PhyML plugin](https://www.geneious.com/plugins/phyml-plugin/)

---

## 4. Using the partition file

The file `partition.txt` lists the start and end column of each single-copy marker in the concatenated alignment. In RAxML or IQ-TREE this is passed via the `-q` / `--partition` flag. Geneious itself does not directly accept a partition file, but the IQ-TREE and RAxML command-line binaries used externally accept it.

---

## 5. Interpreting tip labels

Tip labels in the tree have the format `<organism_name>__<accession>` (up to 60 characters, sanitised). Use `label_to_accession.tsv` to recover full organism names and NCBI accessions.

---

*This workflow guide was generated automatically as part of the LAB R-M phylogenomics Stage 2 pipeline.*
