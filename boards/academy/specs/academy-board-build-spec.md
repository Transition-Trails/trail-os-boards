# Academy Board: Trail OS Build Spec

Oct 30, 2026 · @Angela Landrith

## Purpose and scope

The Academy Board shows program managers and the Salesforce admins who support them what the Foundations Trail and Guided Trail still need before the January 31, 2027 cohorts start. It turns the program, course, module and skill tables into a short set of metrics, so nobody has to understand the database to see where help is needed.

- **Who uses it:** program managers who build courses and weeks, and admins who fix setup and data problems.
- **Programs in scope:** The Foundations Trail and The Guided Trail only. Explorers' Trail, Trail of Mastery and Nonprofit Digital Compass are left out until they have a launch date.
- **Courses in scope:** every course linked to those two programs. The board opens on the two January launch courses, The Foundations Trail: Trailhead Pantry Dallas (2027) and The Guided Trail: Trailhead Pantry Dallas (2027). A switch adds the other linked courses (the live Foundations Trail, RESOLVE, Agile Foundations, Learner Onboarding).
- **Read-only:** the board never writes. People make every change on the record's page in Trail OS, which the board opens for them.
- **Like the Trail Crew Board:** one self-contained page inside Trail OS, the same look and the same message contract, with live Salesforce data each time it opens and no schedule.

## How it works

The board opens on one screen of metrics. People only see records after they choose a metric, so nobody faces a wall of data.

1. **Dashboard.** A countdown to January 31, a readiness bar for each course in scope, then 12 metric tiles in three groups: Course content, Activities and skills, Learners and setup. Each tile shows one number, what it is out of, a small bar, and who usually acts on it (program managers or admins). Green means done; amber and red mean work is waiting.
2. **Scope switches.** Program: Both, Foundations Trail or Guided Trail. Courses: January launch (default) or All linked courses. Every tile recalculates when a switch changes.
3. **Drill-down.** Selecting a tile replaces the dashboard with that metric's records: what the metric means, how to fix it, a course filter, and a table of 15 rows per page. "All metrics" and the browser's Back button return to the dashboard.
4. **Week detail.** Selecting a week row opens a side panel with the six required parts, the optional parts, linked skills and every activity with what it is missing. Nothing in the panel can be edited.
5. **Act in Trail OS.** Each row has an Open button (Open week, Open activity, Open skill, Open cohort), and the week panel adds "Add an activity". These send Trail OS a navigation message, and Trail OS opens its own page for the record. The board never links to Salesforce.

A single click or tap opens a metric. A double click won't work well on phones and tablets, where a double tap zooms the page.

## The metric components

Each tile is one definition: a count, what it is out of, and the records behind it. The numbers below are from the October 30 snapshot, January launch courses, both programs.

A week is **ready** when it has all six required parts: Mission Brief, Core Concepts, Reflection Prompt, Penny Context, at least one activity and at least one linked skill. Trail Talk Prompts, Trail Tools, a quest and a RESOLVE phase are nice to have and never count against readiness.

| Group | Metric | Counts | Out of | Today | Drill-down columns | Open action |
| --- | --- | --- | --- | --- | --- | --- |
| Course content | Weeks ready to teach | Course\_Module\_\_c with all six required parts | Weeks in scope | 0 of 26 | Week, Course, Missing parts | Open week |
| Course content | Weeks without Penny's coaching notes | Penny\_Context\_\_c blank | Weeks in scope | 26 of 26 | Week, Course, Missing | Open week |
| Course content | Weeks without a reflection prompt | Reflection\_Prompt\_\_c blank | Weeks in scope | 26 of 26 | Week, Course, Missing | Open week |
| Course content | Weeks with no activities | No Course\_Module\_Activity\_\_c children | Weeks in scope | 0 of 26 | Week, Course, Missing | Open week |
| Course content | Weeks with no skills linked | No Course\_Module\_Skill\_\_c rows | Weeks in scope | 0 of 26 | Week, Course, Missing | Open week |
| Course content | Weeks without a mission brief or core concepts | Mission\_Brief\_\_c or Core\_Concepts\_\_c blank | Weeks in scope | 0 of 26 | Week, Course, Missing | Open week |
| Activities and skills | Activities missing details | Description, Activity\_Type\_\_c or Estimated\_Minutes\_\_c blank | Activities in scope | 28 of 212 | Activity, Week, Needs | Open activity |
| Activities and skills | Quest activities with no skill tag | Quest\_Eligible\_\_c true and SF\_Skill\_Tag\_\_c blank | Quest-eligible activities | 11 of 77 | Activity, Week, Needs | Open activity |
| Activities and skills | Skill questions with no explanation | SkillQuestion\_\_c with both explanation fields blank, for skills linked to a course in scope | All questions on those skills | 38 of 70 | Skill, Questions, No explanation | Open skill |
| Learners and setup | Learners enrolled in a course | Course\_Enrollment\_\_c records | Program engagements in current cohorts, waitlist left out | 0 of 2 | Cohort, Status, Starts, Learners / capacity, Enrolled | Open cohort |
| Learners and setup | Launch blockers | Data-health rules marked high | – | 3 | Finding, What to change | None |
| Learners and setup | Other data fixes | Data-health rules marked medium or low | – | 12 | Finding, What to change | None |

