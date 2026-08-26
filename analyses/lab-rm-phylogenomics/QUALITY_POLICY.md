# Genome quality policy for the visible LAB panel

Assemblies enter the 180-genome panel only when NCBI Datasets reports:

- CheckM completeness >= 95%;
- CheckM contamination <= 5%;
- no more than 100 contigs;
- RefSeq `GCF_` accession;
- a named species rather than an unclassified `sp.` record.

Within each operational group, selection then prioritizes complete genomes, RefSeq reference/representative status, higher completeness, lower contamination, fewer contigs, and species diversity through round-robin sampling.
