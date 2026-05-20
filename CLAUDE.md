# SmartNotes AI — Project Rules

## Ground Truth Files
- docs/SPEC.md — full product description
- docs/REQUIREMENTS.md — locked requirements (do not change after Phase 1)
- docs/ARCHITECTURE.md — locked architecture (do not change after Phase 2)
- docs/AGENT_LOG.md — update status at start and end of every phase

## Rules Every Agent Must Follow
- Read AGENT_LOG.md first. Know which phase you are in.
- Read REQUIREMENTS.md before writing any code.
- Read ARCHITECTURE.md before touching any file structure.
- Update AGENT_LOG.md when you start and when you finish your phase.
- Never overwrite user note content without confirmation.
- Never change REQUIREMENTS.md after Phase 1 is marked DONE (ask the user only if necessary).
- Commit after every phase completes.
- Any comments or explanations necessary to give the user must be concise with caveman like brevity.
- Web searches can be used if necessary

## Skills Location
.claude/skills/ — load the relevant skill at the start of each phase