# Judging

## Overview

DOGFOOD Portal provides a judge assignment, scoring, and results workflow for hackathon projects.

The judging system is designed around:

- Event-specific rubric criteria
- Weighted scoring
- Track-aware judge assignment
- Load-balanced assignments
- Judge score isolation
- Normalized project results
- Raw average reporting
- Review-count reporting
- Organizer progress tracking
- CSV export
- Audit logging

## Judging Workflow

The normal judging workflow is:

```text
Organizer creates event
        ↓
Organizer creates tracks and rubric
        ↓
Organizer adds judges
        ↓
Organizer assigns judges to submitted projects
        ↓
Judge views assigned projects
        ↓
Judge scores assigned projects
        ↓
Judge can update their own scores
        ↓
Organizer views judging progress
        ↓
Organizer views normalized results
        ↓
Organizer can export CSV
```

## Rubric

Each event has its own rubric.

A rubric consists of one or more criteria with a numeric weight.

The default rubric used by the fixture seed is:

```text
functionality   weight 1.0
quality         weight 1.0
innovation      weight 1.0
```

When an organizer creates a new event, the frontend allows the organizer to configure the rubric weights.

The rubric is stored in the `rubric_criteria` table.

Each criterion contains:

- Event ID
- Criterion name
- Weight

## Judge Management

An organizer can add a registered user as a judge for an event.

When a user is added as a judge:

- Their role is changed to `judge`.
- A `Judge` row is created for the event.
- The organizer who added them is recorded in `added_by`.
- Optional track assignments are stored with the judge.

Organizer accounts are not allowed to also become judges.

A user can only have one judge record per event because of the unique `(user_id, event_id)` constraint.

## Judge Assignment

The organizer can trigger automatic judge assignment through:

```text
POST /api/events/<event_id>/assignments
```

The current implementation accepts a `target_reviews` value, with `3` used by the organizer UI.

The assignment algorithm:

1. Finds submitted projects for the event.
2. Finds judges for the event.
3. Counts each judge's current assignments.
4. Finds judges whose configured tracks match the project's track.
5. Sorts eligible judges by current assignment load.
6. Skips judges already assigned to that project.
7. Adds judges until the target review count is reached or no eligible judges remain.

A project without a track can be assigned to any judge for the event.

A judge/project assignment is unique because of the `(judge_id, project_id)` constraint.

The assignment system aims for at least three reviews per project when enough eligible judges are available.

It does not guarantee three reviews if there are insufficient eligible judges.

## Judge Assignments Page

Judges retrieve their assignments using:

```text
GET /api/judge/assignments
```

Each assignment includes:

- Project ID
- Event ID
- Project title
- Whether the judge has already scored the project

The Judge frontend shows:

```text
to do
```

for projects without a score and:

```text
scored
```

for projects that already have a score.

Judges can edit an existing score.

## Scoring

A judge submits a score using:

```text
POST /api/judge/scores
```

The request contains:

- Project ID
- Criteria scores
- Optional comment

The criteria are stored as JSON.

Example:

```json
{
  "functionality": 4,
  "quality": 3,
  "innovation": 5
}
```

Submitting a score for a project that the judge already scored updates the existing `Score` record.

A judge therefore has one current score record per project.

## Score Permissions

The scoring API is protected by backend checks.

Only users whose role is `judge` can submit or read judge scores.

A logged-in participant receives `403` when attempting to use judge score endpoints.

A logged-in judge can read their own scores.

A judge cannot request another judge's scores.

The API supports a `judge` query parameter for the acceptance check:

```text
GET /api/judge/scores?judge=<fixture_id>
```

If the requested judge identifier is not the currently authenticated judge's fixture identifier, the request is rejected with `403`.

The frontend also deliberately does not expose other judges' scores.

## Judge Panel Information

Judges can view the judging panel through:

```text
GET /api/judge/peers
```

This endpoint provides limited information intended as a panel hint.

It can expose:

- Fellow judges' names
- Assigned tracks
- Event name
- The organizer who added the current judge

It does not expose:

- Other judges' scores
- Other judges' email addresses

The current judge is marked with `is_you`.

## Weighted Score Calculation

Each review is first converted into a weighted score.

For each criterion:

```text
criterion score × criterion weight
```

The weighted score for one review is:

```text
sum(score × weight)
```

For example, with:

```text
functionality = 4
quality       = 3
innovation    = 5
```

and:

```text
functionality weight = 1.0
quality weight       = 2.0
innovation weight    = 0.5
```

the review's weighted score is:

```text
(4 × 1.0) + (3 × 2.0) + (5 × 0.5)
= 4 + 6 + 2.5
= 12.5
```

The implementation is in:

```text
src/backend/normalization.py
```

## Why Normalization Is Used

Different judges may naturally score at different levels.

For example, one judge may frequently give scores around 4 or 5 while another may use a wider or lower range.

