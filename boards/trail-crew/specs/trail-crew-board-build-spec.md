# Trail Crew Board in Trail OS: Build Spec v0.1

Oct 28, 2026 · @Angela Landrith

## Summary

Trail OS will host the Trail Crew Product Board as a page that reads Salesforce live, asks Claude for the analysis, and shows whichever board version Angela has activated. It moves out of Claude because volunteers are not in the Claude workspace; everyone already signs in to Trail OS with Google SSO.

- **Does it call Claude to refresh?** Yes, for the judgment only. Records (cases, stories, ACs, build items, releases) reload straight from Salesforce with plain SOQL, no AI. Claude writes the checks, flags and Slack summaries, through the Replit-managed Anthropic integration already turned on in the workspace. It runs once an hour from 6 AM to 9 PM Central (16 runs a day) and at no other time, because API calls are a separate cost. Opening a page never triggers a call.
- **Can Angela apply new board versions?** Yes. The board's look and layout is an uploaded HTML package that reads one fixed data contract. Angela keeps designing versions with Claude, uploads one in Trail OS, previews it, activates it, and can roll back with one click. Feedback is collected per version.
- **First priority:** the Release tab, so Omar can run the Nov 6–7 release from Trail OS. Sprint, Pipeline and the planning tabs follow.
  - **Team Board.** Each team gets a Team Board for running the sprint: where every story is in the build, what is blocking it, and a daily standup submitted from the board into that day's Slack thread. It replaces the Coach Pulse site built in ChatGPT.

## Architecture

&#91;embedded content: Trail OS board architecture · hourly refresh, saved data, sandboxed board\]

The hourly job is the only thing that reads Salesforce or calls Claude; it saves the result, and every page reads that saved copy. Writes from the Release tab go through the Action API, which checks permission, writes to Salesforce, and posts to the release's Slack channel.

## Data contract

Every board version reads one JSON object, `BoardData`, and nothing else. Trail OS builds it server-side; a version never queries Salesforce or Claude itself. Fields are only ever added, never renamed or removed, so older versions keep working. `contractVersion` goes up by one when fields are added.

```json
{
  "contractVersion": 1,
  "asOf": "2026-10-28T14:30:00Z",
  "viewer": { "contactId": "003…", "name": "…", "roles": ["staff", "releaseManager"], "teams": ["devops"] },
  "teams": [ { "key": "devops", "name": "Trail OS DevOps", "goal": "…", "po": "…", "coaches": ["…"], "members": [ { "contactId": "…", "name": "…", "role": "BA / Admin" } ], "slackChannelId": "C0CDDJH95B2" } ],
  "features": [ { "id": "a61…", "name": "Feature-004", "title": "…", "team": "penny", "definitionOfDone": "…", "start": "2026-11-01", "end": "2027-01-31" } ],
  "cases": [ { "id": "500…", "number": "00001249", "subject": "…", "team": "penny", "featureId": "a61…", "priority": "High", "status": "Working", "stage": "tech", "queue": "Ready for Tech Review", "assignee": "…", "changeRequestId": null } ],
  "changeRequests": [ { "id": "0oW…", "number": "CHG-000000014", "subject": "…", "status": "New", "priority": "Critical", "size": "Extra-Large", "caseId": "500…", "releaseId": "a65…" } ],
  "sprints": [ { "id": "a63…", "name": "Sprint-002", "status": "Active", "start": "2026-10-18", "end": "2026-11-07", "goals": "…" } ],
  "stories": [ { "id": "a62…", "name": "Story-021", "title": "…", "status": "In Review", "points": 3, "priority": "P1", "builder": "…", "qa": "…", "docStatus": "Not Started", "sprintId": "a63…", "changeRequestId": "0oW…", "featureId": "a61…" } ],
  "acceptanceCriteria": [ { "id": "a64…", "storyId": "a62…", "status": "Passed" } ],
  "buildItems": [ { "id": "a5m…", "name": "…", "storyId": "a62…", "sprintId": "a63…", "status": "Deployed to Staging", "environment": "Staging", "componentType": "Field", "changeSetId": "a6x…", "manualStep": false, "verifiedInProd": false } ],
  "releases": [ { "id": "a65…", "name": "Release-002", "label": "October2026.01", "status": "Planning", "plannedDate": "2026-11-07", "manager": { "contactId": "003…", "name": "Omar Cohen" }, "slackChannelId": "C0CCU66FXCN", "slackChannelName": "release-2026-11-07", "signoffs": [ { "id": "a66…", "approver": "…", "role": "Tech Lead", "status": "Pending" } ], "steps": [ { "key": "qa", "label": "QA sign-off in staging", "owner": "QA reviewers, Hugh", "due": "2026-10-30", "done": false, "doneBy": null, "doneAt": null } ] } ],
  "changeSets": [ { "id": "a6x…", "name": "AM-Case-Cleanup-v1", "releaseId": "a65…", "crew": "Morning Crew", "owner": "…", "status": "Validated in staging" } ],
  "insights": { "generatedAt": "…", "model": "…", "stale": false, "byTeam": { "devops": { "sprint": […], "pipeline": […], "overview": […] } }, "byRelease": { "a65…": […] }, "platformGaps": […] }
}
```

