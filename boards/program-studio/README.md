# Program Studio

Program Studio is where staff and program managers plan and run programs and cohorts, and propose new programs. Changes go draft → independent approval → Salesforce delivery. Courses, modules and activities come next, as described in the Course Studio design.

| | |
|---|---|
| File | `program-studio-board.html` |
| Version | v1.2 (`BOARD="program-studio"`, `BOARD_VERSION=1`, `CONTRACT=1`) |
| Built | Nov 8, 2026 |
| Size | 97,113 bytes |
| sha256 | `0ad19cd51cc27462baa14bd30de96a9fb08808d45b3d10e75727481a3b3287af` |
| Active in Trail OS | **v1.2** (confirmed Nov 9, 2026). v1 was activated Nov 8, 2026. |

What changed after v1:

- **v1.1:** archived and cancelled programs and courses are hidden by default, with a toggle to show them.
- **v1.2:** full-width rich text editors that keep tables, with paste cleanup, a sticky save bar, Ctrl+S, and "Jump to" chips.

## Source and build

The board file is generated from `src/`. Don't edit the HTML by hand.

```bash
cd boards/program-studio/src
python3 build.py        # writes ../program-studio-board.html and prints size + sha256
```

`build.py` inlines `base.css` + `extra.css` and `app.js` into `shell.html`. It escapes every non-ASCII character so the file stays ASCII-only. It also checks that the file has no `<form>`, no external scripts and no Google Fonts, and that it carries the expected `BOARD` / `BOARD_VERSION` / `CONTRACT` line. Building from this commit reproduces the v1.2 sha256 above exactly.

## Tests

Playwright tests run in `tests/` (needs Node and `npm install playwright`). They save screenshots beside the tests, which git ignores. Each test loads the board in a host page (`host.html`) that plays the Trail OS role, using the sample data in `sample.js`.

```bash
cd boards/program-studio/tests
node run.js       # main flows: views, panels, drafts, approval, status moves
node closed.js    # archived and cancelled toggle (v1.1)
node rich.js      # rich text editors, tables, paste cleanup, save bar (v1.2)
```

## Specs

| File | Source doc |
|---|---|
| [`specs/program-studio-replit-spec.md`](specs/program-studio-replit-spec.md) | [Program Studio Board — Replit Spec (Phase 1: Programs and Cohorts)](https://claude.ai/artifact/EyeQ9htrwAFeKcJJA8c5yX) |
| [`specs/course-studio-design.md`](specs/course-studio-design.md) | [Course Studio: courses, modules and activities in Trail OS](https://claude.ai/artifact/4LZVEtmHy34v6UGyaRTP2t) |