**Waitlist tiles (parked).** Waitlist metrics come later, once the waitlist lead process is settled. The board already hides the Waitlist group when the payload has no `waitlist` key, so adding them back needs only the data.

Tile colour: a "good" metric (weeks ready, learners enrolled) is green only when the count reaches its total. A gap metric is green at 0, red above 40% of its total or for any launch blocker, and amber in between.

The data-health rules are listed in the Data section. For phase 1 they can be fixed checks in code. Later they can move to a Trail OS settings table that admins maintain.

## Data

Trail OS reads Salesforce each time someone opens the board, builds one payload and sends it to the page. There is no schedule, no cache to refresh and no copy of the data stored in the board.

**Scope.** Trail OS starts from a list of program IDs in its settings: The Foundations Trail (a2yan000000VedtAAC) and The Guided Trail (a2yan0000007p7RAAQ). Adding a program later means adding its ID, not changing the board. It also stores the launch date (2027-01-31) and the January launch course IDs (a34an000006l2pJAAQ, a34an000006l2qvAAA).

| Object | What the board uses | Filter |
| --- | --- | --- |
| pmdm\_\_Program\_\_c | Name, status, manager, summary fields | ID in the scope list |
| pmdm\_\_ProgramCohort\_\_c | Name, status, start and end dates, capacity | Program in scope |
| pmdm\_\_ProgramEngagement\_\_c | Count by cohort and stage (aggregate only) | Cohort in scope |
| Program\_Course\_\_c | Course, link status | Program in scope |
| Course\_\_c | Title, code, status, approval status | Linked by Program\_Course\_\_c |
| Course\_Module\_\_c | Name, order, status, RESOLVE phase, and whether each long-text part is filled | Course in scope |
| Course\_Module\_Activity\_\_c | Name, order, type, status, minutes, points, quest eligible, skill tag, whether a description exists | Module in scope |
| Course\_Module\_Skill\_\_c, Skill\_\_c | Skill name, category, links to modules | Module in scope |
| SkillQuestion\_\_c | Level, whether an explanation exists (counts only) | Skill linked to a course in scope |
| Course\_Enrollment\_\_c | Count only | Course in scope |
| Penny\_Trail\_Config\_\_c | Role, tone, active, learner count | Trail ID of a program in scope |

**Send flags, not text.** For long-text fields the payload carries true or false (filled or blank), not the text itself. That keeps the payload small (about 110 KB today) and keeps course content out of the board.

**People data stays aggregate.** The payload has counts by cohort and stage, never learner names, emails or Contact IDs.

**Course links.** Program\_Course\_\_c is the relationship between programs and courses. The board reads only Program\_Course\_\_c and ignores the Course → Program field.

**Waitlist.** The WAITLISTED cohort on the Guided Trail is the program waitlist, which is live now. The cohort drill-down labels it Waitlist, and its applicants are not counted in "Learners enrolled in a course".

**Data-health rules for phase 1.**

- High: a program in scope has no Program Course set to Active; the Active course has weeks with no activities while learners are active; Course Enrollment has 0 records while learners are engaged.
- Medium: content items with no link to a module or activity; no Module Knowledge records; Penny Context empty on most weeks; skill questions with no explanation; a cohort over capacity.
- Low: Penny configs for few learners; the interaction log Source value "TRAIL OS" is not on the picklist; no Penny Capability or Penny Prompt records; assessments not linked to modules; RESOLVE phase blank outside the RESOLVE course; Required or Optional only in the activity name; module order gaps or duplicates.

## Integration contract

The board is one self-contained HTML file that Trail OS loads in a sandboxed iframe. It makes no network calls. It talks to Trail OS only through `postMessage`, contract `AcademyBoard`, version 2. Until Trail OS sends data, the board shows the snapshot built into the file and labels it "Snapshot". Once data arrives, the label changes to "Live from Salesforce".

