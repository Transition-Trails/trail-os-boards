# Program Studio Board — Replit Spec (Phase 1: Programs and Cohorts)

Nov 8, 2026 · @Angela Landrith

## Summary

Build a **Program Studio** board in Trail OS: an uploadable HTML board, on the same pattern as Knowledge Studio, where staff and program managers plan, open and run **programs and their cohorts**, and propose new programs. Phase 1 covers programs and cohorts only.

Decisions made on November 8, 2026:

- **Phase 1 scope:** programs and cohorts. Courses, modules, activities, enrollments and learner progress come in later phases.
- **Users:** staff and program managers. Coaches and volunteer contributors are not users in Phase 1.
- **One workspace:** this board becomes the main program workspace. It replaces the current Program Hub and the Curriculum program and cohort pages once it is verified; those pages stay until then.
- **Changes go through approval:** a create or edit is saved as a Trail OS draft, approved by someone other than its author, then delivered to Salesforce automatically. Salesforce stays the system of record.

Same bridge, contract style and safeguards as Knowledge Studio: Trail OS supplies the data and runs named actions, the board never talks to Salesforce, every change is version-checked, and each new board version is uploaded inactive, previewed and activated explicitly.

## What exists today

The Salesforce model and much of the Trail OS screens already exist; Phase 1 is a single board over them, not a new data model.

**Salesforce (Production, checked November 8, 2026)**

| Object | Role | Records today |
| --- | --- | --- |
| `pmdm__Program__c` | Program | 10: Foundations Trail and Guided Trail Active; Explorers' Trail Planned; Nonprofit Digital Compass and Trail of Mastery In Discovery; 5 Canceled |
| `pmdm__ProgramCohort__c` | Cohort of a program | 10, for example GT 2027 01 (Planned, Jan 31 to Apr 25, 2027, capacity 12) and FT 2026 Beta 01 (Active) |
| `pmdm__ProgramEngagement__c` | A person in a program/cohort | Stages: Applied, Ready for Interview, Waitlisted, Enrolled, Active, Completed, Withdrawn, Application Denied |
| `Program_Course__c`, `Course__c`, `Course_Module__c`, `Course_Module_Activity__c` | Course structure | 26 courses; read-only in Phase 1 |

Program fields used in Phase 1: Name, Status, Short Summary, Description, Start/End Date, Program Issue Area, Program Manager, Owner, Target Population, Program Target Audience, Problem Statement, Program Goals, Program Expected Outcomes, Program Structure, Implementation Plan, Success Metrics & Evaluation Plan, Risks & Assumptions, Budget & Resources (`Budget_Resouces__c`), Funding Strategy, Partnership Opportunities, Requires Payment, Product, Google Drive Folder, Canva Folder, Reference Link.

Cohort fields used in Phase 1: Name, Program, Status, Start/End Date, Cohort Capacity, Coach (Contact), Description, Record Type.

**Trail OS (Replit)**

- Program Hub: `pages/program/` (ProgramHub, ProgramWorkspace, ProgramOverview, ProgramStructureView, ProgramRecordEditors, ProgramContributorManage, ConnectedLearningTab).
- Curriculum: `pages/curriculum/`, about 30 pages; Phase 1 overlaps CurriculumPrograms, CurriculumCohorts and ProgramBlueprint.
- Knowledge articles already describe the process: Propose a new program, What a program proposal must define, Plan an approved program, Program entrance criteria, Who can register for a program, Review a program application, Program engagement stages.

## Phase 1 board

The board has a left rail of views, a list in the middle and the selected program or cohort in a panel, with the same focus mode, phone layout and compact header as Knowledge Studio.

**Views**

| View | Shows |
| --- | --- |
| Overview | Programs by status, cohorts starting in the next 90 days, open seats, items waiting for approval, and records with problems (missing manager, no dates, sync needs attention) |
| Programs | All programs; filter by status, issue area and manager |
| Cohorts | All cohorts with program, dates, status, capacity, enrolled count and coach; filter by program and status |
| Calendar | Cohort start and end dates on a month or quarter timeline |
| Proposals | Programs In Discovery and new program drafts, with their proposal completeness |
| Waiting for approval | Program and cohort drafts sent for approval |
| My work | Programs I manage, drafts I wrote, approvals assigned to me |

**Program panel tabs:** Overview (status, dates, manager, summary, cohorts), Plan (problem statement, goals, outcomes, structure, implementation plan, success metrics, risks), Resources (budget, funding strategy, partnerships, payment and product, Drive and Canva folders, reference link), Cohorts, Courses (read-only list from `Program_Course__c`), Approval, Sync.

**Cohort panel tabs:** Details (dates, status, capacity, coach, description), Roster (read-only engagement counts by stage, for capacity), Approval, Sync.

**What staff can do**