The system therefore normalizes each judge's review scores before producing the project ranking.

The implementation uses a z-score approach with shrinkage.

## Normalization Process

### Step 1: Weighted Score Per Review

Every score record is converted into a weighted review score.

The implementation stores this temporary value as `_weighted`.

### Step 2: Judge Statistics

For every judge, the system calculates:

- Mean weighted score
- Population standard deviation
- Number of reviews

It also calculates the global mean and global standard deviation across all reviews.

If the global population standard deviation is zero, the implementation uses `1.0` to avoid division by zero.

### Step 3: Shrink Judge Statistics

Judges with only a few reviews can have unstable means and spreads.

The implementation therefore shrinks each judge's statistics toward the global statistics.

The shrinkage weight is:

```text
w = n / (n + k)
```

where:

```text
n = number of reviews by the judge
k = shrinkage constant
```

The default value is:

```text
k = 3
```

The shrunk mean is:

```text
shrunk_mean =
    w × judge_mean
    +
    (1 - w) × global_mean
```

The shrunk standard deviation is:

```text
shrunk_stdev =
    w × judge_stdev
    +
    (1 - w) × global_stdev
```

If the resulting shrunk standard deviation is zero, the system replaces it with `1.0`.

This avoids divide-by-zero problems for judges with perfectly consistent scores.

### Step 4: Z-Score Each Review

Each review receives:

```text
z =
(weighted_score - shrunk_judge_mean)
/
shrunk_judge_stdev
```

This expresses how far the review is from that judge's normalized scoring level.

### Step 5: Aggregate Per Project

For each project:

```text
normalized_score =
average of the project's review z-scores
```

The results also retain:

```text
raw_average
review_count
```

The normalized score and raw average are rounded to three decimal places.

## Organizer Results

Organizers can retrieve normalized results using:

```text
GET /api/organizer/results
```

The result includes:

- Project ID
- Project title
- Normalized score
- Raw average
- Review count

Results are sorted by normalized score in descending order.

The organizer dashboard displays the normalized ranking and also shows raw averages and review counts.

## Judging Progress

Organizers can view judging progress using:

```text
GET /api/organizer/progress
```

For each submitted project, the endpoint reports:

- Project ID
- Project title
- Review count

The Organizer frontend summarizes:

- Number of projects with at least three reviews
- Total number of projects
- Projects with the lowest review coverage

## CSV Export

Organizers can export all recorded scores using:

```text
GET /api/export.csv
```

The CSV contains:

```text
project_id
title
judge_id
functionality
quality
innovation
comment
```

The export endpoint is organizer-only.

Participants and judges do not have access to the organizer CSV endpoint.

## Audit Logging

Important judging actions are recorded in the audit log.

For example, submitting a score records:

```text
score_submitted
```

with the project identifier as the target.

Creating judge assignments records:

```text
assignments_created
```

The organizer can view recent audit entries using:

```text
GET /api/organizer/audit
```

## Fixture Data and Edge Cases

The fixture dataset intentionally contains cases that exercise the normalization system.

Known examples include:

- A judge with repeated identical scores
- Judges with only one recorded review
- Judges with a small number of reviews
- Projects with different numbers of reviews
- Empty comments
- The duplicate project submission handled during seed import

The normalization implementation is designed to avoid divide-by-zero problems and reduce the influence of judges with very small review counts.

## Testing

The automated test suite includes judging and normalization tests.

The normalization tests cover:

- Weighted score calculation
- Empty score input
- Single-review judges
- Judges with zero variance
- Projects with different review counts
- Multiple criteria with different weights

The API tests cover:

- Unauthenticated access
- Participant access to judge routes
- Judge access to their own scores
- Judge isolation from peer scores
- Organizer-only CSV access

Run the complete test suite from the project root:

```powershell
python -m pytest -q
```

## Known Limitations

The judging system intentionally focuses on the T1 and T2 scope.

Known limitations include:

- Automatic assignment is track-aware and load-balanced, but it does not guarantee three reviews if there are not enough eligible judges.
- Normalization uses the current shrinkage/z-score method and should be treated as a practical hackathon ranking method rather than a statistically definitive ranking system.
- The current application uses a simple comma-separated representation for judge track assignments.
- There is no advanced conflict-of-interest detection.
- There is no automatic reviewer replacement or reassignment workflow after a judge becomes unavailable.
- There is no separate moderation workflow for submitted scores.
- T3 and T4 functionality is not implemented.

## Summary

The judging system provides the complete T2 judging workflow:

```text
Rubric
  ↓
Judge management
  ↓
Track-aware assignment
  ↓
Judge scoring
  ↓
Score isolation
  ↓
Weighted review scores
  ↓
Judge normalization
  ↓
Project normalized results
  ↓
Organizer progress
  ↓
CSV export
  ↓
Audit log
```

The system is designed to keep judge data isolated while providing organizers with a normalized view of project performance.