| Direction | Message | When |
| --- | --- | --- |
| Board → Trail OS | `{type:"ready", contract:"AcademyBoard", version:2}` | Page loaded |
| Trail OS → Board | `{type:"data", contract:"AcademyBoard", payload: AcademyData}` | After ready, and again on refresh |
| Board → Trail OS | `{type:"action", contract:"AcademyBoard", name:"open_record", objectType, id}` | An Open button |
| Board → Trail OS | `{type:"action", contract:"AcademyBoard", name:"new_record", objectType, parentId}` | Add an activity |
| Trail OS → Board | `{type:"action_result", contract:"AcademyBoard", ok, message}` | Optional: shown as a short notice |

**Navigation only.** Trail OS maps each `objectType` and `id` to its own page and opens it. The board never builds a URL and never writes. Object types it sends: pmdm\_\_ProgramCohort\_\_c, Course\_Module\_\_c, Course\_Module\_Activity\_\_c, Skill\_\_c, and pmdm\_\_Program\_\_c and Course\_\_c for later use. For `new_record`, Trail OS opens its new-activity form with the week (`parentId`) filled in. Trail OS checks the person's permission before opening anything.

**Payload.**

```
AcademyData = {
  contract, contractVersion: 2, asOf,          // asOf: ISO time of the Salesforce read
  launch:   {date, courseIds[]},
  checks:   [{key, label, where, required}],   // the six required parts + four optional
  programs: [{id, name, short, status, manager, summary,
              has{summary, goals, outcomes, audience}, pennyTrail,
              courses: [[courseId, linkStatus]],
              cohorts: [{id, name, status, start, end, capacity, engaged, byStage}]}],
  courses:  [{id, code, title, status, approval, moduleIds[]}],
  modules:  [{id, name, courseId, order, status, resolve, skillCount,
              checks{missionBrief, coreConcepts, reflectionPrompt, pennyContext, activities, skills,
                     trailTalkPrompts, trailTools, quest, resolve},
              activities: [{id, name, order, type, status, desc, mins, points, quest, tag, required}]}],
  skills:   [{id, name, code, category, phase, questions, byLevel{}, noExplanation, courseIds[], moduleIds[]}],
  pennyConfigs: [{trailId, role, tone, active, contacts}],
  pennyUse, progress: {enrollments, engagements},
  waitlist?: {object: "Lead", recordType: "TTA Lead", total, open, converted, last7, last30, latest,
            byMonth: [{month, n}], byStatus: [{label, n}], bySource: [{label, n}]},
  health:   [{severity: "high"|"medium"|"low", area, title, detail}]
}
```

Version 2 drops `recordUrl` and the out-of-scope programs and archived courses that version 1 carried. It adds `launch`, waitlist and cohort `id`.

## Permissions, acceptance and phases

**Who sees it.** Staff, program managers and admins in Trail OS. Learners and volunteers outside Team Academy do not. Because the board shows only counts and flags, no extra field-level rules are needed. Trail OS still checks permission before it opens any record.

**Acceptance criteria.**

- [ ] Opening the board in Trail OS sends live data within 5 seconds, and the header reads "Live from Salesforce" with the read time in CDT.
- [ ] Every tile count matches a SOQL check on the same scope (spot-check: 26 weeks, 77 quest activities, 38 of 70 questions, 0 enrollments).
- [ ] Both scope switches recalculate every tile and course bar.
- [ ] Every tile opens its drill-down; All metrics and the browser Back button return to the dashboard.
- [ ] Every Open button and Add an activity open the right Trail OS page; nothing links to Salesforce.
- [ ] No learner names, emails or Contact IDs appear in the payload.
- [ ] Works at phone width with no sideways scrolling, in light and dark themes, and by keyboard.

**Phases.**

1. **January launch (now):** this board for the Foundations Trail and Guided Trail, the 12 metrics, fixed data-health rules, open\_record and new\_record.
2. **After launch:** learner progress metrics once Course Enrollment and the Learner\* objects have records (week completion by cohort, stuck learners as counts), and Trail Quest submission counts.
3. **More programs:** add Explorers' Trail and the Mastery trails by adding their IDs to the scope list; move the data-health rules to a settings table admins maintain.

**Open questions.**

- Should the live Foundations Trail course (Beta cohort) appear in the January view, or only under All linked courses?
- Does Trail OS have its own page for each object type the board sends, or do some open a parent page (for example, a skill question opening its skill)?