- Propose a new program; the proposal form follows “What a program proposal must define” and shows which sections are still empty.
- Edit a program or cohort as a draft, send it for approval, and see what changed compared with Salesforce.
- Add a cohort to a program, or copy an earlier cohort with new dates.
- Change status through allowed transitions only (next section).
- Open the Salesforce record, the Drive folder or the Canva folder.
- Nothing in Phase 1 adds, moves or removes a person from a program or cohort.

## Program lifecycle and approval

Every create, edit or status change is a Trail OS draft until a different staff member approves it; only then does Trail OS deliver it to Salesforce.

&#91;embedded content: change approval flow and program status\]

- **Draft:** saved in Trail OS, invisible to Salesforce, editable by its author and program staff.
- **Sent for approval:** locked. The approver sees what changed compared with the current Salesforce record.
- **Approval is independent:** the author cannot approve their own draft. A superadmin can approve without the independent review, with a reason, recorded the same way as Knowledge Studio's “Approve now”.
- **Returned with changes:** the approver's note shows on the draft; the author edits and sends it again.
- **Delivered:** after approval, Trail OS writes the change to Salesforce automatically and reads it back to verify. Failures show as shared guidance with one next step, like Knowledge Studio.
- **Status moves:** In Discovery to Planned needs a complete proposal; Planned to Active needs a start date and a program manager; Active to Completed needs an end date. Any status before Completed can move to Canceled with a reason. A cohort cannot be Active unless its program is Active.
- Records are never deleted from the board; Canceled replaces deletion.

## Data contract

The board identifies itself as `board: "program-studio"`, `boardVersion: 1`, `contractVersion: 1`, and uses the same message bridge as Knowledge Studio (`ready`, `data`, `action`, `result`, `actionPending`).

```ts
type ProgramStudioData = {
  contractVersion: 1;
  asOf: string;                       // ISO time the data was built
  viewer: { email: string; name: string; isStaff: boolean; isManager: boolean;
            canPropose: boolean; canEdit: boolean; canApprove: boolean; canSkipReview: boolean };
  lists: { programStatus: string[]; cohortStatus: string[]; issueAreas: string[];
           engagementStages: string[]; managers: {id: string; name: string; email: string}[];
           coaches: {id: string; name: string}[] };
  programs: Program[];
  cohorts: Cohort[];
  scheduler?: { running: boolean; lastRunAt: string | null };
};

type Program = {
  id: string;                          // Trail OS id
  salesforceId: string | null;         // pmdm__Program__c Id; null for an unsent new program
  editVersion: string;                 // optimistic-lock token for saves
  fields: Record<string, string | number | boolean | null>;   // live Salesforce values, keyed as in “What exists today”
  draft: { id: string; fields: Record<string, unknown>; status: "draft" | "awaiting_approval" | "returned";
           author: string; updatedAt: string; note?: string } | null;
  changes: { field: string; from: unknown; to: unknown }[];   // draft vs live
  proposalCompleteness: { done: number; total: number; missing: string[] };
  cohortIds: string[];
  courses: { id: string; name: string }[];                  // read-only
  perms: { edit: boolean; submit: boolean; approve: boolean; changeStatus: string[] };
  workflow: { approval: Fact; delivery: Fact; guidance: Guidance };   // same shapes as Knowledge Studio
  issues: { code: string; severity: "block" | "warn"; text: string }[];
};

type Cohort = {
  id: string; salesforceId: string | null; programId: string; editVersion: string;
  fields: Record<string, string | number | boolean | null>;
  draft: Program["draft"]; changes: Program["changes"];
  roster: { stage: string; count: number }[];                // read-only counts from pmdm__ProgramEngagement__c
  seatsOpen: number | null;                                  // capacity minus Enrolled + Active
  perms: Program["perms"]; workflow: Program["workflow"]; issues: Program["issues"];
};
```

- `lists` values come from Salesforce describe calls, cached; the board never hard-codes picklist values.
- `perms.changeStatus` lists only the status moves this viewer may request for this record right now.
- Missing data shows “Not confirmed” on the board, never a guess.

## Board actions and Salesforce delivery

The host allows only these named actions; the server checks permissions and versions on every one, whatever the board shows.

| Action | Payload | Who |
| --- | --- | --- |
| `proposeProgram` | `{requestId, name, shortSummary, issueArea?, managerId?}` | `canPropose` |
| `saveProgramDraft` | `{programId, editVersion, fields}` | `perms.edit` |
| `saveCohortDraft` | `{cohortId, editVersion, fields}` | `perms.edit` |
| `createCohort` | `{requestId, programId, copyFromCohortId?, fields}` | `perms.edit` on the program |
| `requestStatusChange` | `{recordType: "program" or "cohort", id, editVersion, toStatus, reason?}` | `toStatus` in `perms.changeStatus` |
| `submitForApproval` | `{recordType, id, editVersion}` | `perms.submit` |
| `approveChange` | `{recordType, id, draftId, note?}` | `perms.approve`; never the draft's author |
| `returnChange` | `{recordType, id, draftId, note}` (10+ characters) | `perms.approve` |
| `approveNow` | `{recordType, id, draftId, note, confirmed: true}` | `canSkipReview` only; recorded |
| `discardDraft` | `{recordType, id, draftId}` | draft author or staff |
| `retryDelivery` | `{recordType, id}` | staff; only when guidance offers it |
| `checkSalesforce` | `{recordType, id}` | read-only, any user |
| `openRecord` | `{type: "salesforce" or "drive" or "canva", id}` | any user |

