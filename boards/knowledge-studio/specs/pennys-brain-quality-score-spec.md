# Penny's Brain: Knowledge Quality Score — Replit Spec

Nov 8, 2026 · @Angela Landrith

## Summary

Trail OS should compute a 0–100 quality score for every Knowledge article and roll the published articles up into one number, **Penny's Brain**. The target is **80% or higher**, with a **60-point floor** for any single published article. A rough baseline from November 8, 2026 data is about **51%**.

- Penny's Brain = the average score of the published version of every active article (archived and test articles excluded).
- The score measures progress only. It never approves, publishes, validates or makes an article eligible for Penny; the existing readiness checks still decide that.
- Every score comes with its missing points and the action that earns them, so writers know what to fix next.
- Trail OS keeps a daily history so the team can see the trend toward 80%.

## Scoring rubric

Each article earns up to 100 points across five areas. Every criterion must come from facts Trail OS already stores or computes; if a fact is unknown, the criterion scores 0 and is listed as missing.

| Area | Criterion | Points | Source in Trail OS |
| --- | --- | --- | --- |
| Content (25) | Summary is 40–255 characters and is not the title repeated | 5 | `summary`, `title` |
| Content | Body has at least 300 characters of text | 5 | `body` / type content alias |
| Content | Type-specific fields complete (see below) | 8 | steps, `customFields`, type fields |
| Content | At least 2 questions answered | 4 | `questionsAnswered` |
| Content | “Does not cover” filled in | 3 | `doesNotCover` |
| Findability (20) | Data category mapped to an active path in the categories sheet, and category sync verified (4 if mapped but not verified) | 8 | `category`, `categorySync.status` |
| Findability | Applies To set with valid Salesforce values | 4 | `appliesTo` |
| Findability | Audience set | 3 | `audience` |
| Findability | Retrieval abstract available | 5 | `retrievalAbstract`, readiness condition |
| Trust (25) | Business review passed for the current `contentVersion` | 10 | `reviewState.business`, `readiness.businessCurrent` |
| Trust | Technical (Penny) validation passed for the current `contentVersion` | 10 | `reviewState.technical`, `readiness.technicalCurrent` |
| Trust | Supporting links verified | 3 | `linkCheckStatus` |
| Trust | Policy sign-off recorded (policies only; other types earn these 2 points automatically) | 2 | readiness condition “Authorized policy sign-off required” |
| Freshness (15) | Last reviewed within its review cycle (15); within 1.5× the cycle (8); overdue or unknown (0) | 15 | `Last_Reviewed_Date__c`, `reviewCycle` |
| Delivery (15) | Published in Salesforce and the publication observation is an exact match (5 if a candidate or unverified) | 10 | `workflow.publication`, `_trailPublicationObservation.match` |
| Delivery | No open blocking issues or corrections | 5 | article issues, `workflow.delivery.corrections` |

Review cycles: Monthly = 30 days, Quarterly = 90, Annually = 365. No cycle set counts as unknown.

**Type-specific fields (the 8 content points):**

- Procedure and Learner Task: at least one step, and every step has a verify line.
- Policy: rule statement, effective date and waiver authority.
- Troubleshooting: symptom.
- Pathway: at least 2 linked articles.
- Release Note: release date and release version.
- Reference and Concept: the body rule above is enough; these types earn the 8 points when the body passes.

## Rules

Penny's Brain scores what Penny can actually read: the published version of each article.

1. **Every article gets a score**, including drafts and revisions, so writers see progress while they work.
2. **Penny's Brain counts one version per version family**: the published version. A family with no published version is not counted. A draft revision never replaces its published version in the headline number.
3. **Excluded from Penny's Brain:** archived articles, articles flagged for removal, and articles marked as duplicate or test cleanup.
4. **Trust is version-bound.** Review and validation points apply only when they were recorded for the article's current `contentVersion`. An edit resets them until someone reviews again.
5. **Bands:** 80–100 Strong, 60–79 Needs work, below 60 Below floor.
6. **Penny's Brain** = the mean of the counted article scores, rounded to one decimal place.
7. **Not a gate.** The score never changes an article's status, approval, delivery, publication or Penny eligibility.
8. **Missing points** list each criterion not earned, with its points and a short action (for example “Add a verify line to steps 2 and 4”), sorted by points, highest first.

## Data contract

Add two optional fields to the Knowledge Studio data. Both are additive, so the contract version stays 1 and older boards ignore them.

**Per article: `quality`**

```json
{
  "quality": {
    "score": 72,
    "band": "needs_work",
    "counted": true,
    "contentVersion": "<the version scored>",
    "computedAt": "2026-11-08T21:00:00Z",
    "areas": {
      "content":     {"earned": 22, "max": 25},
      "findability": {"earned": 12, "max": 20},
      "trust":       {"earned": 10, "max": 25},
      "freshness":   {"earned": 15, "max": 15},
      "delivery":    {"earned": 13, "max": 15}
    },
    "missing": [
      {"area": "trust", "code": "technical_validation", "points": 10,
       "label": "Technical validation not recorded for this version",
       "action": "Ask the Penny validator to validate it"}
    ]
  }
}
```

