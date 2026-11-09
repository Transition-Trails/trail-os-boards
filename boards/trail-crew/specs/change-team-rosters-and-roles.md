# Change: Team rosters and roles in Trail OS

A separate Trail OS change that lets staff group volunteers into teams and give each person a team role, using Salesforce Contact records. It is built in Trail OS first and stored in the Trail OS database; once the Trail OS DevOps team adds the Salesforce objects, Trail OS writes the same data to Salesforce and Salesforce becomes the source of truth. Every board (Team Board, product board, Release tab, permissions) reads rosters from here instead of config files or Contact Department.

## What staff can do

- Create a team: name, short key (devops, academy, penny, marketing), goal, description, Slack channel, status (Forming, Active, Retired), start date.
- Add people by searching Salesforce Contacts: Active Volunteers (record type 012an000003WTErAAO, Volunteer Status Active) and staff. Search by name or work email; never by first name alone.
- Give each member one or more roles and mark their primary role.
- Mark a role as an open seat (no person yet), so vacancies show on the boards.
- Move someone between teams with an end date on the old membership and a start date on the new one, so history is kept.
- Coaches and assistant coaches see their own team's roster and can edit its standup settings, but only staff change membership or roles.

## Roles

| Role | Per team | Used for |
| --- | --- | --- |
| Coach | One required (a team can be saved without one while Forming) | Team Board coach rights, standup settings, clearing blockers |
| Assistant Coach | Zero or more | Same rights as the coach |
| Product Owner | One | Prioritize order, Feature ownership |
| Product Manager | Zero or one | Team Penny today (Mary) |
| BA | Any | Story and AC writing |
| Admin | Any | Builder on stories |
| Developer | Any | Builder on stories |
| Data | Any | Data 360 work (Rebeca) |
| Tech Manager | Any | Staff support (Michele) |
| Replit Manager | Any | Trail OS Replit work (Henry) |

A person can hold several roles on one team (Sidra is BA and Admin). The role list is editable by staff so new roles don't need a code change.

## Trail OS data (phase 1)

| Table | Fields |
| --- | --- |
| team | id, key, name, goal, description, type (Trail Crew Team, Squad), slackChannelId, status, startDate, endDate, standupDueTime, standupDays, salesforceId (empty until synced) |
| team\_member | id, teamId, contactId (Salesforce Contact Id, required unless openSeat), roles (list), primaryRole, openSeat, startDate, endDate, salesforceId |
| team\_role | id, name, active, sortOrder |
| team\_change\_log | who, when, what changed (for training and audit) |

`type` lets the same model serve learner Squads for the January cohort (case 1267) without a second build.

## Seed data for Nov 8

Load the four teams from the Coach Pulse team configuration, which already holds verified Contact IDs: Trail OS DevOps (Hugh coach, Jayna assistant coach, Omar product owner), Transition Trails Academy (Dalona coach, Amrutha assistant coach, Deepti product owner), Team Penny (Mary product manager and coach, product owner open), Transition Trails Marketing (Forming, coach and product owner open). Staff review it on the Teams screen before Nov 8.

## Salesforce objects (Trail OS DevOps team builds these)

| Object | Fields |
| --- | --- |
| TT Team (`TT_Team__c`) | Name, Team\_Key\_\_c (unique), Type\_\_c (Trail Crew Team, Squad), Goal\_\_c, Description\_\_c, Status\_\_c, Start\_Date\_\_c, End\_Date\_\_c, Slack\_Channel\_Id\_\_c, Standup\_Due\_Time\_\_c, Standup\_Days\_\_c, Trail\_OS\_Id\_\_c (external ID) |
| TT Team Member (`TT_Team_Member__c`) | TT\_Team\_\_c (master-detail), Contact\_\_c (lookup, blank for an open seat), Roles\_\_c (multi-select picklist), Primary\_Role\_\_c (picklist), Open\_Seat\_\_c, Start\_Date\_\_c, End\_Date\_\_c, Active\_\_c (formula from dates), Trail\_OS\_Id\_\_c (external ID) |
| TT Feature | Team\_\_c becomes a lookup to TT Team instead of a picklist |

Tracked as a Platform Change case for the Trail OS DevOps team.

## Switching to Salesforce

1. Trail OS reads a setting, `teamSource`: `trailos` now, `salesforce` later.
2. When the objects are in production, a one-time sync upserts every Trail OS team and member into Salesforce by `Trail_OS_Id__c` and stores the Salesforce IDs back.
3. Staff check the counts match, then switch `teamSource` to `salesforce`. From then on the Teams screen reads and writes Salesforce, and the Trail OS tables become a cache.
4. Contact Department stops being used as the team field.

## Done when

- [ ] Staff create the four teams and their rosters on the Teams screen, from Salesforce Contacts.
- [ ] Open seats show as open on every board.
- [ ] The Team Board, product board and coach permissions all read rosters from this change, not a config file.
- [ ] Moving a person between teams keeps their history.
- [ ] After the Salesforce objects ship, the sync creates matching TT Team and TT Team Member records and `teamSource` switches without data loss.
