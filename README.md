# Trail OS boards

This repo holds the uploadable HTML boards that run inside Trail OS, together with the specs that describe how Trail OS hosts them.

Each board is a single, self-contained HTML file. You upload it in Trail OS under **Administration › Board versions**, where it is saved as **inactive**. You then preview it on live data and activate it yourself. Committing a file here never changes what anyone sees in Trail OS.

| Board | Folder | Latest file in repo | Status |
|---|---|---|---|
| Knowledge Studio | [`boards/knowledge-studio`](boards/knowledge-studio) | v1.21 | Built Nov 8, 2026. Confirm which version is active in Trail OS. |
| Content Studio | [`boards/content-studio`](boards/content-studio) | Design + spec only | The board HTML (`content-studio-board-v1.html`) is not in the repo yet. Add it. |
| Trail Crew Boards | [`boards/trail-crew`](boards/trail-crew) | v1.4 | Built Oct 28, 2026. Confirm which version is active in Trail OS. |
| Program Studio | [`boards/program-studio`](boards/program-studio) | v1.2 | v1 is active (Nov 8, 2026). v1.1 and v1.2 have not been activated. |
| Academy Board | [`boards/academy`](boards/academy) | AcademyBoard contract v2 | Prototype from Oct 31, 2026. |

## How a board works

- **One file.** Each board has its CSS and JavaScript inline. It makes no network calls, and the only outside resource it loads is Google Fonts.
- **Sandboxed.** Trail OS loads the board in `<iframe sandbox="allow-scripts">` with `connect-src 'none'`. The board can't reach Salesforce, Claude, cookies or the Trail OS session.
- **Bridge.** The board and Trail OS talk only through `postMessage`, in this order:
  1. The board sends `ready`.
  2. Trail OS replies with `data`.
  3. The board sends `action`.
  4. Trail OS may send `actionPending`, then sends `result`, then sends fresh `data`.
- **Trail OS enforces the rules.** Permissions, approvals, independent review, Salesforce delivery and publication are all checked by Trail OS on the server. A board only hides or shows buttons; it can never grant itself anything.
- **Contracts only grow.** Each board reads one data contract. Fields are added, never renamed or removed. `contractVersion` goes up when fields are added, so older board versions keep working.

## Repo conventions

- **`main`** holds the latest built version of each board. That is the newest file, not necessarily the one active in Trail OS.
- **Tags** mark every board version: `<board>/v<version>`, for example `knowledge-studio/v1.21` or `program-studio/v1`. The commit history carries every earlier version, so you can roll back by checking out a tag and uploading that file.
- **Activation stays manual.** When a version is activated in Trail OS, record it in that board's `CHANGELOG.md` and tag it with an extra `-active-YYYY-MM-DD` tag, for example `program-studio/v1-active-2026-11-08`.
- **Specs** live next to each board, under `specs/`. They are Markdown exports of the Claude docs, which stay the place to edit. The source link sits at the top of each board's README. Re-export after a doc changes.
- **File names** in the repo don't carry a version number (`knowledge-studio-board.html`). The version lives in the tag, the CHANGELOG and the sha256 in the board's README.

## Releasing a new board version

1. Build the new HTML and replace the board file on a branch, for example `knowledge-studio/v1.22`.
2. Update the board's README (version, size, sha256) and CHANGELOG.
3. Open a pull request, review it, and merge.
4. Tag the merge commit `<board>/v<version>`.
5. In Trail OS, upload the file as an inactive version, preview it, and activate it only when you're ready. Then add the `-active-` tag.