`band` is one of `strong`, `needs_work` or `below_floor`. `counted` is true when the article counts toward Penny's Brain.

**Top level: `pennyBrain`**

```json
{
  "pennyBrain": {
    "score": 51.4,
    "target": 80,
    "floor": 60,
    "counted": 183,
    "belowFloor": 31,
    "areas": {"content": 24.7, "findability": 7.3, "trust": 0, "freshness": 0, "delivery": 11.7},
    "byGroup": [{"group": "Technology & Trail OS", "score": 49.0, "counted": 40}],
    "history": [{"date": "2026-11-08", "score": 51.4, "counted": 183}],
    "computedAt": "2026-11-08T21:00:00Z"
  }
}
```

The numbers above are examples. `byGroup` uses the data category group (Mission & Delivery, Operations & Business, Technology & Trail OS, plus “No category”). `history` carries the last 90 daily points.

**MCP:** include `quality` in `get_article` and `search_articles`, and add the `pennyBrain` summary to `knowledge_inventory`.

## Computation and storage

Compute scores on the server whenever the Studio data is built, and save one Penny's Brain snapshot per day.

- **One shared function** (for example `scoreArticle(article, context)`) produces the per-article object. The Studio data build, the MCP tools and the daily snapshot all call it, so every surface shows the same number.
- **Context** it needs: the active paths from the categories sheet, today's date in Central time, and the article's version family.
- **Daily snapshot** at 6:00 AM Central into a new table, for example `knowledge_quality_snapshots` (date, score, counted, below\_floor, area averages, by-group scores). One row per day; a rerun the same day replaces that day's row.
- **History** in `pennyBrain.history` reads from that table. Before the first snapshot it holds only today's computed value.
- **Performance:** scoring reads data already loaded for the Studio build. It makes no extra Salesforce calls and should add under 50 ms for about 300 articles.

## Guardrails and out of scope

This change is read-only scoring; it adds no new actions and changes no permissions.

- No change to approval, independent review, Salesforce delivery, publication, or Penny validation and readiness.
- No automatic edits to fix missing points, and no automatic retries.
- The score is visible to everyone who can already see the article in Knowledge Studio; no new access.
- Out of scope for this release: scoring Guides, AI judgement of writing quality, and per-person leaderboards.
- The 80% target and 60-point floor are settings, so staff can change them later without a code change.

## Acceptance criteria

- [ ] Every non-archived article in Studio data has a `quality` object, and its area points add up to `score`.
- [ ] A published Procedure with complete fields, current business review and technical validation, verified category, links and publication, reviewed within its cycle, scores 100.
- [ ] Editing that article's content drops it by 20 Trust points until both reviews are recorded again for the new version.
- [ ] A draft revision gets its own score but does not change Penny's Brain; its published version stays counted.
- [ ] Archived, flagged-for-removal and test-cleanup articles are not counted.
- [ ] A policy without sign-off loses the 2 sign-off points; a non-policy article gets them.
- [ ] Unknown review dates or cycles score 0 Freshness and appear in `missing`.
- [ ] `missing` is sorted by points, and every entry has an `action`.
- [ ] `pennyBrain.score` equals the mean of counted article scores to one decimal place.
- [ ] One snapshot row per day; running the job twice the same day leaves one row.
- [ ] `get_article`, `search_articles` and `knowledge_inventory` return the same numbers as the Studio data.
- [ ] Unit tests cover each criterion, each article type and each band boundary (59, 60, 79, 80).

## Baseline, milestones and the board

A rough November 8, 2026 estimate across 272 active articles is about 51%. It used only the facts available through MCP; Freshness and the detailed content checks were not scored, so the real first number will differ.

| Area | Average earned | Max | Main gap |
| --- | --- | --- | --- |
| Content (summary only) | 24.7 | 25 | Other content checks not yet measured |
| Findability | 7.3 | 20 | 270 articles lack an approved category mapping; most lack a retrieval abstract |
| Trust | 0 | 25 | No article has current business review and technical validation |
| Delivery | 11.7 | 15 | About 95 not yet published in Salesforce |

**Milestones**

1. **About 65% within 30 days:** add the 13 proposed data categories in Salesforce, map articles to them, generate retrieval abstracts and check links.
2. **80% within 90 days:** business review and technical validation for the most-used articles first (Orientation, Learner program, Penny).

**Board (next board version, after this ships):** a Penny's Brain gauge on Overview with the trend, the target line and the count below the floor; a score badge on each article row; and a “Quality” section on each article listing its missing points with links to the tab that fixes each one. Missing `quality` or `pennyBrain` data shows “Not scored yet”.
