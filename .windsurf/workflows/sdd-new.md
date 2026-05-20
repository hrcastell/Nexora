---
description: Start a new SDD change cycle (explore → propose → spec → design → tasks → apply → verify → archive)
---

## Usage

Run `/sdd-new` when you want to start a new tracked change in the Nexora project.

## Steps

1. Describe the change you want to make (feature, fix, refactor).
2. Cascade will run `sdd-explore` to analyze the codebase and produce an exploration report.
3. Then `sdd-propose` to write a formal change proposal.
4. Then `sdd-spec` to write delta specs.
5. Then `sdd-design` to produce the technical design.
6. Then `sdd-tasks` to break into implementation tasks.
7. Then `sdd-apply` to implement each task.
8. Then `sdd-verify` to confirm implementation matches spec.
9. Then `sdd-archive` to close the change and persist lineage.

All artifacts are stored in Engram under `sdd/{change-name}/{artifact-type}`.
