# Data Model

## Overview

The DOGFOOD Portal uses PostgreSQL through Flask-SQLAlchemy.

The main data relationships are:

    User
      |
      +---- Session
      |
      +---- TeamMember ---- Team ---- Event ---- Track
      |                       |
      |                       +---- Project
      |
      +---- Judge ---- Assignment ---- Project
                   |
                   +---- Score ---- Project

    Event ---- RubricCriterion
    User  ---- AuditLog

## Tables

### users

Stores application users.

| Column | Purpose |
|---|---|
| id | String primary key |
| email | Unique email address |
| name | Display name |
| password_hash | Hashed password |
| role | participant, judge, organizer, or admin |
| created_at | Creation timestamp |

### sessions

Stores the custom authentication session tokens.

| Column | Purpose |
|---|---|
| token | Primary key/session token |
| user_id | User who owns the session |
| created_at | Session creation timestamp |
| expires_at | Optional expiry timestamp |

The authentication middleware reads the session token from the `session` cookie or from a Bearer authorization header.

### events

Represents a hackathon event.

| Column | Purpose |
|---|---|
| id | String primary key |
| name | Event name |
| submissions_open | Optional opening time |
| submissions_close | Submission deadline |
| published | Organizer publish flag |

The current submission logic uses `submissions_close` for deadline enforcement.

### tracks

Represents categories or tracks belonging to an event.

| Column | Purpose |
|---|---|
| id | String primary key |
| event_id | Event containing the track |
| name | Track name |

### teams

Represents participant teams.

| Column | Purpose |
|---|---|
| id | String primary key |
| event_id | Event entered by the team |
| name | Team name |
| lead_user_id | Team lead |
| invite_token | Unique invite token |

Each team belongs to one event.

The application enforces a maximum of four members when a user joins an existing team.

### team_members

Join table connecting users and teams.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| team_id | Team reference |
| user_id | User reference |

There is a unique constraint on `(team_id, user_id)` so the same user cannot be added to the same team twice.

### projects

Stores participant project submissions.

| Column | Purpose |
|---|---|
| id | String primary key |
| event_id | Event being entered |
| team_id | Submitting team |
| track_id | Optional track |
| title | Project title |
| summary | Project description |
| repo_url | Repository URL |
| status | draft, submitted, or duplicate |
| submitted_at | Submission timestamp |
| updated_at | Last update timestamp |

There is a unique constraint on `(team_id, event_id)`, so each team has at most one project record for an event.

Draft projects remain private and are not shown in the public gallery.

Project creation and editing are checked against the event submission deadline.

### judges

Associates a user with an event as a judge.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| user_id | Judge user |
| event_id | Event being judged |
| tracks | Comma-separated track identifiers |
| fixture_id | Fixture judge identifier when applicable |
| added_by | Organizer who added the judge |

There is a unique constraint on `(user_id, event_id)`.

### assignments

Maps judges to projects they are expected to review.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| judge_id | Assigned judge |
| project_id | Assigned project |

There is a unique constraint on `(judge_id, project_id)` to prevent duplicate assignments.

### rubric_criteria

Stores the judging criteria and weights for each event.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| event_id | Event using the rubric |
| name | Criterion name |
| weight | Criterion weight |

### scores

Stores a judge's score for a project.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| judge_id | Judge giving the score |
| project_id | Project being scored |
| criteria | JSON object containing criterion scores |
| comment | Optional judge feedback |
| created_at | Score timestamp |

There is a unique constraint on `(judge_id, project_id)`.

If a judge scores the same project again, the existing score is updated.

### audit_log

Stores important organizer and judging actions.

| Column | Purpose |
|---|---|
| id | Integer primary key |
| time | Action timestamp |
| user_id | User who performed the action |
| action | Action name |
| target | Affected object |
| details | Optional additional information |

## Main Relationships

### User and Team

Users become team members through the `team_members` table.

When a team is created, the creator becomes its first member and team lead.

### Team and Project

A team can have at most one project for a particular event because of the unique `(team_id, event_id)` constraint.

### Event and Project

Every project belongs to an event and follows that event's submission deadline.

### Event and Track

An event can contain zero or more tracks.

A project may optionally reference a track.

### Event and Rubric

Each event can have its own judging criteria and weights.

### Judge and Assignment

Assignments determine which projects a judge is expected to review.

### Judge and Score

A judge can have one current score for each assigned project.

## Fixture Data

The initial database is populated by `seed.py` using `fixtures.json`.

The fixture data contains:

- 1 fixture event
- 8 tracks
- 30 judges
- 40 teams
- 41 project records in the source fixture
- 126 scores

There is a known duplicate submission involving `prj_07` and `prj_41`, which belong to the same team.

The seed keeps the latest submission for that team and skips the older duplicate so that the unique `(team_id, event_id)` constraint is preserved.

The seed also creates fixed session tokens for the seeded organizer, participant, judge A, and judge B accounts used by the acceptance checker.

## Data Visibility

The public gallery only exposes projects whose status is `submitted`.

Draft projects are excluded from the gallery.

Team invite tokens are available through team information only to members of that team.

Judge score access is restricted to the currently authenticated judge.

A judge cannot read another judge's scores.

Organizer-only endpoints require the organizer role on the backend.

## Database Initialization

The project does not currently use Alembic or another database migration system.

Tables are created at startup using:

    db.create_all()

The seed then loads fixture data when the database has not already been initialized.

This approach keeps local/self-hosted setup simple for the DOGFOOD hackathon, but it is a limitation compared with a production deployment using explicit migration history.