Each insight is `{ "severity": "crit" | "warn" | "info", "tag": "Staging", "text": "…", "refs": ["Story-019", "CHG-014"] }`. A board version decides how to show them.

## Salesforce reads

Trail OS runs these with its existing Salesforce connection as one scheduled job every hour on the hour, 6 AM to 9 PM Central, saves the result, and serves it as `BoardData`. Pages only read the saved copy, so viewers never trigger Salesforce API calls, and every page shows when the data was last refreshed. These are the queries used to build the prototype on Oct 28; new fields from the next section are added once they exist.

| Entity | Query | Notes |
| --- | --- | --- |
| Sprints | `SELECT Id, Name, Sprint_Number__c, Status__c, Start_Date__c, End_Date__c, Sprint_Type__c, Cycle__c, Goals__c FROM TT_Sprint__c WHERE End_Date__c >= LAST_N_DAYS:30 ORDER BY Start_Date__c` |  |
| Stories | `SELECT Id, Name, Story_Name__c, Status__c, Story_Points__c, Priority__c, Complexity__c, Assignee__c, Assignee__r.Name, QA_Assignee__c, QA_Assignee__r.Name, Documentation_Status__c, Ready_for_Sprint__c, TT_Sprint__c, Change_Request__c, TT_Feature__c, Case__c, LastModifiedDate FROM TT_Story__c WHERE Status__c NOT IN ('Completed','Canceled')` | Story\_Name\_\_c is the title |
| Acceptance criteria | `SELECT Id, TT_Story__c, Status__c FROM TT_Acceptance_Criteria__c WHERE TT_Story__r.Status__c NOT IN ('Completed','Canceled')` | Counted per story on the server |
| Build items | `SELECT Id, Name, Status__c, Environment__c, Component_Type__c, Deployment_Method__c, Date_Pushed_to_Prod__c, TT_Sprint__c, TT_Story__c, TT_Change_Set__c, Manual_Step__c, Verified_In_Prod__c FROM TT_Build_Item__c WHERE TT_Sprint__r.End_Date__c >= LAST_N_DAYS:60` | TT\_Story\_\_c and the change-set fields are new (next section) |
| Change requests | `SELECT Id, ChangeRequestNumber, Subject, Status, Priority, Category, Size__c, Source_Case__c, TT_Release__c FROM ChangeRequest WHERE Status NOT IN ('Closed','Canceled','Rejected')` |  |
| Releases | `SELECT Id, Name, Release_Name__c, Status__c, Type__c, Planned_Release_Date__c, Actual_Release_Date__c, Release_Manager__c, Release_Manager__r.Name, (SELECT Id, Approver__c, Approver__r.Name, Role__c, Status__c, Sequence__c FROM TT_Release_Signoffs__r) FROM TT_Release__c WHERE Status__c != 'Canceled'` | Release-002 now has Omar, Nov 7, CHG-014 and CHG-016 |
| Cases | `SELECT Id, CaseNumber, Subject, Priority, Status, OwnerId, Owner.Name, Volunteer_Assigned__c, Volunteer_Assigned__r.Name, TT_Feature__c, Change_Request__c, EstimatedCompletionDate__c, Type, CreatedDate FROM Case WHERE RecordTypeId = '012an000007ZuZZAA0' AND IsClosed = false` | Platform Change record type |
| Features | `SELECT Id, Name, Feature_Name__c, Description__c, Definition_of_Done__c, Status__c, TShirt_Size__c, Total_Stories__c, Total_Completed_Stories__c, Total_Story_Points__c, TT_Initiative__c FROM TT_Feature__c` | No date fields yet; see next section |

