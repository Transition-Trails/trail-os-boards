# Knowledge Studio in Trail OS: Build Spec v0.1

Nov 4, 2026 · @Angela Landrith

## Summary

Trail OS will host the Knowledge Studio as an uploadable HTML board, the same way it hosts the Trail Crew Boards. Trail OS supplies the data and saves every change. The board only displays the data and sends named actions back, so Angela can upload, preview, activate and roll back new versions without a Replit change.

- **What the board covers:** the eight states from the Knowledge Browser canvas's Final approach page. These are the fix list, open an article and fix it in place, publish in Salesforce, bulk edit, Penny check, decisions and policy sign-off, reader questions, and Trail OS page help.
- **Data is live.** Article records already live in Trail OS's database and Salesforce, so the board reads them each time it opens and again after every action. It does not wait for a scheduled refresh.
- **Claude insights run on the schedule.** One Claude call per hour, 6 AM to 9 PM Central, runs only when the data changed since the last run.
- **Data categories come from a Google Sheet.** Trail OS can't pull the category tree from Salesforce, so an admin keeps the list in a Drive sheet and Trail OS reads it from there.
- **Board version 1 is built and tested:** `knowledge-studio-board-v1.html`, about 54 KB, contract version 1. The starting category list is `Knowledge_Data_Categories.xlsx`, with 160 categories.
- **Publishing stays a person's job in Salesforce.** The board helps the Knowledge user publish, and Trail OS confirms publication by reading Salesforce. It never publishes on its own.

## How it works

The Knowledge Studio reuses the Trail Crew Board pattern in Trail OS piece by piece, with two changes: data is read live, and categories come from a sheet.

