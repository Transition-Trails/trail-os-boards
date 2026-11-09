# Content Studio in Trail OS: Build Spec v0.1

Nov 7, 2026 · @Angela Landrith

## Summary

Trail OS will host the Content Studio as an uploadable HTML board, the same way it hosts the Knowledge Studio and the Trail Crew Boards. Trail OS supplies the data and saves every change; the board only shows the data and sends named actions back. Angela can upload, preview, activate and roll back board versions without a Replit change.

- **What version 1 covers:** the staff board (Overview, Pipeline, Publishing, Volunteers), the Build With Me series view, the full record for one video, and a volunteer view for contributors. It replaces the nine tabs in today's Content Studio.
- **Video production comes first.** Arnav records each Build With Me video and runs the Penny video skill in his own Claude app. Trail OS makes no Claude calls for this, so there is no API cost. A station turns done when the skill fills the matching Content Item field.
- **Data is live from Salesforce.** Content Items, Topics, Publications and the item Cases are read when the board opens and after every action.
- **Assignment uses the Trail OS model.** Build With Me runs on the series Case 00001289, and its Volunteer Assigned Contact (Arnav) is the volunteer on every video in the series. No Action Plans are needed.
- **People keep the gates.** Volunteers can move an item as far as Ready for Review. Script approval, final review and publishing stay with staff.

## How it works

The Content Studio reuses the Knowledge Studio board pattern piece by piece. The two differences are where the data comes from and who can open it.

| Part | Knowledge Studio today | Content Studio |
| --- | --- | --- |
| Board versions | `createBoardResource` in trailCrewBoardResource.ts, key `knowledge-studio-board:main`, files under `/objects/knowledge-studio-boards/` | New instance: key `content-studio-board:main`, root `/objects/content-studio-boards/`. Upload, preview and make current under Administration › Board versions |
| Where it shows | Knowledge › Knowledge Studio | Penny › Create › Content Studio at `/content/studio`, replacing today's nine Content Studio tabs once accepted |
| Sandbox | iframe `sandbox="allow-scripts"`, CSP `connect-src 'none'`, Google Fonts allowed | Identical |
| Bridge | ready → data; action → result; contractVersion 1; 20-second action timeout | Identical messages; the board name is `content-studio` |
| Data | Trail OS knowledge tables | Live from Salesforce on each load and after each action: ContentItem\_\_c with its Publications, ContentTopics\_\_c, and the item Cases. The local content\_items copy doesn't hold the production fields, so it isn't used |
| Claude | Hourly insights job | None. Arnav runs Claude in his own app; the board only builds the prompt text |
| Who can open it | Staff and Knowledge Managers | Staff see everything. A volunteer sees only items whose Case names their Contact in Volunteer Assigned, plus Open items and Suggest an idea |
| Links | `openRecord` opens a new tab | Same; opens the Trail OS record, or a saved https link (Drive, Descript, Canva, YouTube) |

What Trail OS already has and should reuse:

- `saveCaseVolunteerAssignment` and `listCaseContactAssignees` in caseVolunteerAssignment.ts for checked, audited volunteer assignment.
- `ConnectorSalesforceClient.updateRecordIfUnmodified` for every Content Item write, so a stale board gets `stale` instead of overwriting someone.
- `isValidDescriptProjectUrl` and `FINAL_QA_CHECKS` from buildWithMeProduction.ts.
- The contributor idea path in routes/contentItems.ts for Suggest an idea.

The Build With Me pilot ran on Labs Action Plans, 10 AP Tasks per video, under Case 00001173. Those plans are deleted and that Case is closed. Stations come from Content Item fields instead, so a new video needs no Action Plan.

## Assignment model

Build With Me runs on one series Case: 00001289, "Build With Me: Foundations Trail 2027", created Nov 7. Arnav is its Volunteer Assigned Contact, which makes him the volunteer on every video in the series. The pilot Case 00001173 is closed and its four Action Plans are deleted (in the Recycle Bin until Nov 22).

