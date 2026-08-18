# Model selection decision

Status: active pilot policy
Updated: 2026-08-18

GenomeOps Atlas routes tasks by job shape, data boundary, and required evidence—not by a single “best model” ranking.

- GPT-5.3-Codex-Spark is the fast implementation loop for focused coding and UI iteration. It is not the scientific authority or the default architecture owner.
- Architecture and ambiguous implementation go to a stronger reasoning/coding lane before Spark receives a scoped task.
- Literature breadth, multimodal review, and critical writing passes are independent advisory lanes.
- Local models are selected only after the actual privacy boundary is verified.
- GitHub Actions verify code; they do not validate biological claims.
- Vercel publishes a built artifact; deployment success is not scientific validation.
- A human owner controls claim promotion and publication.

Official OpenAI facts are linked in `knowledge/models/codex-spark.yaml`; the task-role mapping above is GenomeOps Atlas advisory policy.