Team mapping: a case belongs to a team through its Feature, and a Feature through a new `Team__c` picklist (next section). Until that exists, Trail OS uses the mapping table in the prototype board.

## Salesforce changes

Release work moves out of the prototype's page storage and into Salesforce, so every release keeps an audit trail whoever managed it. Build these in Dev01 and ship them in the next release that can carry them.

**New object: TT Change Set (`TT_Change_Set__c`)**

| Field | Type | Values or purpose |
| --- | --- | --- |
| Name | Text(80) | The outbound change set name, e.g. AM-Case-Cleanup-v1 |
| TT\_Release\_\_c | Lookup(TT Release), required | The release it ships in |
| Crew\_\_c | Picklist | Morning Crew, Afternoon Crew, Release Manager |
| Builder\_\_c | Lookup(Contact) | Who assembled it |
| Status\_\_c | Picklist | Planned, Uploaded to Staging, Validated in Staging, Deployed to Staging, Validated in Production, Deployed to Production, Failed |
| Source\_Org\_\_c | Picklist | Dev01, Staging |
| Notes\_\_c | Long text | Validation errors, deploy notes |

**New object: TT Release Step (`TT_Release_Step__c`)**, one record per runbook step per release, created from a template when a release is set up.

| Field | Type | Values or purpose |
| --- | --- | --- |
| TT\_Release\_\_c | Master-detail(TT Release) |  |
| Step\_Key\_\_c | Text(40) | log, cs, stg-am, stg-pm, steps, qa, uat, demo, prep, prod-am, prod-pm, verify, close |
| Label\_\_c, Owner\_Label\_\_c | Text | What the step is and who does it |
| Sequence\_\_c | Number | Order |
| Due\_Date\_\_c | Date | From the release calendar |
| Done\_\_c, Done\_By\_\_c, Done\_At\_\_c | Checkbox, Lookup(Contact), Date/Time | Set by Trail OS when ticked |

Board versions need no Salesforce object; they reuse Trail OS's Certification Resources storage (see Board versions).

**Changes to existing objects**

| Object | Change | Why |
| --- | --- | --- |
| TT Build Item | Add `TT_Story__c` Lookup(TT Story) | Direct link to the story. Hugh is removing the TT Automation container; backfill this from TT\_Automation\_\_r.TT\_Story\_\_c before he does |
| TT Build Item | Add `TT_Change_Set__c` Lookup(TT Change Set) | Which change set carries it |
| TT Build Item | Add `Manual_Step__c` Checkbox | Deletions and activations done by hand |
| TT Build Item | Add `Verified_In_Prod__c` Checkbox | Release manager's final check |
| TT Build Item | Status: add Deployed to Staging | Staging is a real stop in the path |
| TT Build Item | Deployment Method: add Change Set, remove the DevOps Center default | Matches how the team deploys |
| TT Build Item | Testing Status: add Passed in Staging, Failed in Staging | Only NA exists today |
| TT Release | Add `Slack_Channel_Id__c`, `Slack_Channel_Name__c` Text | One channel per release |
| TT Release | Status: add In Staging, In UAT | Shows the phase at a glance |
| TT Feature | Add `Team__c` Picklist (DevOps, Academy, Penny, Marketing) | Team view without a hand-kept mapping. Also add Start\_Date\_\_c and Target\_Date\_\_c (Date) for the roadmap |
| TT Release Signoff | Role: add Release Manager, QA Lead | Current roles don't fit the crew's sign-offs |

