---
description: Check the current SDD change status and recover context from Engram
---

## Usage

Run `/sdd-status` at the start of any session to recover where you left off.

## Steps

1. Cascade searches Engram for `sdd-init/nexora` to load project context.
2. Searches for any open `sdd/*/state` artifacts to find in-progress changes.
3. Reports: change name, current phase, completed tasks, pending tasks.
4. Resumes from the last incomplete phase.
