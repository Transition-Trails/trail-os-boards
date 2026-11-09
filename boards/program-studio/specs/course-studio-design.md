# Course Studio: courses, modules and activities in Trail OS

Nov 8, 2026 · @Angela Landrith

## Summary

Add a **Courses** area to Program Studio where staff manage a shared course library, each course's outline of modules and activities, and which programs use it. Courses stand alone; a program picks courses through the existing Program Course link, so one course can serve several programs or none.

The proposal reuses what already works in Program Studio: edits are drafts in Trail OS, someone else approves them, and Trail OS delivers them to Salesforce and checks the result. Two things are new:

- **The course is the unit of approval.** One draft holds every change to the course, its modules and its activities, so a 126-activity course is reviewed once, not 126 times.
- **The outline is edited as a tree.** Modules and activities are added, reordered and edited in one screen, using the same full-width rich text editors as the program Plan tab.

Nothing in Salesforce needs to be rebuilt. The objects, fields and link table already exist; this design decides who edits what, and how changes reach learners safely.

**Decisions for Angela** (details in the last section):

1. One board: decided, Courses inside Program Studio.
2. Source of truth for activities: decided, Trail OS (Google Classroom is no longer used).
3. Changes to courses learners are taking: decided, allowed with a warning and a required note.
4. The old one-program lookup on Course: decided, retire it.

## What exists today in Salesforce

Production already holds 22 courses (13 Archived), about 445 activities, and a Program Course link table. Checked in TTProd on Nov 8, 2026.

| Object | Role | Fields Trail OS would edit | Status values |
| --- | --- | --- | --- |
| Course (`Course__c`) | The library entry; stands alone | Course ID (`Name`), Course Title, Overview, Learning Goals, Structure, Collaboration Channels, Artifacts List, Estimated Start and End Date, Google Drive, Canva and Reference links | Not Started, Discovery, In Progress, In Review, Completed, On Hold, Archived |
| Course Module (`Course_Module__c`) | A section of one course; required Course lookup | Name, Order, Mission Brief, Core Concepts, Trail Tools, Reflection Prompt, Trail Talk Prompts, Printables, Penny Context, RESOLVE phase, links | Not Started, In Progress, Completed, On Hold, Cancelled |
| Course Module Activity (`Course_Module_Activity__c`) | One learner task in a module; required Module lookup | Name, Order, Activity Type (20 values), Description, Estimated Minutes, Points Possible, Quest Eligible, SF Skill Tag, links | Same as Module |
| Program Course (`Program_Course__c`) | Links a course to a program, many-to-many | Program, Course, Status, Status Comments | Planned, Active, Inactive, Deprecated |

Five facts shape the design:

- **Course status tracks the build, not availability.** "In Progress" means the content is being written. Whether a program offers the course lives on Program Course status, which already has the right values.
- **Courses are already reused and versioned by year.** RESOLVE Course is linked to both trails. The 2027 trails are new courses (`GuidedTrail2027`, `FoundationsTrail2027`) beside the archived originals, so "copy as a new version" is the common path.
- **Learner progress hangs off modules and activities.** Course Enrollment, Learner Course Module, Learner Course Module Activity and Course Activity Completion point at them, so a module or activity in use must never be deleted.
- **Some activities carry an old Google Classroom key.** `External_Activity_ID__c` is a Google Classroom WorkId left from earlier imports. Classroom is no longer used, so the field is legacy: Trail OS shows it read-only and never copies it.
- **An old one-program lookup remains.** Course has a `Program__c` lookup, set on 3 courses, all of which also have a Program Course link.

Related objects this design reads but doesn't edit in phase 1: Course Skill, Course Module Skill, Module Knowledge (links modules to Knowledge articles) and Assessment.

## Data model

The model already in Salesforce is the right one: courses stand alone, Program Course is the only link to programs, and order lives on modules and activities. No new objects are needed.

&#91;embedded content: course data model · existing Salesforce objects\]

Rules Trail OS enforces on top of it:

- A course can have zero, one or many Program Course links. Its own status says how far the build has got; each link's status says whether that program offers it.
- A module belongs to exactly one course and an activity to exactly one module. Reuse across courses happens by copying a course, not by sharing modules, so editing one course can never change another.
- Order is a number on each module and activity. Trail OS writes it in steps of 10 and shows position, never the raw number.
- Activities can move between modules of the same course; moving to another course is a copy.

**Schedule: relative dates (decided Nov 8, 2026).** Courses carry weeks, not dates; each cohort's start date turns them into a calendar. Fields to add:

| Object | New field | Type | Meaning |
| --- | --- | --- | --- |
| Program Course | `Start_Week__c` | Number | Program week this course begins (1 = cohort start week) |
| Course Module | `Start_Week__c`, `End_Week__c` | Number | Weeks of the course the module covers |
| Course Module Activity | `Week__c` | Number | Course week the activity is due or held |
| Course Module Activity | `Day__c` | Number, 1 to 7 | Day of that week (1 = the week's first day); blank = end of week |
| Service Session | `Program_Cohort__c`, `Course_Module_Activity__c` | Lookups | Ties a live session to the cohort and activity it delivers |

A date is computed as: cohort start + 7 × (Program Course start week − 1) + 7 × (activity week − 1) + (day − 1). Courses in a program list by their start week, modules and activities by week then day, with Order breaking ties. Moving a cohort's start date moves its whole calendar; nothing is retyped.

## Board design

Courses get their own view in the Program Studio rail and their own panel; the outline is edited as a tree with the selected module or activity open beside it.

**Rail views added:** Courses (library, archived hidden by default), Courses being built (status Discovery, In Progress or In Review), and course drafts in the existing Waiting for approval and My work views.

**Course list columns:** title and Course ID, status, programs using it (with link status), modules and activities count, active learners, approval and delivery.

**Course panel tabs:**

| Tab | Holds |
| --- | --- |
| Overview | Title, Course ID, status, Overview and Learning Goals (rich text), estimated build dates |
| Outline | Module and activity tree plus the editor for the selected item (sketch below) |
| Programs | Every Program Course link with its status and comments; link to another program |
| Resources | Structure, Collaboration Channels, Artifacts List, Drive, Canva and reference links |
| Penny | Per module: Penny Context and RESOLVE phase; per activity: Quest Eligible and SF Skill Tag (phase 3) |
| Approval | The draft as a tree diff: added, edited, moved, cancelled |
| Sync | Delivery status per step, retry, Check Salesforce |

&#91;embedded content: sketch of the course panel, Outline tab (example names)\]

In focus mode the tree and editor fill the screen, with the tree in the left column where the tabs sit today. Reordering works by drag and by Move up and Move down buttons, so it also works by keyboard and on a phone, where the tree and editor stack.

**From the program side**, the program's Courses tab stops being read-only: it lists linked courses with their link status, offers "Link a course" (search the library) and "Create course", and opens a course in its own panel.

## Workflow

Every change follows the Program Studio path: draft in Trail OS, independent approval, delivery to Salesforce, read-back check. What differs is the size of a draft and what may never happen to records learners depend on.

**One draft per course.** Course fields, new modules, new activities, edits, reordering and cancellations all collect in the course's single draft. The Approval tab shows the outline as a tree with each change marked: added, edited (field by field), moved, cancelled. The reviewer approves or returns the whole set. Program Course links are separate, small drafts on the program, because they change what a program offers, not the course content.

**Delivery order.** Trail OS writes the course first, then modules, then activities, then the new Order values (renumbered in steps of 10 so later inserts need no renumbering). If a step fails, delivery stops, shows which items landed, and retries from that point; nothing already written is written twice.

**Never delete, cancel instead.** Removing a module or activity sets its status to Cancelled and hides it. Only items added in the current draft and never delivered can be truly removed. Cancelling a module cancels its activities.

**Content in use gets a warning, not a block.** When a course is linked Active to a program with active learners, the draft shows "Used by N learners in M cohorts". The reviewer sees the same line, and cancelling or reordering an activity learners have already completed needs a note.

**New versions are copies.** "Copy as new version" creates a new course draft with every non-cancelled module and activity, status Not Started, links and Google Classroom IDs cleared, and no program links. The original stays as it is until someone archives it. This matches how the 2027 trails were made.

**Retiring.** A course is archived by status change (with a reason), and its program links move to Inactive or Deprecated. Archived courses and cancelled modules and activities are hidden unless the viewer ticks "Show archived and canceled", as on programs.

**Salesforce Approval Status.** Course already has `Approval_Status__c` (Pending, Approved). Proposed: Trail OS sets it to Approved when it delivers an approved draft, so Salesforce reports keep working; Trail OS stays the place approval happens.

## Contract additions for Replit

This extends the Program Studio contract to `contractVersion: 2`. The board keeps the same bridge, the same draft, approval, delivery and guidance facts, and the same refusal codes. Courses join the existing `recordType` values, so submit, approve, return, approve now, discard, retry and check work unchanged with `recordType: "course"`.

**Data added to `ProgramStudioData`.** The light list comes with every data message; the outline loads on demand, because the large trails carry 100+ activities with long rich text.

```
lists += { courseStatus[], moduleStatus[], activityTypes[], resolvePhases[], skillTags[], programCourseStatus[] }
courses: Course[]          // RecordCommon & { moduleCount, activityCount, programLinks:{programId, linkId, status}[], activeLearners:number|null }
programs[].courseLinks: { linkId, courseId, status, statusComments, draft|null }[]   // replaces read-only courses[]
```

**Outline, loaded with `loadCourseOutline {courseId}`** returns `data.outline`: modules in order, each with its fields, live values, draft values and activities in order. Every item carries `id`, `salesforceId|null`, `status`, `inDraft` (added, edited, moved, cancelled) and `learnerRecords` (count of progress records, so the board can warn).

**Actions (strict payloads, no extra keys):**

| Action | Payload | Notes |
| --- | --- | --- |
| `proposeCourse` | `{requestId, title, courseId, overview?}` | Creates a course draft with status Not Started; `courseId` = Salesforce `Name`, unique |
| `saveCourseDraft` | `{courseId, editVersion, fields?, ops?[]}` | `ops` edit the outline (next table); one save may carry both |
| `loadCourseOutline` | `{courseId}` | Read-only |
| `copyCourse` | `{requestId, fromCourseId, title, courseId}` | New course draft with copied outline; returns `data.id` |
| `linkCourse` | `{requestId, programId, courseId, status}` | Program Course draft on the program |
| `setCourseLinkStatus` | `{programId, linkId, editVersion, toStatus, comments?}` | Comments required for Inactive and Deprecated |

**Outline operations inside `saveCourseDraft.ops`.** New items use a board-made `tempId` until delivery assigns a Salesforce Id.

| Op | Shape |
| --- | --- |
| Add module | `{op:"addModule", tempId, afterId, fields}` (`afterId: null` = first) |
| Add activity | `{op:"addActivity", tempId, moduleId, afterId, fields}` |
| Edit | `{op:"edit", itemType, id, fields}` (changed fields only) |
| Move | `{op:"move", itemType, id, moduleId?, afterId}` (activities may move between modules of the same course) |
| Cancel | `{op:"cancel", itemType, id, reason?}` (reason required when `learnerRecords > 0`) |
| Remove unsent | `{op:"remove", itemType, tempId}` |

New refusal codes: `course_id_taken`, `item_in_use` (a remove on a delivered item), `cross_course_move`, `outline_stale` (the outline changed since it was loaded).

## Phasing and decisions

Three phases, each shipped as a board version you preview before activating.

| Phase | Delivers | Depends on |
| --- | --- | --- |
| 1. Library and links | Courses view, course panel (Overview, Resources, Programs, Approval, Sync), course field drafts, Program Course links and status from the program's Courses tab, outline shown read-only | Contract v2 data + `proposeCourse`, `linkCourse`, `setCourseLinkStatus` |
| 2. Outline editor | Module and activity editing, reorder, add, cancel; week and day on modules and activities, start week on Program Course; tree diff on Approval; staged delivery with read-back; learner-use warnings | `loadCourseOutline`, outline `ops`, `learnerRecords` counts |
| 3. Versions and Penny | Copy as new version (weeks copy; dates follow each cohort); cohort calendar computed from cohort start, with live sessions linked; Penny Context, RESOLVE phase, Quest Eligible and skill tags grouped on a Penny tab; Module Knowledge links to Knowledge Studio articles | `copyCourse`; a Module Knowledge action |

**Decisions needed**

1. **One board or two.** Decided Nov 8, 2026: one board, with Courses inside Program Studio. Programs pick courses, the bridge and approval are shared, and staff work in one place.
2. **Source of truth for activities.** Decided Nov 8, 2026: Trail OS owns the outline. Google Classroom is no longer used; Salesforce custom objects and Trail OS replaced it, so no import competes with Trail OS edits.
3. **Changes to courses learners are taking.** Decided Nov 8, 2026: allowed, with the "Used by N learners" warning and a required note for cancels and moves of completed items. No learners are affected right now.
4. **The old `Course.Program__c` lookup.** Decided Nov 8, 2026: retire it. Trail OS shows it read-only in phase 1 and never writes it; then you clear it and remove it from page layouts. The 3 courses using it already have Program Course links, so nothing is lost.
5. **Order of courses in a program.** Decided Nov 8, 2026: ordered by schedule, using relative dates. Courses, modules and activities carry weeks; each cohort's start date turns them into real dates, and live sessions are Service Sessions linked to the cohort and activity. Fields are listed under Data model.
6. **Status spelling.** Decided Nov 8, 2026: use "Cancelled". Modules and activities already do. Program and cohort status come from the managed Program Management package, whose value is "Canceled": change its label to "Cancelled" and keep the API value, so integrations keep working. The board treats both spellings as the same.