## Claude refresh

Claude is called at most once an hour, 6 AM to 9 PM Central, by one scheduled job, and only when the data changed. That is 16 runs a day at most, about 480 a month. Nothing a viewer does triggers a call.

1. **Schedule.** One job runs on the hour from 6:00 AM to 9:00 PM Central (America/Chicago, so it follows daylight saving). It runs every day, weekends included. Nothing runs overnight. It first runs the Salesforce reads and saves `BoardData` without insights.
2. **Skip when nothing changed.** The job hashes the saved data. If the hash matches the last run, it keeps the previous insights and makes no Claude call. Quiet hours and weekends skip most runs.
3. **One call per run.** When the data changed, the job sends Claude one compact summary of all teams and open releases (counts, flagged records, dates, today's date in CDT) and gets every team's and release's insights back in one response. No per-team or per-page calls.
4. **Model.** Claude through the Replit-managed Anthropic integration. Use the smaller, cheaper model tier for this job; the checks are rule-like and short. Model name lives in one setting so it can change without a code change.
5. **Output.** Claude must return JSON matching the `insights` shape in the data contract, at most 8 insights per team view and 8 per release, each under 300 characters. Trail OS validates it; invalid output is discarded and the last good insights stay.
6. **Saved, never live.** Insights are saved with `generatedAt` and the model name. Pages show “Insights as of 9:00 AM CDT”. If Claude is down or over budget, pages keep the last good insights and mark them stale.
7. **Cost guard (off for now).** A monthly cap on calls (start at 500, just above the 480 scheduled runs) set by Angela. At the cap, the job keeps refreshing Salesforce data and stops calling Claude until the next month or until Angela raises it.

**What Claude is asked** (system prompt, stored in Trail OS settings so Angela can tune it):

```text
You review a nonprofit volunteer team's Salesforce delivery data for Trail OS.
Today is {date} CDT. Sprint {sprint} runs {start} to {end}. Releases: {releases}.
Write short, specific checks a coach, product owner or release manager can act on today.
Rules: plain language; name the records (Story-019, CHG-014, case 1249); give the number;
say who should act; never invent data; no praise or filler; at most 8 per view.
Flag: stories in review with no AC tested; ACs failed; stories with every AC passed but an
old status; stories in scope with no build items; build items with no status or not in a
change set; runbook steps past due; change requests whose status lags their stories;
releases missing sign-offs; anything due within 2 days.
Return only JSON matching this schema: {schema}
```

Slack status posts in the Release tab are built from the saved insights and data, not a new Claude call.

## Board versions

Angela designs a new board version with Claude, uploads it to Trail OS, previews it on live data, and activates it for everyone. Rolling back is one click. Trail OS never changes code to ship a new look; only the data contract and the actions are code.

**What a version is.** One self-contained HTML file (inline CSS and JS, fonts from Google Fonts only), plus a version number and release notes. It is the prototype board with its snapshot data removed: it renders from `BoardData` and asks Trail OS to do anything that saves.

**How Trail OS runs it.** In a sandboxed iframe (`sandbox="allow-scripts"`, no same-origin, no top navigation, a Content Security Policy that blocks outside network calls except fonts). The version cannot reach Salesforce, Claude, cookies or the Trail OS session. It talks to Trail OS only through `postMessage`:

| Message from the board | Trail OS does | Who may |
| --- | --- | --- |
| `ready` | Sends `{type: "data", data: BoardData}`, then again after each hourly refresh | Anyone signed in |
| `setStep {releaseId, stepKey, done}` | Updates the TT Release Step | That release's manager, staff |
| `addChangeSet {releaseId, name, crew, builder}` | Creates a TT Change Set | That release's manager, builders, staff |
| `setChangeSetStatus {changeSetId, status}` | Updates it | That release's manager, staff |
| `assignBuildItem {buildItemId, changeSetId, manualStep}` | Updates the TT Build Item | That release's manager, the item's builder, staff |
| `verifyBuildItem {buildItemId, verified}` | Updates the TT Build Item | That release's manager, staff |
| `postReleaseStatus {releaseId}` | Posts the summary to the release's Slack channel | That release's manager, staff |
| `saveOrder {team, caseIds}` | Saves a team's priority order | That team's PO, coach, staff |
| `feedback {text, view}` | Saves feedback on the active version | Anyone signed in |
| `openRecord {type, id}` | Opens the case, story or release in Trail OS | Anyone signed in |

Trail OS checks permission on every message on the server; the board only hides buttons. Each reply is `{ok: true}` or `{ok: false, code, message}`, and a successful write sends fresh `BoardData` for that record without waiting for the hourly run (no Claude call).

**Where versions live: reuse Certification Resources.** Trail OS already versions an uploaded HTML file this way (Administration > Certification Resources): a registry row in `app_settings`, the HTML in App Storage, sha256 checked on every read and on activation, a 2 MiB limit, draft, preview, make current with a confirm, restore, and activation history. The board uses the same code under its own resource key, on a new Administration page, Trail Crew Board versions. No Salesforce object is needed for versions.

**The flow in Trail OS (admins, Administration > Trail Crew Board versions):**

1. Upload the HTML file, add release notes. It saves as Draft.
2. Trail OS checks it: under 2 MB, contract version supported, no outside script sources.
3. Preview opens it on live data for the uploader only.
4. Activate makes it the board for everyone; the previous Active becomes Retired.
5. Roll back sets any Retired version Active again.

**Feedback loop.** A “Feedback” button on every board version sends `feedback`. Trail OS saves it as a Case (Type: Feature Request, Product: Trail OS, Subject starting “Board v{n}:”) so it lands in the normal refinement flow. Angela reviews it, designs the next version with Claude, and uploads it.

## Access and roles

Everyone signs in to Trail OS with Google SSO and is matched to their Contact (by universal ID once it exists, Transition\_Trails\_Email\_\_c until then). Roles come from Salesforce data, so nobody keeps a separate list.

| Role | How Trail OS knows | Can |
| --- | --- | --- |
| Staff | Trail OS licensed user (Angela, Michele, Hugh, Kim) | Everything, including board versions and the Claude cost cap |
| Release manager | The Contact in `Release_Manager__c` on that TT Release | Run that release: steps, change sets, item assignment, verification, Slack posts. Only for that release |
| Product owner, coach | Their role on the team roster (Teams change) | Reorder their team's priorities |
| Builder | Assignee on the story | Assign their own build items to a change set |
| Crew member | Any active volunteer Contact | View every tab, send feedback |

The release manager rotates each release: staff set `Release_Manager__c` when they create the TT Release, and the rights move with it. The last release manager keeps view access only.

Matching uses the Contact's Transition\_Trails\_Email\_\_c (the work address), never the standard Email field, which often holds a personal address. Omar's record is correct: omar.cohen@transitiontrails.org is in Transition\_Trails\_Email\_\_c.

Team rosters and roles (coach, assistant coach, product owner, BA, admin and so on) come from a separate change, built in Trail OS first and moved to Salesforce once the DevOps team adds the objects (case 1274): Change: Team rosters and roles

**Penny's actions** (clearing blockers first) are a separate feature for the Trail OS DevOps team, with every action recorded, announced and undoable: Feature-010: Penny actions

## Slack release channels

Each release gets its own channel, named `release-YYYY-MM-DD` after its production date, and the release manager runs it. The first is #release-2026-11-07 (C0CCU66FXCN).

- **Creating the channel.** When staff create a TT Release in Trail OS, Trail OS creates the channel, saves its ID on the release, and invites the release manager, Hugh, Angela and the builders on the release's stories. Uses the existing Trail OS Slack app in Replit; confirm it has `channels:manage`, `chat:write` and `users:read.email`.
- **Posting.** Trail OS posts as the Trail OS app, not as a person: the release manager's status posts, an automatic note when a runbook step is ticked, and a reminder the morning of any step due that day (8:00 AM Central).
- **Status post contents.** Next step and owner, each change set and its status, build items placed in a change set out of the total, items not yet placed (first 12), stories with no build items, and the latest release insights.
- **Closing.** When the release is set to Deployed, Trail OS posts the release notes and archives the channel 14 days later.

## Screens

Version 1 is the current prototype board (Version 14 on Claude), with its snapshot data swapped for `BoardData`. Nine tabs, a team switcher, and every case or story linking to its Trail OS record.

**Navigation.** The board opens from Operations > Trail Crew Boards, which replaces Operations > Planning Board in the sidebar. The old Planning Board route stays working for Mural links until the team decides where Mural publishing lives. Once Trail Crew Boards is finalized, the existing DevOps Sprint workspace and Release Readiness views are removed from Trail OS; until then they keep working but get no new features.

| Tab | Shows | Saves |
| --- | --- | --- |
| Overview | Team goal, roster, roadmap by Feature, Slack notes, decisions needed | Nothing |
| Prioritize | The team's open cases in rank order, next action per case | Order, through `saveOrder` (replaces browser storage) |
| Features | Feature cards with summary, definition of done, cases by stage | Nothing |
| Team | People, roles, stories and cases each carries | Nothing |
| Blockers | Critical paths and waits | Nothing |
| Discovery | Case → Change Request → Story flow, BA queue | Nothing |
| Sprint | Sprint calendar, delivery plan, points by status, story board with AC dots, Sprint-003 planning | Nothing |
| Build pipeline | Stage counts, change requests with progress tracks, build items by story, platform gaps | Nothing |
| Release | Release picker, manager, runbook, change sets, build-item reconciliation, sign-offs, Slack post | Steps, change sets, assignments, verification, posts |

Every tab shows “Data as of” and “Insights as of” times in CDT. Hand-written checks in the prototype become Claude insights; rules that are pure counts (for example, build items with no status) stay computed in the board so they show even when insights are stale.

## Team Board: sprint flow and daily standup

Each team gets a Team Board that works like a scrum master: where every story sits in the build, what is stopping it from moving, and a daily standup people submit from the board that posts into that day's Slack thread. It is about the work, not about engagement: no participation scores, no “no posts in 48h” flags. It replaces Coach Pulse, which is retired once the Team Board runs.

**Story flow.** One card per story in the team's sprint, in the column for where it actually is. Status alone isn't enough, so Trail OS works out the column from the story, its acceptance criteria and its build items:

| Column | A story is here when |
| --- | --- |
| Ready | Status Ready or Backlog, in the sprint |
| Building in Dev01 | Status In Progress |
| In a change set | Every build item is in a change set or marked manual |
| In staging | Its change set is Deployed to Staging |
| QA | Status In Review; shows ACs passed, failed, untested |
| UAT | All ACs passed and the release is in UAT |
| Ready for production | UAT signed off |
| Done | Its change set is Deployed to Production and items verified |

Each card shows the builder and QA reviewer, points, AC dots, build items logged, days in the column, and a red edge when blocked.

**Blockers.** A blocker is a story, a reason, who or what it waits on (a person, another team, a case), and when it started. People raise one in their standup or on the card; the coach, assistant coach or staff clears it (Penny joins them through Feature-010). The board lists open blockers first, oldest first, with their age in days.

**Daily standup.**

1. **The coach sets the team's standup time** on the board (Team settings, coach and assistant coach only). Each team decides its own time and days: Monday to Friday by default, weekends only if the team chooses them. The standup is virtual: the time is when everyone's update is due, not a meeting. Changes apply from the next day.
2. **6:00 AM Central on each standup day:** the Trail OS Slack app opens the day's thread in the team channel: “Daily standup · Wed Oct 28 · Sprint-002 day 11 · updates due by 10:00 AM”, with stories in QA and open blockers. Trail OS saves the thread's timestamp.
3. **On the board, each person opens “My standup”.** The form lists their stories (as builder or QA). For each: what moved yesterday, what's next today, blocked yes or no (reason, waiting on), and optionally a new status for the story. A status change goes through the same rules Trail OS enforces today when a story's status is changed (the same server check, Salesforce validation rules and flows), so the form can't move a story anywhere the story page couldn't. Plus a line for anything else, or “not working today, back on…”.
4. **Submit** saves a TT Standup record and posts it as a reply in that day's thread, under the person's name with an @mention, formatted the same way every time. Blockers are created on the story at the same moment.
5. **Before the due time** the board shows who is in and who is still to post, with the time left. **At the due time** the app replies once in the thread: updates in (for example 6 of 8), open blockers, and who is still to post, so the coach can follow up. Updates after the due time are still accepted and marked late; nothing else is flagged or scored.
6. People who prefer Slack can still reply in the thread by hand. Trail OS reads those replies in the hourly refresh and counts them as in, shown unstructured.

**Run standup mode.** For the coach to facilitate: blockers first, then the board right to left (closest to done first), one person at a time with their submitted update on screen. Good for training: everyone sees the same format every day.

**Salesforce changes for the Team Board**

| Object | Change |
| --- | --- |
| New TT Standup (`TT_Standup__c`) | Contact, Team, TT Sprint, Standup Date, Not Working Today, Other Notes, Slack Thread TS, Slack Message TS |
| New TT Standup Line (`TT_Standup_Line__c`) | TT Standup (master), TT Story, Yesterday, Today, Blocked |
| New TT Blocker (`TT_Blocker__c`) | TT Story, Reason, Waiting On (text), Waiting On Contact, Waiting On Case, Raised By, Raised On, Cleared By, Cleared On, Status (Open, Cleared) |
| Team settings | Standup Due Time (set by the coach), Standup Days (default weekdays) and Slack Channel ID per team, on a TT Team record so coaches can edit it from the board |

**Slack.** Needs `chat:write` and `chat:write.customize` on the Trail OS Slack app, so posts show the person's name and photo while coming from the app. Posting as the person themselves would need each volunteer to connect Slack; not in this phase.

**Claude.** No extra calls. The hourly run already sees the day's standups and blockers and adds Team Board insights (stories stuck more than 2 days in a column, blockers waiting on another team, QA with nothing tested).

**New actions:** `submitStandup`, `raiseBlocker`, `clearBlocker` (coach, assistant coach, staff; every action carries an actor type, Person for now), `setStoryStatus` (the story's builder or QA reviewer, coach, staff; same rules as today), `setStandupTime` (the team's coach or assistant coach, staff). Standup submissions write and post immediately; they don't wait for the hourly refresh.

**Reused from Coach Pulse:** the Active Volunteer filter, identity by Contact ID then exact Slack ID or work email (never first name), team channels, the Morning and Afternoon Crew rules through Nov 7, and the record link formats. Its engagement indicators are not carried over.

## Build plan

The Release tab ships first, by Mon Nov 3, so Omar can run deployment prep on Nov 5 and the production deploys on Nov 6–7 from Trail OS. The new Salesforce objects can't ride the release they track, so phase 1 keeps release state in the Trail OS database and moves it into Salesforce in phase 3.

| Phase | Target | Scope | Gate |
| --- | --- | --- | --- |
| 1. Release tab | Mon Nov 3 | `BoardData` refresh job (Salesforce only, hourly 6 AM–9 PM Central); board version 1 hosted in the sandboxed frame; Release tab actions saved in the Trail OS database; Slack posts from the Trail OS app; release manager role from `Release_Manager__c` | Omar signs in, sees Release-002, ticks a step, assigns an item, posts to #release-2026-11-07 |
| 2. Claude insights | Fri Nov 14 | Hourly Claude job with change detection and the monthly cap; insights on Sprint, Pipeline, Overview and Release; “as of” times | One week of runs under 100 calls; insights match the prototype's checks on the same data |
| 3. Salesforce objects | Sprint-003 release | TT Change Set, TT Release Step, TT Board Version and the field changes, built in Dev01; migrate phase 1 release data into them; Trail OS reads and writes Salesforce | Release-002 history visible from Salesforce records |
| 4. Board versions | Sprint-003 release | Upload, preview, activate, roll back; feedback to Cases; `saveOrder` | Angela uploads version 2 and rolls back to 1 without help |

**Team Board** comes right after the Release tab, aimed at Mon Nov 10, the first weekday of Sprint-003 and the new teams. Order inside it: daily standup thread and “My standup” first (it trains the habit from day one), then blockers, then the story-flow columns and Run standup mode. Until the TT Standup objects ship, phase 1 stores standups and blockers in the Trail OS database. Gate: all four teams post a week of standups from the board, and the Coach Pulse site is retired.

**Acceptance criteria**

- [ ] No Salesforce or Claude call happens when a page opens; calls only run on the hourly schedule, 6 AM to 9 PM Central.
- [ ] Every page shows the data and insights times in CDT.
- [ ] A volunteer who is not the release manager cannot change a release; the server refuses it even if the board shows the button.
- [ ] Setting a different `Release_Manager__c` moves the rights to that person on the next sign-in.
- [ ] Every build item for the release's stories appears in reconciliation, and items not in a change set or marked manual are flagged.
- [ ] When Claude fails or the cap is hit, the board still loads with the last good insights marked stale.
- [ ] A board version cannot make network calls or read the Trail OS session.
- [ ] Activating and rolling back a version takes effect for everyone within one page reload.

## Cases

Ten Platform Change cases, created Oct 28. Salesforce object work sits in Ready for BA Review for the Trail OS DevOps team; Trail OS (Replit) work sits in Staff Ownership for Angela.

| Case | Work | Where | Priority | Depends on |
| --- | --- | --- | --- | --- |
| [1279](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DHKOzAAP) | Trail OS: board data refresh and Release tab, target Nov 3 | Replit | High |  |
| [1280](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DGzqmAAD) | Trail OS: Teams screen for rosters and roles | Replit | High |  |
| [1281](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DGs1NAAT) | Trail OS: Team Board with daily standup thread, target Nov 10 | Replit | High | 1280 |
| [1282](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DIM8YAAX) | Trail OS: hourly Claude insights and board versions | Replit | Medium | 1279 |
| [1274](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DHYJtAAP) | TT Team and TT Team Member objects | Salesforce | High |  |
| [1275](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DGceAAAT) | TT Change Set and TT Release Step objects, release fields | Salesforce | High |  |
| [1276](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DGALIAA5) | TT Build Item: story and change-set links, staging status, Change Set method, backfill | Salesforce | High | 1275 |
| [1277](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DIfj3AAD) | TT Standup, TT Standup Line and TT Blocker objects | Salesforce | High | 1274 |
| [1278](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DH8R4AAL) | TT Feature dates and TT Board Version object | Salesforce | Medium |  |
| [1283](https://trailos.transitiontrails.org/cases?recordType=Case&recordId=500an00001DFLQvAAP) | Penny actions in Trail OS: recorded, announced, undoable (Feature-010) | Replit and Salesforce, Trail OS DevOps team | Medium | 1277, 1281 |

The Replit cases don't wait on the Salesforce ones: each stores its data in the Trail OS database first and moves to Salesforce when the matching case ships. Case 1281 supersedes the Coach Pulse placeholder, case 1266.

## Open questions

None open. All answered by Angela on Oct 28.