| Part | Trail Crew Boards today | Knowledge Studio |
| --- | --- | --- |
| Board versions | `app_settings` registry `trail-crew-board:main`, files in App Storage under `/objects/trail-crew-boards/`, sha256 checked on every read, 2 MiB limit | Same pattern, new key `knowledge-studio-board:main` and root `/objects/knowledge-studio-boards/`. Upload, preview and make current under Administration › Board versions |
| Where it shows | Operations › Trail Crew Boards | Knowledge › Knowledge Studio (`/knowledge/studio`), replacing the current Knowledge workspace pages once accepted |
| Sandbox | iframe `sandbox="allow-scripts"`, CSP `connect-src 'none'`, Google Fonts allowed | Identical |
| Bridge | `ready` → `data`; `action` → `result`; `contractVersion` 1 | Identical messages; the board name is `knowledge-studio` |
| Data | Hourly snapshot from Salesforce | **Live**: built on each page load and after each action from Trail OS's knowledge tables plus the Salesforce fields Trail OS already keeps in sync |
| Claude insights | Hourly, 6 AM to 9 PM Central, only when the data changed | Same schedule, same rule; saved with an as-of time and marked stale if a run fails |
| Categories | Not used | Read from a Google Sheet in Drive (below) |
| Links | `openRecord` opens a new tab | Same; types `article` (Trail OS editor) and `salesforce` (the article's Salesforce record) |

**Why live data works here:** Knowledge records are in Trail OS's own Postgres tables, so building the board data costs no Salesforce calls. Salesforce publication status already refreshes every 5 minutes through the existing `sfArticleSyncJob`. Trail OS should cache only what is expensive: the category sheet and the Salesforce picklist values.

**Data categories from Drive:**

1. An admin uploads `Knowledge_Data_Categories.xlsx` to Drive as a Google Sheet. Its "Categories" tab has one row per category; Trail OS reads `Path` and `Active`, and `Group API name` and `Category API name` once they are filled.
2. Under Administration › Knowledge Studio settings, the admin pastes the sheet's link. Trail OS stores the file ID in `app_settings` key `knowledge-studio:category-sheet`.
3. Trail OS reads the sheet through the existing Google Drive integration on the hourly run, and whenever an admin presses "Reread categories". It keeps the last good copy if a read fails.
4. The board gets `categories` (active rows) and `categorySource` (sheet name and last read time). A category on an article that isn't in the sheet still shows, flagged so someone fixes it.

## Data contract v1

Trail OS sends one `KnowledgeStudioData` object with `contractVersion: 1`. The board works out every count, view and status pill from it. The board rejects any other contract version and shows a waiting message.

| Key | Shape | Source in Trail OS |
| --- | --- | --- |
| `contractVersion` | `1` | constant |
| `asOf` | ISO time the data was built | now |
| `viewer` | `{email, name, isStaff, isManager, canPublish, canSkipReview, canMapPages, canSign}` | `knowledgeAccess()`: canPublish = staff; canSkipReview = superadmin, not impersonating; canSign = assigned reviewer of any policy article |
| `insights` | `{generatedAt, stale, items:[{severity: crit, warn or "", tag, text, articleId?}]}` or null | last good run of the hourly Claude job |
| `lists` | `{types:[{key,label,contentField}], audiences[], appliesTo[], departments[], difficulties[], reviewCycles[]}` | `article_types` + `/knowledge/editor-field-options` (Salesforce picklists, cached) |
| `categories` | `[{path, active, groupApiName?, categoryApiName?}]` | the Drive sheet |
| `categorySource` | `{name, updatedAt}` | the Drive sheet read |
| `articles` | list, below | `knowledge_articles` + workspace readiness + evidence |
| `questions` | `[{id, audience, group, text, articleIds[], note}]` | Brain Map reader questions (Penny's Brain Map spec); until it ships, `knowledge-requirement:*` records |
| `pages` | `[{id, title, path, category}]` | new `app_settings` key `knowledge-studio:page-map`, seeded from `config/helpCoverage.ts` |
| `decisions` | `[{id, kind, title, subtitle, rule, status: open, signed or answered, articleId, decidedBy, decidedAt, note}]` | policy articles (`rule_statement`) + new `knowledge-decision:*` records for open questions |

**Each article:**

| Field | Meaning |
| --- | --- |
| `id`, `title`, `summary`, `type` | `type` = an `article_types.key`, e.g. `procedure`; null when unknown |
| `status` | the Trail OS status as stored (`in_progress`, `in_review`, `ready-to-publish`, `published`, …) |
| `step` | the one next step, worked out by Trail OS: `write`, `review`, `syncBlocked`, `notLinked`, `publish`, `penny`, `ready` |
| `sfNumber`, `linked`, `externalStatus` | Salesforce article number, whether `external_id` is set, `PublishStatus` |
| `category` | full category path, matching a sheet `Path`; null when none |
| `appliesTo` | array (Salesforce multi-picklist split on `;`) |
| `audience`, `department`, `difficulty`, `reviewCycle`, `estimatedMinutes` | the Studio reference fields; `estimatedMinutes` is a whole number or null |
| `reviewDue` | ISO date from `reviewed_at` + `review_cycle`; null when not set |
| `validated`, `validatedAt` | `validation_status` and `validated_at` |
| `editVersion`, `contentVersion` | concurrency tokens: `xmin` for edits, the sha256 content version for reviews and Penny checks |
| `issues` | `[{id, kind, severity: block, warn or info, field?, value?, text, resolved?}]` |
| `publishChecks` | the checklist lines for the publish step |
| `perms` | optional per-article `{edit, review, validate, publishHandoff}`; when absent the board uses `viewer` |

**Issue kinds Trail OS sends:** `sync_rejected` (with `field` and the rejected `value`, from `_trailSalesforceSync`), `not_linked`, `needs_category`, `closest_category` (info), `applies_to_blank`, `sf_diff` (with `field`), `other`. Each issue has a stable `id` so a fix can name it.

## Actions

The board sends 11 named actions, and Trail OS checks each one on the server before it changes anything. Trail OS answers `{type:"result", id, ok, code?, message?, data?}`, then sends fresh data. A version mismatch returns `stale` with a message telling the person to reload. Every action is logged with actor type `Person`, so Penny's actions can be added later (Feature-010).

| Action | Payload | Who may run it | What Trail OS does (existing code to reuse) |
| --- | --- | --- | --- |
| `openRecord` | `{type: article or salesforce, id}` | anyone who can see it | opens a new tab: the Trail OS article editor, or the Salesforce record |
| `fixIssue` | `{articleId, issueId, kind, editVersion, field?, value?, sfNumber?, category?, appliesTo?}` | staff, Knowledge Manager, or the claimer | `sync_rejected`: save the field, then retry the Salesforce draft (`sync-salesforce`). `not_linked`: find the article by number in Salesforce, set `external_id`. `needs_category`: set the category. `applies_to_blank`: set Applies To. `closest_category` and `sf_diff`: mark checked |
| `saveDraft` | `{articleId, editVersion, fields:{title?, summary?, type?, audience?, appliesTo?, department?, difficulty?, reviewCycle?, estimatedMinutes?, category?}}` | same as above | PATCH the article; a published article gets a draft revision (`create_article_revision` logic); status goes back to business review |
| `retrySync` | `{articleId}` | staff (canPublish) | `POST /knowledge/workspace/articles/:id/sync-salesforce` |
| `checkPublication` | `{articleId}` | staff (canPublish) | read this article's Salesforce version now (`refreshKnowledgePublicationStatus` for one article); answers with what it found |
| `recordPennyCheck` | `{articleId, contentVersion, audience, question, answer?, outcome: passed or failed}` | staff or the assigned validator; never the author or claimer | save `retrieval_test` evidence; on `passed`, record the technical validation (`saveReview`) so the article becomes Ready for Penny; on `failed`, add an issue |
| `bulkUpdate` | `{articleIds[], versions:{id: editVersion}, field, mode?, values?, value?, onlyBlank, skipReview}` | staff or Knowledge Manager; `skipReview` superadmin only | apply per article, up to 300; each makes a draft revision for business review, or goes straight to ready-to-publish when `skipReview`; answers `data:{saved, failed, failedIds[]}` |
| `signPolicy` | `{decisionId, articleId, ruleStatement, note?}` | the policy's assigned reviewer | business-review policy sign-off; the rule statement must match the article exactly |
| `answerDecision` | `{decisionId, note}` | staff or Knowledge Manager | save the answer on `knowledge-decision:<id>` |
| `mapPage` | `{pageId, category or null}` | staff (canMapPages) | update `knowledge-studio:page-map`; the in-app help panel reads the same map |
| `startArticle` | `{questionId}` | staff or Knowledge Manager | create a claimed draft linked to the question (`requirements/:id/article-task`); answers `data:{articleId}`, and the board opens it |

Local-only controls never reach Trail OS: search, views, the category filter, row selection, the bulk preview, tabs, and the publish checklist ticks.

## Open decisions and checks

Five points need a decision before Replit builds the actions. Default answers are written in so the build can start.

1. **What "Publish to SF" does today.** The current `publish-to-sf` route says "Published to Salesforce", but the newer handoff only creates drafts. Default: the board never publishes. It retries the draft and checks publication, and a person publishes in Salesforce.
2. **Where reader questions come from.** The Brain Map isn't in Trail OS yet. Default: use `knowledge-requirement` records until Penny's Brain Map work ships, then switch the source without changing the contract.
3. **Category match.** Articles store `data_category_group` and `data_category`. Default: match the sheet's API names first, then the path text.
4. **Review due.** Today "due for review" is a fixed 60 days. Default: `reviewed_at` + `review_cycle` (Monthly 30, Quarterly 91, Annually 365 days; As Needed has no due date).
5. **Bulk edit size.** Default: at most 300 articles per call, each saved on its own so one failure doesn't stop the rest.

**Checks before the board is made current:**

- [ ] Board version 1 uploads, previews and activates; restoring the earlier version works
- [ ] The board loads in under 2 seconds with all articles, and makes no Salesforce call on load
- [ ] A volunteer without Knowledge access sees the board read-only; every action is refused on the server
- [ ] Fixing an Estimated time sync error saves the minutes, retries the Salesforce draft, and the issue clears
- [ ] A Penny check that passes makes the article Ready for Penny; one that fails adds an issue
- [ ] Bulk edit of Difficulty on 69 articles saves 69 draft revisions and reports any that failed
- [ ] The category sheet's rows appear in every category picker; changing a row's Active to FALSE hides it after a reread
- [ ] Claude insights run at most once an hour, 6 AM to 9 PM Central, and only when the data changed

## Replit prompt

Paste this into Replit, then upload `knowledge-studio-board-v1.html` as the first board version.

```text
Build the Knowledge Studio board in Trail OS by reusing the Trail Crew Board pattern. Do not change the Trail Crew Board.

1. Board versions. Generalize trailCrewBoardResource.ts so a second board can use it: registry key knowledge-studio-board:main, storage root /objects/knowledge-studio-boards/, same validation, sha256 checks, 2 MiB limit, CSP, sandbox and noCache headers. Admin routes under /admin/knowledge-studio-boards (list, upload, activate with expectedActiveVersionId, preview), requireAdmin + sameOrigin. Add it to Administration > Board versions next to the Trail Crew board.

2. Page. New route /knowledge/studio (nav: Knowledge > Knowledge Studio) for staff and Knowledge Managers (knowledgeAccess().canManage). It loads GET /knowledge/studio/html into <iframe sandbox="allow-scripts" srcDoc>, keyed on the viewer identity like TrailCrewBoard.tsx. Bridge: accept {type:"ready", board:"knowledge-studio", boardVersion:1, contractVersion:1}; send {type:"data", data}; accept {type:"action", id, name, payload}; reply {type:"result", id, ok, code?, message?, data?}, then re-send data. 20-second action timeout. openRecord opens a new tab (window.open, noopener): type article -> the Trail OS article editor, type salesforce -> the article's Salesforce record. Never navigate the current tab.

3. Data, live. GET /knowledge/studio/data builds KnowledgeStudioData on every request from knowledge_articles, the workspace readiness and evidence records, article_types, editor-field-options (cache the Salesforce picklists for 1 hour), the category sheet cache, the page map and decisions. No Salesforce call on load. Shape exactly as the spec's Data contract v1: contractVersion 1, asOf, viewer, insights, lists, categories, categorySource, articles (with step, issues with stable ids, editVersion = xmin, contentVersion = the sha256 content version), questions, pages, decisions.

4. Category sheet. Admin setting knowledge-studio:category-sheet = a Google Sheet file id (pasted as a link under Administration > Knowledge Studio settings). Read the "Categories" tab through the existing Google Drive integration: columns Path, Active, Group API name, Category API name. Reread on the hourly run and on an admin "Reread categories" button; keep the last good copy if a read fails and show its time.

5. Claude insights. Hourly job, on the hour from 6 AM to 9 PM America/Chicago, advisory lock like trailCrewBoardJob.ts. Hash the board data; call Claude (Replit-managed Anthropic) only when the hash changed. Ask for at most 6 items {severity: crit|warn|"", tag, text, articleId?} about what blocks Penny, publishing and coverage. Save with generatedAt; on failure keep the last good result with stale: true.

6. Actions. POST /knowledge/studio/actions (requireAuth + sameOrigin, refuse while impersonating), Zod discriminated union on name: fixIssue, saveDraft, retrySync, checkPublication, recordPennyCheck, bulkUpdate, signPolicy, answerDecision, mapPage, startArticle. Payloads, permissions and behaviour exactly as the spec's Actions table, reusing the existing knowledge workspace functions. Check editVersion or contentVersion and return code stale on a mismatch. Log every action (actor_type Person, actor, payload, result) in a knowledge_studio_action_log table. bulkUpdate: max 300 ids, each article in its own transaction, return data {saved, failed, failedIds}. skipReview only for superadmins.

7. Page map. app_settings knowledge-studio:page-map, seeded from config/helpCoverage.ts ROUTE_CATEGORY_MAP; the in-app help panel reads it from the server instead of the config file.

8. Publishing. The board never publishes to Salesforce. Do not call publish-to-sf from any Studio action.

Test with the checks list in the spec, then tell me the upload screen is ready.
```

## Change for board v1.1: edit content in the Studio

Board v1.1 (Nov 4) edits an article's content inside the Studio, so nobody is sent to the old Knowledge Studio editor. It also opens the side panel wider, at half the window by default. People can drag the panel's left edge to resize it, or switch it to full width. The "Content and steps" link is gone. The contract stays at version 1, and the handshake still says `boardVersion: 1`.

The article panel's tabs are now Fix, Content, Details, Publish and Penny. Content has a formatted editor for the main body (bold, italic, heading, lists, links), the type fields, and steps. Policy articles show rule statement, effective date and waiver authority; Troubleshooting articles show the symptom. Procedures and Learner Tasks show steps, each with an instruction, a verify line and an optional flag. Steps can be added, removed and reordered.

The board sends two new actions:

| Action | Payload | Who may run it | What Trail OS does |
| --- | --- | --- | --- |
| `loadContent` | `{articleId}` | anyone who can open the Studio | answers `data: {body (HTML), contentLabel (e.g. "Procedure"), steps:[{id, instruction, verifyLine, isOptional, performedByRole}], fields:{symptom?, ruleStatement?, effectiveDate?, waiverAuthority?}, editVersion}`; the body is the article's main content field (`Procedure__c`, `Action_Details__c` or `Overview__c` via `knowledgeContentAlias`) |
| `saveContent` | `{articleId, editVersion, body, steps:[{id or null, sequence, instruction, verifyLine, isOptional, performedByRole}], fields}` | staff, Knowledge Manager, or the claimer | sanitize the body with `sanitizeArticleBody`; save body, type fields and steps in one transaction (steps with an id update, without one insert, missing ones delete); a published article gets a draft revision; status goes back to business review; `stale` on an `editVersion` mismatch |

**Replit prompt for v1.1:**

```text
Add two actions to POST /knowledge/studio/actions for the Knowledge Studio board v1.1. Keep everything else as built.

loadContent {articleId}: return ok with data {body, contentLabel, steps, fields, editVersion}. body = the article's main content HTML (knowledgeContentAlias: Procedure__c for procedure, Action_Details__c for learner-task, otherwise Overview__c/body). steps = article_procedure_steps for the current version in sequence order as {id, instruction, verifyLine, isOptional, performedByRole}. fields = symptom (troubleshooting), ruleStatement, effectiveDate (YYYY-MM-DD), waiverAuthority (policy). editVersion = xmin. Same read permission as the Studio page.

saveContent {articleId, editVersion, body, steps, fields}: same permission as saveDraft. Refuse with code stale if editVersion doesn't match. Sanitize body with sanitizeArticleBody. In one transaction save body, the type fields and steps (update by id, insert those with id null, delete the ones not sent, renumber sequence). If the article is published, write to its draft revision instead (same logic as saveDraft). Send the article back to business review. Log it in knowledge_studio_action_log.

Then tell me when it's ready, and I'll upload board v1.1.
```

## Change for board v1.2: assign and record reviews

Board v1.2 (Nov 4) lets a Knowledge Manager assign an article to a person for business review, technical review or both, and lets the assigned person record that review in the Studio. The contract stays at version 1 and the handshake still says `boardVersion: 1`. Every new field is optional, so v1.1 keeps working against the new server.

**Who can approve does not change.** The board only shows or hides buttons. Trail OS checks every action with the rules already in the knowledge workspace:

- **Assign:** any Knowledge worker (staff or an enabled Knowledge Manager). Each assignee must be eligible (`eligiblePerson`), and can't be the article's author or claimer.
- **Business review:** only the assigned reviewer or an admin, never the author or claimer. A passing policy review needs the assigned reviewer even when the caller is an admin, and the sign-off must match the saved rule, effective date and exceptions exactly.
- **Technical review:** staff, or the assigned technical reviewer, never the author or claimer. A pass needs all three checks passed and at least one https evidence link.
- Assigning someone approves nothing. It only decides who sees the work under My work.

**What people see:**

- **Rail:** My business reviews and My technical reviews for everyone. Knowledge Managers also see Needs a business reviewer (in review, no one assigned) and Needs a technical reviewer (published, waiting on the Penny check, no one assigned).
- **Article header:** who reviews and the due date.
- **Review tab (new):** at the top, Who reviews: two people pickers that leave out the author and claimer, a due date, and Save assignment. Below that is the business review: one result per checklist line (Passed, Failed, Not applicable with a reason), findings, and Pass, Return to author or Blocked. For a policy, the rule, date and exceptions are shown with a sign-off box. Anyone else sees who reviews and why they can't.
- **Penny tab:** now the full technical review: environment, Trail OS version, who you asked as, question and expected answer, what Penny answered, evidence links, the three technical checks, findings, and Pass, Needs revision or Blocked. It replaces the simpler Penny check form.
- **Bulk edit:** Knowledge Managers get Business reviewer and Technical reviewer as fields, with an optional due date. Articles where the person is the author or claimer are skipped and counted.

**Data contract additions (all optional)**

| Field | What Trail OS sends |
| --- | --- |
| `viewer.isAdmin` | `isAdmin` for the session |
| `viewer.canAssign` | staff or an enabled Knowledge Manager |
| `appVersion` | Trail OS version string, used to prefill the technical review |
| `people` | `[{email, name}]` from `GET /knowledge/workspace/people` |
| `lists.checklists` | `{<type>: [{id, label}]}` from the type checklists (keys normalised: `release_note`, `learner_task`), plus `_technical: [{id, label}]` for preparation, audience and citation |
| article `author`, `claimedBy` | emails |
| article `assignment` | `{reviewer: {email, name} or null, validator: {email, name} or null, dueDate, revision}`; `revision` is the knowledge-work revision UUID or null |
| article `reviewState` | `{business: {status, by, at, findings, current}, technical: {...}}` from `articleReviewState`; `status` is passed, needs\_revision, blocked or null; `current` is false when the review was for an older content version |
| article `perms.review`, `perms.validate` | the server's answer for this viewer; the board falls back to the rules above only when absent |

**New actions**

| Action | Payload | Trail OS does |
| --- | --- | --- |
| `assignReviewers` | `{articleId, expectedRevision, reviewer?, validator?, dueDate?}` (only the keys that changed; null clears) | the existing assign function; `stale` on a revision mismatch |
| `bulkAssign` | `{items: [{id, expectedRevision}] up to 100, kind: business or technical, assignee or null, dueDate?}` | the assign function once per article, each on its own; returns `{saved, failed, failedIds}` |
| `submitBusinessReview` | `{articleId, contentVersion, disposition, checks: [{id, result, note}], findings, policySignoff?}` | `saveBusinessReview` with `expectedVersion = contentVersion`; on pass, the existing Salesforce draft sync |
| `submitTechnicalReview` | `{articleId, contentVersion, environment, applicationVersion, persona, expectedResults, actualResults, evidenceLinks, findings, disposition, checks}` | `saveReview` with `expectedVersion = contentVersion` |

`recordPennyCheck` stays in the action list for v1.1, but v1.2 no longer sends it.

**Replit prompt for v1.2:**

```text
Extend the Knowledge Studio board API for board v1.2. Keep everything else as built. Do not change any permission rule in knowledgeWorkspace.ts or knowledgeWorkspaceAccess.ts; reuse them.

1. Studio data (contract stays version 1; all additions optional):
- viewer.isAdmin (isAdmin), viewer.canAssign (requireKnowledgeWorker would pass: staff or an active Knowledge Manager grant).
- appVersion: the Trail OS version string.
- people: the same list GET /knowledge/workspace/people returns, as [{email, name}]. Cache it 10 minutes. If Google group lookup is unreliable, send people: [] and an insight item saying the reviewer list could not load; do not fail the whole payload.
- lists.checklists: for each article type, [{id, label}] from knowledgeChecklists.ts, keyed by the normalised type (procedure, reference, troubleshooting, concept, policy, release_note, pathway, learner_task), plus _technical = the three technicalChecks from knowledgeReviewState.ts with their exact labels.
- Per article: author (authored_by), claimedBy (claimed_by), assignment {reviewer: {email, name} or null, validator: {email, name} or null, dueDate, revision} from knowledge-work:{id} (reviewer falls back to reviewer_email), reviewState from articleReviewState as {business: {status, by, at, findings, current}, technical: {...}}, and perms.review / perms.validate computed with the same rules saveBusinessReview and saveReview use for this viewer.

2. New actions on POST /knowledge/studio/actions (add to the Zod union; log each in knowledge_studio_action_log):
- assignReviewers {articleId, expectedRevision: uuid or null, reviewer?: email or null, validator?: email or null, dueDate?: YYYY-MM-DD or null}: call the existing assign function with only the keys sent. Return code stale on a revision conflict and the assign function's own message on any other refusal (author or claimer, not eligible, directory unavailable).
- bulkAssign {items: [{id, expectedRevision}] max 100, kind: business or technical, assignee: email or null, dueDate?}: for each item call assign with reviewer (business) or validator (technical) plus dueDate, each in its own try. Return ok with data {saved, failed, failedIds}.
- submitBusinessReview {articleId, contentVersion, disposition, checks, findings, policySignoff?}: call saveBusinessReview with expectedVersion = contentVersion and the rest unchanged. On pass, run the same Salesforce draft sync the business-reviews route runs. Return stale when the content version doesn't match.
- submitTechnicalReview {articleId, contentVersion, environment, applicationVersion, persona, expectedResults, actualResults, evidenceLinks, findings, disposition, checks}: call saveReview with expectedVersion = contentVersion. Return stale when the content version doesn't match.
Return the server's validation message in message for any refusal, so the board can show it.

3. After every one of these actions, send fresh data to the board as the other actions do.

Test as: an admin, a staff member who is not assigned, a Knowledge Manager who is not staff, the assigned reviewer, and the article's author. Confirm the author is refused everywhere, the Knowledge Manager can assign but can't pass a business review unless assigned, staff can pass a technical review but not a business review unless assigned or admin, and an admin can't pass a policy unless assigned. Then tell me it's ready and I'll upload board v1.2.
```

## Change for board v1.3: My articles

Board v1.3 (Nov 5) adds a My articles view at the top of My work in the rail. It lists every article where the viewer is the author or claimer, the assigned business reviewer, or the assigned Penny validator.

- A filter above the list switches between All, Authoring, Business review and Penny validation, with a count on each.
- A My role column shows each role the viewer holds on the article. Authors also see a Returned to you tag when the current version's business or technical review came back as needs revision or blocked, and the bar above the list counts those.
- Wording now says Penny validator everywhere the technical reviewer is named (rail, assignment picker, bulk edit, article header).

**No new Replit work.** The view uses fields already in the v1.2 prompt: `viewer.email`, and per article `author`, `claimedBy`, `assignment` and `reviewState`. The contract stays at version 1 and the handshake still says `boardVersion: 1`. If the v1.2 prompt hasn't run yet, My articles shows zero, because Trail OS isn't sending those fields.

## Change for board v1.4: Overview and Claude insights

Board v1.4 (Nov 5) opens on a new Overview page, at the top of the rail, instead of the Fix list. It shows the health of the Knowledge Studio at a glance. Everything on it is worked out from the data the board already gets, so it moves as soon as the live data does.

- **Four headline tiles:** Ready for Penny (out of live articles), Need a fix (and how many block publishing or sync), Reader questions answered (and how many have no article), and Waiting on review (and, for Knowledge Managers, how many have no one assigned). Each opens its list.
- **Where the articles are:** one bar of every article by stage: Draft, In review, Publishing, Penny check and Ready for Penny. Under it, how many in Publishing have the sync blocked or aren't linked.
- **What needs fixing:** open issues by kind, largest first. Each row opens a list of just those articles (new views named `iss:<kind>`).
- **Reader coverage:** one card per audience, like the Knowledge map, with a bar of its questions from No article to Penny can answer. Each card opens the reader questions for that audience.
- **Data categories:** each top-level category with a bar of its articles by stage. Each row filters the list to that category.
- **From Claude:** the scheduled insights moved off the Fix list into their own section at the bottom of the Overview. The section starts collapsed, showing the time, the number of notes, how many are critical, and each note's tag. One click opens the full notes.

Hovering or tabbing to any bar segment shows its name, count and share. The colours step from light (early stages) to dark (Penny check), with green for Ready for Penny and a dashed red for questions with no article; every bar also has a labelled legend with counts.

**No Replit work.** The contract stays at version 1 and the handshake still says `boardVersion: 1`. The audience and reviewer parts use fields already in the contract and the v1.2 prompt.

## Change for board v1.5: Salesforce publishing history

Board v1.5 (Nov 5) puts an **In Salesforce** card at the top of every article's Publish tab. It answers three questions at a glance: is this the first time the article is being published, has it been published before and how many times, and is someone editing a draft of a published article.

- **Status tag:** Not in Salesforce yet, Live in Salesforce but not linked, First publish (draft, never published), Published once, Published N times, Editing a draft of a published article, or Archived.
- **Version track:** v1, v2 … with the live version filled in green and an open draft dashed, so a draft of a published article reads as "v3 live, v4 draft".
- **Facts:** article number, first published, last published and by whom, which version is live, and when the draft was last changed and by whom (all in Central time). For a draft of a published article: "Readers and Penny still see version N until this draft is published."
- **Links:** Open live article and Open draft, each opening that exact Salesforce version in a new tab. Below them is when Trail OS last checked Salesforce, with a Check now link (the existing `checkPublication` action).

What Salesforce tells us, checked against Production on Nov 5: an Online version's `VersionNumber` is how many times the article has been published. A draft of a published article is a Draft row with `VersionNumber` 0 whose `FirstPublishedDate` is filled in; a brand-new draft has none. `VersionNumber` can't be used in a WHERE clause, and `IsMasterLanguage` doesn't exist in this org.

**Data contract addition (optional): article `sf`**

| Field | Meaning |
| --- | --- |
| `knowledgeArticleId`, `articleNumber` | from Salesforce; `sfNumber` should always be filled from `ArticleNumber` too |
| `status` | Online, Draft or Archived (the latest version's PublishStatus) |
| `firstPublishedAt` | `FirstPublishedDate`, null if never published |
| `online` | `{versionId, versionNumber, lastPublishedAt, lastPublishedBy}` or null |
| `draft` | `{versionId, lastModifiedAt, lastModifiedBy}` or null |
| `archivedAt` | `ArchivedDate` when the article is archived |
| `checkedAt` | when Trail OS last read this from Salesforce |

`openRecord` gains an optional `version`: `online` or `draft`.

**Replit prompt for v1.5:**

```text
Add Salesforce publishing history to the Knowledge Studio board data for board v1.5. Keep everything else as built.

1. Read it in the existing publication-status refresh (refreshKnowledgePublicationStatus): the hourly run and the checkPublication action. Do not call Salesforce when the Studio loads. For linked articles, in batches of up to 200 KnowledgeArticleIds:
SELECT Id, KnowledgeArticleId, ArticleNumber, VersionNumber, PublishStatus, FirstPublishedDate, LastPublishedDate, ArchivedDate, LastModifiedDate, LastModifiedBy.Name FROM Knowledge__kav WHERE KnowledgeArticleId IN (...) AND PublishStatus IN ('Online','Draft')
then the same with PublishStatus = 'Archived' only for ids that returned no Online or Draft row. Do not select IsMasterLanguage (it doesn't exist in this org; it is what is breaking the current connector query) and do not filter on VersionNumber (Salesforce refuses it).

2. Store per article, and send in the Studio data as article.sf:
{knowledgeArticleId, articleNumber, status (Online, Draft or Archived for the latest version), firstPublishedAt (FirstPublishedDate from either row, null if never published), online: {versionId, versionNumber, lastPublishedAt, lastPublishedBy} or null, draft: {versionId, lastModifiedAt, lastModifiedBy} or null, archivedAt, checkedAt}.
online.versionNumber is the Online row's VersionNumber (how many times it has been published). lastPublishedBy is the Online row's LastModifiedBy.Name only when its LastModifiedDate equals LastPublishedDate, otherwise null. A Draft row always has VersionNumber 0; when its FirstPublishedDate is filled it is a draft of a published article. Also set sfNumber from ArticleNumber for every linked article.

3. openRecord {type: 'salesforce', id, version?: 'online' or 'draft'}: open {instance URL}/lightning/r/Knowledge__kav/{versionId}/view in a new tab for that version. Without version, use the draft if there is one, otherwise the online version, otherwise the KnowledgeArticleId record page.

4. After checkPublication, send fresh data to the board as the other actions do.

Test with article 000001049 (published once), 000001057 and 000001148 (each has a draft of a published version 1), and 000001000 (archived after 4 versions). Then tell me it's ready and I'll upload board v1.5.
```

## Change for board v1.6: return an article to fix it

Replit added the `returnAndFixIssue` action (Nov 5) because `fixIssue` refuses to change an article that is in business review. Board v1.6 uses it.

- On the Fix tab, when the article's `status` is `in_review` or `pending-review` and the issue is `sync_rejected`, `needs_category` or `applies_to_blank`, the button reads **Return and fix**. A note explains that fixing returns the article to the author, that business review and any Penny validation start over, and that someone must send it for business review again before it syncs. A required **Why you're returning it** box takes 10 to 10,000 characters.
- Every other case still uses `fixIssue`.
- Who can press it (the server decides; the board only mirrors it): the author, the assigned business reviewer, or an admin. If someone other than the caller holds the claim, only an admin can. If Trail OS sends `perms.returnFix`, the board uses that instead.
- `sync_rejected` issues on `type`, `title` or `summary` now get a proper input (a type picker, or a text box) instead of falling back to Applies To.

Payloads sent, matching the server's strict schema:

| Issue kind | Payload |
| --- | --- |
| `sync_rejected` | `{articleId, editVersion, issueId, kind, field, value, note}`; `value` is a number for `estimatedMinutes`, an array for `appliesTo`, otherwise a string |
| `needs_category` | `{articleId, editVersion, issueId, kind, category, note}` |
| `applies_to_blank` | `{articleId, editVersion, issueId, kind, appliesTo, note}` |

On success the article is back in progress, and the toast shows the server's message ("Correction saved. Send the article for business review before Salesforce synchronization.").

**Open gaps:**

- The board has no **Send for business review** action yet, so after a return someone has to resubmit the article outside the board.
- The claim rule means an assigned reviewer can't use Return and fix when the author holds the claim, which is the usual case. Confirm whether that is intended.

## Change for board v1.7: approval

**Why nothing could be approved.** Every edit made in the Studio (`saveDraft`, `saveContent`, `fixIssue`, `bulkUpdate`) leaves the article, or the new revision of a published article, as an `in_progress` draft. Business review only accepts articles that are `in_review`, and the Studio had no action to send a draft there. Separately, Trail OS never lets the author or claimer review their own article. So edits Angela makes, or Claude makes as her, can't be passed by her even once they're submitted. The only way past that is the existing superadmin override, `POST /knowledge/workspace/articles/:id/approve-now`, which the board didn't offer.

**What board v1.7 adds:**

- **Approval strip** under the article title, on every tab:
  - Draft, not sent for approval: **Send for approval** (anyone who can edit it).
  - Waiting for approval from the assigned reviewer: **Review and approve**, which opens the Review tab for whoever can pass the business review.
  - Approved, next: publish in Salesforce.
  - A live article with a revision in progress: a link to the revision.
  - **Approve now (superadmin)** for superadmins on any draft or in-review article. It needs a reason (at least 10 characters) and a confirmation tick, says plainly that it skips the independent review, checklist and Penny check and is audited, and does not publish.
- **What changed** at the top of the Review tab. For a revision of a published article, it compares against the live version (from `articleGroups`): changed fields side by side, then the body and the steps paragraph by paragraph, with removed text struck through in red and added text in green. For a new article, it says everything is new.
- **Approvals** in the rail: Waiting for approval, and Drafts not sent. Both lists have an Approval column showing who can approve and whether it's a new article or a revision. A **for you to approve** chip appears in the header when there are any.
- Wording fixed: saving no longer claims it "sends the article back to business review"; it says the article is kept as a draft until someone sends it for approval.

**Replit prompt for v1.7:**

```text
Add two actions to POST /knowledge/studio/actions for the Knowledge Studio board v1.7. Keep everything else as built, and do not change any approval or independence rule.

1. submitForReview {articleId, editVersion}: the same operation as the Trail OS MCP tool submit_for_review (mutateArticle submit with the same structural checks), run as the signed-in user. Same edit permission as saveDraft (assertEdit). Move the draft to in_review. Return code stale when editVersion doesn't match, and the structural-check message as message when it is refused. On success, message: "Sent for approval." Log it in knowledge_studio_action_log.

2. approveNow {articleId, contentVersion (64-char hash), confirmed: true, note (10 to 2,000 characters)}: exactly the logic of POST /knowledge/workspace/articles/:id/approve-now. Only when canOverrideApproval is true, otherwise forbidden with "Superadmin access is required to approve without checks." Same allowed statuses and the same 409 messages. Store the note in review_note after the existing override sentence, include it in the approval_override audit entry, then run syncReadyKnowledgeArticle as the route does and return its result as data.salesforceSync. Message on success: "Approved. The Salesforce draft is being prepared." or the sync error when the sync fails. Log it in knowledge_studio_action_log.

3. Studio data: add perms.submit per article (true when submitForReview would be allowed for this viewer), and keep viewer.canSkipReview = canOverrideApproval. Add both actions to the board action allowlist in KnowledgeStudioBoard.tsx. After either action, send fresh data to the board.

Test: an in_progress revision of a published article goes to in_review with submitForReview; as angela@transitiontrails.org, approveNow on an article she authored moves it to ready-to-publish and creates the Salesforce draft; a non-superadmin is refused. Then tell me it's ready and I'll upload board v1.7.
```
