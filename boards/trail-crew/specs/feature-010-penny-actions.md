# Feature-010: Penny acts in Trail OS, always visible

A separate feature for the Trail OS DevOps team (product owner Omar Cohen), split from the Team Board on Oct 28. Penny gets her first action in Trail OS, clearing a blocker, and every action she takes is recorded, announced and reversible. Until it ships, blockers are cleared by the coach, assistant coach or staff only. Case 1283, Ready for BA Review.

## How Penny's actions stay visible

- **Recorded as Penny.** Every Action API call carries an actor type, Person or Penny. Penny's writes are saved with actor Penny, never under a person's name, plus the reason she gave and the evidence (for example the Slack message or record that showed the blocker was resolved).
- **Shown on the record.** The board marks anything Penny changed with a Penny badge and her reason, on the card and in its history.
- **Announced in Slack.** Each action posts a short note in the team's channel, in that day's standup thread when there is one: “Penny cleared the blocker on Story-019: the change set was deployed to staging.”
- **Reviewable and reversible.** Staff get a Penny activity list (filter by team, date, action). Coaches and staff can undo a Penny action with one click, which is logged too.
- **In Salesforce.** Records Penny touches get `Actor_Type__c` (Person, Penny) and `Action_Reason__c`, starting with `TT_Blocker__c`, so reports can tell her changes apart from the integration user's. `Penny_Interaction_Log__c` already exists and could hold the action log.

## Definition of done (draft for Omar)

- [ ] Penny can clear a blocker on the Team Board through the Trail OS Action API, with actor type Penny.
- [ ] Every Penny action is saved with actor, reason, evidence link and time; none is saved under a person's name.
- [ ] The board shows a Penny badge and her reason on anything she changed.
- [ ] Each action posts a note in the team channel or that day's standup thread.
- [ ] Staff see a Penny activity list filtered by team, date and action.
- [ ] Coaches and staff undo a Penny action in one click, and the undo is logged.
- [ ] `TT_Blocker__c` carries `Actor_Type__c` and `Action_Reason__c` in production.

## Depends on

Case 1277 (TT Blocker object) and case 1281 (Team Board, which leaves an actor type on every action so this plugs in).
