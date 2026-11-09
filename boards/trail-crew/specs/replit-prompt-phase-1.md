# Replit prompt: phase 1 (case 1279)

Paste the block below into Replit Agent in the TRAIL OS app. It is written against the app's actual code (sidebar, Certification Resources versioning, devopsAccess, scheduled-job and Slack patterns). It covers case 1279 only; give Agent the Teams screen (1280) and Team Board (1281) as separate prompts once this one passes its checks. Work on a branch or checkpoint first.

```text
Goal: add Trail Crew Boards to Trail OS, starting with the Release tab, so the rotating release manager (Omar Cohen for Release-002, production Nov 6-7) can run a release from Trail OS. Case 00001279. Work on a checkpoint; keep everything else working.

Paths: FE = artifacts/program-map/src, API = artifacts/api-server/src. Sidebar.tsx and App.tsx are the source of truth, not replit.md.

1. Navigation
- In FE/components/layout/Sidebar.tsx (navGroups, Operations), remove the item { id: 'ops-planning-board', path: '/operations/devops/board', label: 'Planning Board' } and add { id: 'ops-trail-crew-boards', path: '/operations/boards', label: 'Trail Crew Boards' } in the same position, for staff. Volunteers and coaches don't see Operations, so also add a Homebase entry, Trail Crew Boards at /homebase/boards, for the volunteer and coach audiences (requireHomebaseAuth), rendering the same board page. The board itself controls what each person can do.
- Keep the /operations/devops/board route and LivePlanningBoard working so Mural back-links (muralRecordDestination) and the Mural publishing panel still resolve. Do not delete LivePlanningBoard or its API routes in this change.
- Add Administration item { id: 'admin-board-versions', path: '/admin/trail-crew-boards', label: 'Trail Crew Board versions' } next to Certification Resources (admin tier).

2. Board versions: reuse the Certification Resources pattern exactly
- Generalize API/lib/certificationResources.ts, certificationResourceHtml.ts and routes/certificationResources.ts so the registry takes a resource key, or copy them for a new key "trail-crew-board:main". Same storage (app_settings registry row + App Storage objects), same sha256 check on every read and on activation, same 2 MiB limit, same draft -> preview -> make current with confirm -> restore flow, same activation history, same requireAdmin + same-origin write checks.
- Page FE/pages/admin/TrailCrewBoards.tsx modeled on CertificationResources.tsx.
- validateResourceHtml for boards: complete html document, no external scripts at all, Google Fonts stylesheet allowed.

3. Board page /operations/boards
- Fetch the active board HTML and render it in <iframe sandbox="allow-scripts" srcDoc={html}> with the same protectResourceHtml-style CSP (connect-src 'none', no allow-same-origin), like SalesforceAdminStudyGuide.tsx.
- Bridge with window.postMessage. The board sends {type:"ready"}; the page replies {type:"data", data: BoardData}, again after each refresh and each successful action. The board sends actions {type:"action", id, name, payload}; the page calls the API and replies {type:"result", id, ok, code?, message?}. Check event.source is the iframe's contentWindow; never trust the board for permissions.

4. Scheduled refresh job (API/lib/trailCrewBoardJob.ts, started in API/index.ts)
- Same pattern as oneToOneMeetingJob.ts: recursive setTimeout + pg_try_advisory_lock(hashtextextended('trail-crew-board-refresh',0)). Runs on the hour 6:00 AM to 9:00 PM America/Chicago, every day. No Salesforce calls when a page opens.
- Reads through the production connector (exact API names):
  TT_Sprint__c: Id, Name, Sprint_Number__c, Status__c, Start_Date__c, End_Date__c, Sprint_Type__c, Cycle__c, Goals__c (End_Date__c >= LAST_N_DAYS:30)
  TT_Story__c: Id, Name, Story_Name__c, Status__c, Story_Points__c, Priority__c, Assignee__c, Assignee__r.Name, QA_Assignee__c, QA_Assignee__r.Name, Documentation_Status__c, TT_Sprint__c, Change_Request__c, TT_Feature__c, Case__c (not Completed or Canceled)
  TT_Acceptance_Criteria__c: Id, TT_Story__c, Status__c
  TT_Build_Item__c: Id, Name, Status__c, Environment__c, Component_Type__c, Deployment_Method__c, TT_Sprint__c, TT_Automation__r.TT_Story__c (switch to TT_Story__c when case 1276 adds it)
  ChangeRequest: Id, ChangeRequestNumber, Subject, Status, Priority, Size__c, Source_Case__c, TT_Release__c (open)
  TT_Release__c: Id, Name, Release_Name__c, Status__c, Planned_Release_Date__c, Release_Manager__c, Release_Manager__r.Name, child TT_Release_Signoffs__r (Approver__r.Name, Role__c, Status__c, Sequence__c)
- Save BoardData (contractVersion 1, asOf) in a new table; GET /api/operations/boards/data returns it plus viewer {contactId, name, tier, isReleaseManagerFor:[releaseIds]}.

5. Release tab actions (POST /api/operations/boards/actions; new tables until Salesforce case 1275 ships)
- Tables: board_release_step (releaseId, stepKey, done, doneByContactId, doneAt), board_change_set (id, releaseId, name, crew, builderContactId, status, notes, createdAt), board_build_item_placement (buildItemId, releaseId, changeSetId, manualStep, verifiedInProd, updatedByContactId, updatedAt), board_action_log (actorType 'Person'|'Penny', actorContactId, action, payload, reason, at). Put the schema in lib/db/src/schema like planningBoard.ts.
- Actions: setStep, addChangeSet, setChangeSetStatus (Planned, Uploaded to Staging, Validated in Staging, Deployed to Staging, Validated in Production, Deployed to Production, Failed), assignBuildItem, verifyBuildItem, postReleaseStatus.
- Who may act: staff (isStaff) on any release; the signed-in user's Contact (match on Contact.Transition_Trails_Email__c, as devopsContact() does) when it equals that release's Release_Manager__c, on that release only; a build item's story assignee may assign their own item. Everyone signed in can view. Refuse writes during impersonation and cross-origin, like muralBacklog.ts.
- Runbook steps per release, in order: log, cs, stg-am, stg-pm, steps, qa, uat, demo, prep, prod-am, prod-pm, verify, close.

6. Slack
- Use the existing bot token (SLACK_BOT_TOKEN) and fetch to the Web API, as routes/slack.ts does. Store each release's channel ID in Trail OS until case 1275 adds the field; Release-002 uses C0CCU66FXCN (#release-2026-11-07).
- postReleaseStatus posts: next step and owner, each change set and its status, build items placed out of total, the first 12 not yet placed, and stories in the release with no build items.

7. Existing DevOps views
- SharedDevOpsWorkspace already has /releases (ReleaseReadinessWorkspace) and /planning (SprintPlanningWorkspace). They will be retired once Trail Crew Boards is finalized, so do not extend them. Report what they show before building, reuse their data queries where useful, and keep them working until the retirement change. Do not remove them in this change.

8. Board version 1 contract (trail-crew-board-v1.html, uploaded on Trail Crew Board versions)
- The board posts {type:"ready", board:"trail-crew", boardVersion:1, contractVersion:1}. Reply {type:"data", data: BoardData}.
- It posts {type:"action", id, name, payload}. Reply {type:"result", id, ok:true} or {type:"result", id, ok:false, code, message}; after ok, send fresh {type:"data"}. The board waits 20 s, then tells the person the save may not have gone through.
- Actions and payloads: openRecord {type: case|story|changeRequest|slack, id} (navigate the parent window: case and story links use the existing Trail OS URL formats, slack opens the channel; the sandbox cannot open links itself); saveOrder {team, caseIds[]} (team coach, assistant coach, product owner, product manager, staff; store in teams[].priorityOrder); setStep {releaseId, stepKey, done}; addChangeSet {releaseId, name, crew}; setChangeSetStatus {changeSetId, status}; assignBuildItem {releaseId, buildItemId, changeSetId? , manualStep?} (only the fields present change); verifyBuildItem {releaseId, buildItemId, verified}; postReleaseStatus {releaseId}.
- BoardData fields v1 reads (ids are Salesforce Ids unless noted):
  contractVersion 1, asOf ISO
  viewer {contactId, name, isStaff, isReleaseManagerFor[releaseId], teams[teamKey]}
  teams[] {key, name, goal, description, status, slackChannelId, priorityOrder[caseId], members[] {contactId|null, name|null, roles[], primaryRole, openSeat}} (seed the four teams from trail-crew-teams.seed.json, provided by Angela, until case 1280's Teams screen exists; priority editors are the roles listed in its priorityEditorRoles)
  features[] {id, name, title (Feature_Name__c), team, status, size, description, definitionOfDone, start, end, totalStories, completedStories}
  cases[] {id, number, subject, team (from the Feature's team; null if none), featureId, priority, status, stage (intake|discovery|dependency|tech|staff from the owner queue: Cases, Ready for BA Review, DepPriority, Ready for Tech Review, Staff Ownership or a staff user), queue, assignee (Volunteer_Assigned__r.Name), assigneeId, changeRequestId}
  changeRequests[] {id, number, subject, status, priority, size, caseId, caseNumber, releaseId}
  sprints[] {id, name, status, start, end, goals}
  stories[] {id, name, title (Story_Name__c), status, points, builder, builderId (Assignee__c), qa, qaId (QA_Assignee__c), docStatus, sprintId, changeRequestId, featureId}
  acceptanceCriteria[] {storyId, status}
  buildItems[] {id, name, storyId, sprintId, status, environment, componentType, changeSetId, manualStep, verifiedInProd}
  releases[] {id, name, label, status, plannedDate, manager {contactId, name}, slackChannelId, slackChannelName, signoffs[] {approver, role, status, sequence}, steps[] {key, label, owner, due, sequence, done, doneBy (name), doneAt}}
  changeSets[] {id, releaseId, name, crew, owner, status}
  insights null until case 1282
- Dates are YYYY-MM-DD; the board works out today from asOf in Central time.

9. Checks before done
- Operations shows Trail Crew Boards and no longer shows Planning Board; old Mural links to /operations/devops/board still work.
- Admin uploads a board HTML on Trail Crew Board versions, previews it, makes it current, and restores the previous one.
- Omar (Contact 003an00000t9iIIAAY, Transition_Trails_Email__c omar.cohen@transitiontrails.org) opens Trail Crew Boards, sees Release-002, ticks a step, adds a change set, assigns a build item, posts to the channel.
- A volunteer who isn't the release manager gets ok:false on every release action, even calling the API directly.
- No Salesforce call on page load; the job runs on the hour 6 AM-9 PM Central only. The board iframe cannot reach the network or the session.
```

Before running it: Omar's Contact is ready: his work email is in Transition\_Trails\_Email\_\_c. Board version 1 is ready: trail-crew-board-v1.html (67 KB, no outside scripts, no forms). Upload it on Trail Crew Board versions once that page exists, preview it, and make it current.