How Trail OS finds the series for an item:

1. The series Case is the open Case whose Product is "Foundations Trail – Build With Me" (FT-BWM-Series). Trail OS looks it up this way rather than hard-coding a Case Id, so a future series gets its own Case the same way.
2. That Product's week Products (FT Build with me Week 1 to Week 12) have it as their Parent Product.
3. A Content Item belongs to the series when a Product Content Item links it to one of those week Products.
4. The item's `case` on the board is the series Case, with `scope: "series"`.

What this means on the board:

- Picking a volunteer on a series video sets Volunteer Assigned on the series Case, so it changes the volunteer for the whole series. The board says so before it saves.
- Review notes, script approvals and Final review checks go on the series Case as Case comments, each starting with the video code (for example "FT27-W01-A:").
- A Foundations Trail video that isn't linked to a week Product shows "Not in the series yet", and its volunteer can't be set until it is.

Salesforce changes before the first run:

- [x] Series Case 00001289 created with Arnav as Volunteer Assigned
- [x] Pilot Action Plans deleted and Case 00001173 closed, with a Case comment pointing to 00001289
- [ ] Link the 37 FT27 Content Items to their week Products with Product Content Items (today only the four pilot FT-W videos are linked)
- [ ] Add FT Build with me Week 0 (FT-BWM-WK00) for W00-A and W00-B
- [ ] Add the three fields in Platform Change Case 00001290: Recording Review and Recording Review Note on Content Item, and a Content Item lookup on Course Module Activity

## Build With Me stations

A Build With Me video moves through 11 stations, and each one is done when a Content Item field says so. The board works this out from the data; Trail OS doesn't store a station. An item is a Build With Me video when it belongs to the series (Assignment model).

| # | Station | Who | Done when |
| --- | --- | --- | --- |
| 1 | Build plan ready | Staff | `Summary__c` has text |
| 2 | Record the build | Arnav, on the board | `Raw_Recording_Location__c` is set and `Recording_Review__c` isn't Pickup Required or Rebuild Required |
| 3 | Review the recording | Angela, on the board | `Recording_Review__c` = Accepted |
| 4 | Script and written guide | Arnav, Claude step 1 | `Penny_Narration_Location__c` is set and `Penny_Script_Status__c` is In Review or Approved |
| 5 | Approve the script | Angela, on the board | `Penny_Script_Status__c` = Approved |
| 6 | Penny audio | Arnav, Claude step 2 | `Penny_Narration_Script_Hash__c` is set |
| 7 | Thumbnail | Arnav, Claude step 3 | `Thumbnail_Design_Location__c` is set |
| 8 | Video and Descript | Arnav, Claude step 4 | `Descript_Project_URL__c` is a valid Descript project link and `Length__c` > 0 |
| 9 | Trail OS article draft | Arnav, Claude step 5 | `Status__c` is Ready for Review, Ready to Publish or Published |
| 10 | Final review | Angela, on the board | `Status__c` is Ready to Publish or Published |
| 11 | Publish on YouTube | Angela, in YouTube Studio and on the board | `Status__c` = Published and a YouTube publication is Published |

**Recording review and Slack.** When Arnav saves a recording link, Trail OS clears `Recording_Review__c` and posts in the #ttcontentcreation Slack channel: the video code and title, who recorded it, and a button that opens the item in Trail OS. Angela's answer (Accepted, Needs pickups or Record again, with her note) posts as a reply in that thread. Pickups and Record again send station 2 back to Arnav with the note; his new link starts a new review.

**YouTube and learners.** Videos go on the Transition Trails YouTube channel as Unlisted: anyone with the link can watch, but the video isn't listed or searchable. YouTube can't share private videos through its API, and private videos don't play in Google Classroom, so Unlisted is the practical choice. Learners get the link two ways: the week's Video Lesson activity (a Course Module Activity linked to the Content Item) and that week's learner-task Knowledge article, whose video link Trail OS sets when the video is published.