**Delivery rules**

1. Only approved drafts are delivered, by a scheduled worker, with the same retry, heartbeat and guidance behavior as Knowledge delivery.
2. Before writing, the worker compares the record's `SystemModstamp` with the value the draft was based on. If Salesforce changed in between, it stops, shows both versions and asks for reconciliation; it never overwrites.
3. Writes only the fields in the draft's `changes`. New programs and cohorts are inserted; nothing is deleted.
4. After writing, it reads the record back and marks delivery verified only when every changed field matches.
5. Picklist, lookup and required-field errors come back as field corrections on the draft, as Knowledge Studio does today.
6. Engagement records are never written in Phase 1.

## Host, versions and retiring the old pages

Reuse the Knowledge Studio host pattern so board versions are managed the same way.

- **New page:** Program Studio in Trail OS navigation, staff and program managers only, with Refresh data in the header.
- **Board versions:** Administration → Program Studio Boards, to upload, preview, activate and roll back HTML versions. Uploading never activates; preview disables write actions (`preview_only`), as Knowledge Studio does.
- **Sandbox:** the iframe uses `sandbox="allow-scripts"` with no forms or external scripts.
- **Starter board:** Claude builds board version 1 from this contract once the backend is ready; Replit does not need to build the board UI.
- **Retiring old pages:** Program Hub and the Curriculum Programs, Cohorts and Program Blueprint pages stay unchanged until Angela confirms the board covers them. Then Replit adds a link from each old page to the board, and removes them in a later release.

## Guardrails, acceptance criteria and open questions

**Guardrails**

- No record is deleted; no person is enrolled, moved or withdrawn; no course structure changes in Phase 1.
- No one approves their own change. Approve-now is superadmin-only, needs a reason and is recorded.
- A Salesforce change made outside Trail OS is never overwritten without reconciliation.
- Existing Program Hub and Curriculum pages keep working until they are retired.

**Acceptance criteria**

- [ ] Studio data lists all 10 programs and 10 cohorts with live Salesforce values and correct engagement counts.
- [ ] A program manager proposes a new program; it appears as an In Discovery draft and is not in Salesforce.
- [ ] Editing a program saves a draft; the live Salesforce values are unchanged until approval and delivery.
- [ ] The draft's author cannot approve it; another staff member can approve or return it with a note.
- [ ] After approval, the worker writes only the changed fields, reads them back and marks delivery verified.
- [ ] A record changed in Salesforce after the draft started stops delivery with a reconciliation message.
- [ ] Status moves outside the allowed transitions are refused by the server, even if the board sends them.
- [ ] A cohort cannot become Active while its program is not Active.
- [ ] Copying a cohort creates a new draft with blank dates and no engagements.
- [ ] Preview mode returns `preview_only` for every write action.
- [ ] Tests cover permissions, version conflicts, status transitions, delivery verification and the approval rules.

**Open questions for Angela**

1. Who can approve program and cohort changes: all staff, or named program approvers?
2. Should program managers who are not staff be able to propose new programs?
3. The status picklists didn't come back through the API; Replit should confirm the full Program and Cohort status values (seen in data: In Discovery, Planned, Active, Completed, Canceled).
4. Should a cohort's capacity block anything, or only show a warning when enrolled exceeds capacity?

## Later phases

Each later phase extends the same board and contract, with its own approval rules, after Phase 1 is verified.

| Phase | Adds | Salesforce objects |
| --- | --- | --- |
| 2. Courses | Build and maintain courses, modules and activities; link skills and Knowledge articles; attach courses to programs | `Course__c`, `Course_Module__c`, `Course_Module_Activity__c`, `Program_Course__c`, `Course_Skill__c`, `Course_Module_Skill__c`, `Module_Knowledge__c` |
| 3. Enrollment and progress | Applications through engagement stages, waitlist, cohort assignment, course enrollments and completion tracking | `pmdm__ProgramEngagement__c`, `Course_Enrollment__c`, `Learner_Course_Module__c`, `Learner_Course_Module_Activity__c`, `Course_Activity_Completion__c` |
| 4. Retire old pages | Remove Program Hub and the remaining Curriculum pages once the board covers them | none |

Coaches and volunteer content contributors can be added as users in Phase 2 or 3, with narrower permissions.
