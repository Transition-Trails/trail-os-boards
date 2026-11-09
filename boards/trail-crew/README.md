# Trail Crew Boards

The Trail Crew product board covers Overview, Prioritize, Features, Team, Blockers, Discovery, Sprint, Build pipeline and Release, with a team switcher. In Trail OS it is at **Operations › Trail Crew Boards**, and volunteers and coaches reach it at **Homebase › Trail Crew Boards**.

| | |
|---|---|
| File | `trail-crew-board.html` |
| Version | v1.4 (`board:"trail-crew"`, `BOARD_VERSION=1`, `CONTRACT=1`) |
| Built | Oct 28, 2026 |
| Size | 76,398 bytes |
| sha256 | `013e06cc8a05ef7f473cd80d4e36e9d5ac70c1c5c6d605514965bc32a096e3cf` |
| Active in Trail OS | Yes, v1.4 (confirmed Nov 9, 2026) |
| Trail OS resource key | `trail-crew-board:main` |
| Seed data | [`data/trail-crew-teams.seed.json`](data/trail-crew-teams.seed.json): the four Sprint-003 teams. It is used until the Teams screen (case 1280) holds rosters. |

## Specs

All four files come from the doc [Trail Crew Board in Trail OS: Build Spec v0.1](https://claude.ai/artifact/Du5QSBHeBf2b6f4cYfvtsX), exported Nov 9, 2026. Each is one tab of that doc.

| File | Tab |
|---|---|
| [`specs/trail-crew-board-build-spec.md`](specs/trail-crew-board-build-spec.md) | Build spec: data contract, Salesforce reads and changes, Claude refresh, board versions, Team Board, cases |
| [`specs/change-team-rosters-and-roles.md`](specs/change-team-rosters-and-roles.md) | Change: Team rosters and roles |
| [`specs/replit-prompt-phase-1.md`](specs/replit-prompt-phase-1.md) | Replit prompt: phase 1 (case 1279) |
| [`specs/feature-010-penny-actions.md`](specs/feature-010-penny-actions.md) | Feature-010: Penny actions |