The current station is the first one not done. Claude steps 1 to 5 run in Arnav's own Claude app from a prompt the board builds. Each step reads the Content Item first and stops if its fields are already filled, so a step can run in a later session.

Other content (articles, newsletters, social posts) uses the item's Status alone: Idea, Not Started, In Progress, Ready for Review, Ready to Publish, Published.

## Data contract v1

Trail OS sends one `ContentStudioData` object with `contractVersion: 1`. The board works out every count, station, flag and view from it, and shows a waiting message for any other version.

| Key | Shape | Source in Trail OS |
| --- | --- | --- |
| `contractVersion` | `1` | constant |
| `asOf` | ISO time the data was built | now |
| `viewer` | `{email, name, contactId, isStaff, isManager, canAssign, canApprove, canPublish}` | session; `contactId` = the viewer's Contact by Transition Trails email; the three `can` flags = staff for now |
| `topics` | `[{id, title}]` | ContentTopics\_\_c |
| `volunteers` | `[{contactId, name}]` | `listCaseContactAssignees`, Volunteer Contacts only; staff viewers only, empty for volunteers |
| `items` | list, below | ContentItem\_\_c with its Publications and Case. Staff get every item; a volunteer gets only items whose Case names their Contact |
| `openItems` | `[{id, title, topic, format, requested}]` | volunteers only: items in production with no volunteer; `requested` = this viewer already asked |
| `notices` | `[string]`, optional | anything the board should show at the top, such as a Salesforce read that failed |

Each item:

| Field | Meaning |
| --- | --- |
| `id`, `number`, `title` | Salesforce Id, the CI number (`Name`), `Title__c` |
| `status`, `format`, `topicId`, `topic` | `Status__c`, `Format__c`, `ContentTopic__c` and its title |
| `pillars`, `objective`, `dueDate`, `summary` | `Content_Pillars__c` split on `;`, `Primary_Objective__c`, `Due_Date__c`, `Summary__c` |
| `length` | `Length__c` as a number, or null |
| `version` | `LastModifiedDate`, the concurrency token every write checks |
| `rawRecordingUrl`, `contentLocationUrl`, `pennyNarrationUrl`, `thumbnailUrl`, `descriptUrl` | `Raw_Recording_Location__c`, `Content_Location__c`, `Penny_Narration_Location__c`, `Thumbnail_Design_Location__c`, `Descript_Project_URL__c` |
| `pennyScriptStatus` | `Penny_Script_Status__c` |
| `hasNarrationHash` | true when `Penny_Narration_Script_Hash__c` is set (the hash itself isn't sent) |
| `case` | `{id, caseNumber, subject, scope, volunteer: {contactId, name} or null}` from the series Case found through the item's week Product, with scope "series"; null when the item isn't linked to a series |
| `publications` | `[{id, platform, status, plannedDate, publishedDate, url}]` from Content\_Item\_Publication\_\_c |
| `requests` | `[{email, name, at}]` volunteers who asked to take it; staff viewers only |
| recordingReview, recordingReviewNote | Recording\_Review\_\_c (Accepted, Pickup Required, Rebuild Required, or null when not reviewed) and Recording\_Review\_Note\_\_c |
| courseActivity | {id, name, module} from the Course Module Activity whose Content\_Item\_\_c is this item, or null |

The board never sees `Content_Details__c`, the Penny script text or anyone's email beyond requests. Load cost: four SOQL queries (items with publications, topics, the series Case, its week Products with their Product Content Items) plus the cached assignee list.

## Actions

The board sends 13 named actions, and Trail OS checks each one on the server before it changes anything. Trail OS answers `{type:"result", id, ok, code?, message?}`, then sends fresh data. A `version` that no longer matches `LastModifiedDate` returns `stale`. Every write uses `updateRecordIfUnmodified` and is logged in a `content_studio_action_log` table with the actor and payload.

| Action | Payload | Who may run it | What Trail OS does |
| --- | --- | --- | --- |
| `openRecord` | `{type: contentItem, case or link, id?, url?}` | anyone who can see the item | opens a new tab: the Trail OS Content Item or Case page, or a saved https link from that item's own fields |
| `assignVolunteer` | `{itemId, contactId or null, caseId or null}` | staff | refuses when `caseId` is null; otherwise `saveCaseVolunteerAssignment` on that Case. For a series video that is the series Case, so it changes the volunteer for the whole series |
| `setStatus` | `{itemId, status, version}` | staff: any status. The item's volunteer: Not Started → In Progress → Ready for Review only | updates `Status__c` |
| `saveRecording` | `{itemId, url, version}` | staff or the item's volunteer | https only; sets `Raw_Recording_Location__c`, clears the recording review, moves Not Started to In Progress, and posts it for review in the #ttcontentcreation Slack channel |
| `approveScript` | `{itemId, version}` | staff | refuses unless Penny Script Status is In Review; sets it to Approved with Approved By and Approved Date |
| `returnScript` | `{itemId, note, version}` | staff | sets Penny Script Status to Draft and adds the note as a Case comment |
| `approveFinal` | `{itemId, checks, version}` | staff | `checks` must equal all five `FINAL_QA_CHECKS`; refuses unless Status is Ready for Review; sets Ready to Publish and adds the checks as a Case comment |
| `returnFinal` | `{itemId, note, version}` | staff | sets Status back to In Progress and adds the note as a Case comment |
| `recordPublished` | `{itemId, platform: YouTube, url, version}` | staff | refuses unless Status is Ready to Publish; creates a Published Content\_Item\_Publication\_\_c with today's date and the URL, then sets Status to Published, sets the video link on the item's Trail OS learner-task article, and warns if no Video Lesson activity links to the item |
| `confirmPublication` | `{publicationId, outcome: published or reschedule, plannedDate?}` | staff | `published`: Status Published, Date Published = its own date if set, else today. `reschedule`: new Planned Publication Date |
| `requestItem` | `{itemId}` | a volunteer, for an item in production with no volunteer | saves `content-studio-request:<itemId>:<email>` in app\_settings; never assigns |
| `submitIdea` | `{title, topicId, format, summary}` | staff or any volunteer who can open the board | creates a ContentItem\_\_c with Status Idea through the existing contributor create path |
| reviewRecording | {itemId, outcome: Accepted, Pickup Required or Rebuild Required, note, version} | staff | refuses unless a recording is saved and not yet reviewed; a note is required for Pickup Required and Rebuild Required. Sets Recording\_Review\_\_c and Recording\_Review\_Note\_\_c, adds a Case comment, and replies in the item's Slack thread |

Only the volunteer named on the item's Case can run volunteer actions on it, and never while impersonating. Local-only controls never reach Trail OS: search, filters, views, the Final review ticks and the prompt copy.

## Open decisions

Four points still need Angela's answer. Each has a default so the build can start. Decided Nov 7: separate recording review with a Slack channel post, unlisted YouTube videos delivered through each week's activity and article, a new series Case, and the pilot Action Plans deleted.

1. **Slack channel.** Decided Nov 7: #ttcontentcreation (channel id C0CFM72R6RH). Trail OS keeps the id in app\_settings `content-studio:slack-channel`, set under Administration › Content Studio settings.
2. **Video Lesson activities.** Each video needs a Course Module Activity (Activity Type Video Lesson) in its week's module, linked to the Content Item. Default: the activities come from the program blueprint when the course modules are built, and the board flags a video at Final review that has none.
3. **Who sees the board.** Decided Nov 7: staff; Content Managers (a new Trail OS grant, below); the Volunteer Assigned on an open series Case; and anyone with an active Content Contributor grant. Content Manager mirrors Knowledge Manager: a revision-checked local grant (app\_settings content-manager:\<email>) that staff add, remove and restore under Content Studio › Content Managers, limited to verified Volunteer-group members. It gives the full staff board, canAssign and the Publishing view. It does not give canApprove (recording, script and final reviews stay with staff) or canPublish, and it is separate from Knowledge Manager and Content Contributor access.
4. **Retiring the old Content Studio tabs.** The old Build With Me tab read the pilot Case and its Action Plans, which are gone, so it now shows no production data. Default: remove the old tabs when the board is made current.

## Checks before the board is made current

Board version 1 is `content-studio-board-v1.html`: 57,511 bytes, SHA-256 `c244e7ee9a99021f62a64df7413c898c3f54dbb9b671da633bd4d9af2cf906a6`. It was tested against sample data at 1440 px and 390 px wide, with no script errors.

- [ ] The two Recording Review fields exist and the FT27 items are linked to week Products
- [ ] Board version 1 uploads, previews and activates; restoring an earlier version works
- [ ] The board loads in under 3 seconds with every Content Item
- [ ] Changing the volunteer on any series video changes Volunteer Assigned on Case 00001289 and nothing else; no Case is created
- [ ] Signed in as Arnav, the board shows only his items; every staff action is refused on the server
- [ ] Arnav saves a recording link: the item moves to In Progress, the review clears, and one post appears in the Slack channel
- [ ] Needs pickups with a note sends station 2 back to Arnav, shows the note, and replies in the same Slack thread; his new link starts a new review
- [ ] After Claude step 1 sets Penny Script Status to In Review, Approve script sets Approved with Angela's name and the date
- [ ] Approve for publishing is refused unless all five checks are sent and Status is Ready for Review
- [ ] Record as published creates a Published YouTube publication, sets the item Published and puts the link on the week's learner-task article; Content Location is unchanged
- [ ] A write against a stale `version` returns `stale` and changes nothing
- [ ] It went out and New date on a stale publication update only that publication

## Replit prompt

After the two Recording Review fields exist and the FT27 items are linked to week Products, paste this into Replit. Then upload `content-studio-board-v1.html` as an inactive board version and preview it before making it current.

```
Build the Content Studio board host, following the Knowledge Studio board pattern exactly (routes/knowledgeStudioBoards.ts, lib/trailCrewBoardResource.ts, KnowledgeStudioBoard.tsx). Do not read or write Labs Action Plans, and do not use BUILD_WITH_ME_PILOT: Case 00001173 is closed and its Action Plans are deleted.

1. Board versions. export const contentStudioResource = createBoardResource("content-studio-board:main", "/objects/content-studio-boards/", "Content Studio"). Admin routes under /admin/content-studio-boards for list, upload, preview and activate, same guards as Knowledge Studio. Show it in Administration > Board versions next to the Knowledge Studio. New Administration > Content Studio settings with one field: the Slack channel (app_settings content-studio:slack-channel), seeded with C0CFM72R6RH (#ttcontentcreation).

2. Page. New route /content/studio (nav: Penny > Create > Content Studio). Access: staff, plus the Volunteer_Assigned__c Contact on an open series Case, plus active Content Managers (step 7), plus anyone with an active Content Contributor grant. Load GET /content/studio/html into <iframe sandbox="allow-scripts">, same CSP as the Knowledge Studio. Bridge: accept {type:"ready", board:"content-studio", boardVersion:1, contractVersion:1}; send {type:"data", data}; accept {type:"action", id, name, payload}; reply {type:"result", id, ok, code?, message?}, then re-send data. 20-second action timeout. openRecord opens a new tab (window.open, noopener): contentItem -> the Trail OS Content Item page, case -> the Trail OS Case page, link -> the URL only if it is https and equals one of that item's saved link fields or publication URLs. Never navigate the current tab.

3. Data. GET /content/studio/data builds ContentStudioData live on every request, exactly as the spec's Data contract v1. Series: the open Case (IsClosed = false) whose ProductId is the Foundations Trail – Build With Me Product (ProductCode FT-BWM-Series); its week Products (Parent_Product__c = that ProductId); their Product_Content_Item__c rows. Each linked item gets case = {id, caseNumber, subject, scope: "series", volunteer}. Items: one SOQL for ContentItem__c (Name, Title__c, Status__c, Format__c, ContentTopic__c and its Title__c, Content_Pillars__c, Primary_Objective__c, Due_Date__c, Summary__c, Length__c, LastModifiedDate, Raw_Recording_Location__c, Recording_Review__c, Recording_Review_Note__c, Content_Location__c, Penny_Script_Status__c, Penny_Narration_Location__c, Penny_Narration_Script_Hash__c, Thumbnail_Design_Location__c, Descript_Project_URL__c) with a Content_Item_Publications__r subquery and a Course_Module_Activities__r subquery (Id, Name, Course_Module__r.Name); ContentTopics__c. volunteers = listCaseContactAssignees filtered to Volunteer Contacts (cache 10 minutes). For a volunteer viewer, send only items whose series Case names their Contact, plus openItems; never send volunteers or requests. hasNarrationHash is a boolean; never send the hash, Content_Details__c or Penny_Script__c.

4. Actions. POST /content/studio/actions (requireAuth + sameOrigin, refuse while impersonating), Zod discriminated union on name: openRecord, assignVolunteer, setStatus, saveRecording, reviewRecording, approveScript, returnScript, approveFinal, returnFinal, recordPublished, confirmPublication, requestItem, submitIdea. Payloads, permissions and behavior exactly as the spec's Actions table. Every ContentItem__c write uses ConnectorSalesforceClient.updateRecordIfUnmodified with the payload's version; return code stale on a mismatch. assignVolunteer never creates a Case: it requires the item's series Case and calls saveCaseVolunteerAssignment on it. Case comments from reviewRecording, returnScript, returnFinal and approveFinal go on the series Case, starting with the video code. approveFinal requires exactly FINAL_QA_CHECKS. recordPublished accepts only a youtube.com or youtu.be URL; after the Salesforce writes it sets recordingUrl on the Trail OS learner-task article whose salesforceContentItem is this item (as a draft revision if that article is published). Log every action in a new content_studio_action_log table (actor, name, payload, result, time).

5. Slack. Use the existing Trail OS Slack bot. saveRecording posts one message to the configured channel: "Recording ready for review: <video code> | <title>", who recorded it, and a button that opens the item in Trail OS. Store the message ts in app_settings content-studio-slack-thread:<itemId>. reviewRecording replies in that thread with the outcome and note. A failed Slack post never fails the save; add a notice to the board data instead. No other Slack messages in version 1.

6. Remove the old Content Studio tabs when the board is made current.

7. Content Manager permission. Copy the Knowledge Manager grant exactly (lib/knowledgeWorkspaceAccess.ts, GrantsView.tsx, the grants routes in routes/knowledgeWorkspace.ts) as a separate grant: app_settings key prefix content-manager:, value {email, active, revision, updatedBy, updatedAt}. New lib/contentWorkspaceAccess.ts with contentAccess(req) returning manager, canManage (staff or manager), canPublish (staff only). GET and PUT /api/content/workspace/grants, staffOnly, same revision check, same Volunteer-group eligibility, audited as content_manager_grant; revoking sets active false. UI: a Content Managers tab on the Content Studio page for staff (Add, Remove access, Restore access). Board viewer for a nonstaff Content Manager: isStaff false, isManager true, canAssign true, canApprove false, canPublish false; send the full staff data (volunteers, requests, all items); the board shows staff tabs when isStaff or isManager is true and hides approve and publish controls from the can* flags. Actions allowed for a manager: openRecord, assignVolunteer, setStatus (not to Published), requestItem, submitIdea; refuse reviewRecording, approveScript, returnScript, approveFinal, returnFinal, recordPublished and confirmPublication with code forbidden. A Knowledge Manager grant gives no Content access and a Content Manager grant gives no Knowledge access. Recheck the grant on every request; refuse while impersonating. Tests: grant add/remove/restore, stale revision, non-Volunteer refused, manager board flags, each refused action, revoked grant loses access on the next request.

Test with the checks list in the spec, then tell me the upload screen is ready.
```
