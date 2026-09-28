# Architecture

## Overview

DOGFOOD Portal is a self-hostable web application for hackathon submissions and judging.

The system is divided into three main layers:

```text
React + Vite + Tailwind
        |
        | HTTP / JSON
        v
Flask JSON API
        |
        | SQLAlchemy
        v
PostgreSQL
```

Docker Compose runs the PostgreSQL database and application together.

The application is designed to work locally without cloud accounts, hosted databases, or external APIs.

## High-Level Architecture

```text
Browser
   |
   | HTTP
   v
React Frontend
   |
   | /api requests
   v
Flask Backend
   |
   +----------------------+
   |                      |
   v                      v
Authentication         Application Routes
                           |
                           +---- Events
                           +---- Teams
                           +---- Projects
                           +---- Judging
                           +---- Organizer
                           |
                           v
                     SQLAlchemy Models
                           |
                           v
                       PostgreSQL
```

## Frontend

The frontend is built with:

- React 19
- Vite
- React Router
- Tailwind CSS 4

The frontend source is located at:

```text
src/frontend/src/
```

Main files include:

```text
App.jsx
AuthContext.jsx
Navbar.jsx
api.js
index.css
```

Page components are located under:

```text
src/frontend/src/pages/
```

Current pages are:

```text
Gallery.jsx
Login.jsx
MyTeam.jsx
JoinTeam.jsx
Judge.jsx
Organizer.jsx
```

## Application Routing

`App.jsx` provides the main browser routes.

Current routes are:

```text
/                   Public project gallery
/login              Login and registration
/team               Participant team/project workspace
/join               Join team using an invite token
/join/:token        Direct invite-link joining
/judge              Judge workspace
/organizer          Organizer dashboard
```

The React application uses `BrowserRouter`.

## Authentication Context

Authentication state is provided through `AuthContext.jsx`.

The context is responsible for:

- Loading the currently authenticated user
- Logging in
- Registering a new participant
- Logging out
- Maintaining the current user and role

On startup, the frontend requests:

```text
GET /api/auth/me
```

to determine whether the browser already has a valid session.

The current user object contains:

```text
id
email
name
role
```

The role determines which navigation options are displayed.

Frontend role-based navigation is only for user experience. Actual authorization is enforced by the backend.

## API Helper

`src/frontend/src/api.js` contains the shared fetch helper.

The helper:

- Sends credentials with requests
- Sets JSON headers
- Serializes request bodies
- Parses JSON responses
- Converts failed HTTP responses into JavaScript errors
- Preserves the HTTP status on the error object

The frontend communicates with the backend through paths beginning with:

```text
/api
```

## Vite Development Proxy

During frontend development, Vite proxies `/api` requests to:

```text
http://localhost:8080
```

This allows the frontend to call:

```text
/api/events
/api/projects
/api/auth/me
```

without hardcoding the backend URL into the React application.

## Backend

The backend is implemented with:

- Python
- Flask
- Flask-SQLAlchemy
- PostgreSQL
- psycopg2

The main application entry point is:

```text
src/backend/app.py
```

The backend provides JSON APIs and also serves the built React frontend in the Docker production image.

## Flask Application Setup

`app.py` is responsible for:

- Creating the Flask application
- Configuring the database
- Initializing SQLAlchemy
- Registering route blueprints
- Exposing the health endpoint
- Exposing the current-user endpoint
- Serving the React production build

The database connection is read from:

```text
DATABASE_URL
```

with a local PostgreSQL connection string used as the default.

## Backend Route Modules

Routes are separated into blueprints.

### Authentication

```text
src/backend/routes/auth_routes.py
```

Handles:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Events

```text
src/backend/routes/events.py
```

Handles:

- Listing events
- Creating events
- Publishing events
- Adding judges
- Listing judges

### Teams

```text
src/backend/routes/teams.py
```

Handles:

- Creating teams
- Listing the current user's teams
- Joining teams
- Reading team information

### Projects

```text
src/backend/routes/projects.py
```

Handles:

- Public project gallery
- Current user's projects
- Project creation
- Draft creation
- Project editing
- Project submission
- Deadline enforcement

### Judging

```text
src/backend/routes/judging.py
```

Handles:

- Judge scores
- Judge assignments
- Judge peer information
- Automatic project assignment
- Organizer progress
- Organizer results
- CSV export
- Audit access

## Authentication Architecture

Authentication uses a custom database-backed session system.

It does not use Flask's built-in session mechanism.

The main authentication flow is:

```text
Login request
    |
    v
Validate credentials
    |
    v
Create/read Session row
    |
    v
Set session cookie
    |
    v
Future API request
    |
    v
Read session cookie
    |
    v
Find Session
    |
    v
Find User
```

The backend also accepts:

```text
Authorization: Bearer <token>
```

The authentication helpers are located in:

```text
src/backend/auth.py
```

## Authorization

Authorization is enforced in the backend.

The application uses:

```text
require_login
require_role(...)
```

The backend checks the authenticated user's role before allowing access to protected routes.

Examples:

```text
Organizer-only:
POST /api/events
POST /api/events/<id>/assignments
GET  /api/organizer/results
GET  /api/export.csv

Judge-only:
GET  /api/judge/scores
POST /api/judge/scores
GET  /api/judge/assignments
GET  /api/judge/peers
```

Participant access to judge or organizer endpoints is rejected with JSON `403` responses.

Unauthenticated requests to protected routes receive JSON `401` responses.

## Database Layer

The database layer uses Flask-SQLAlchemy.

The model definitions are located in:

```text
src/backend/models.py
```

The main entities are:

```text
User
Session
Event
Track
Team
TeamMember
Project
Judge
Assignment
RubricCriterion
Score
AuditLog
```

A detailed description of the schema is provided in:

```text
DATA-MODEL.md
```

## Database Initialization

The application creates its tables using:

```python
db.create_all()
```

at startup.

The project does not currently use Alembic or another database migration system.

When the database is empty, `seed.py` loads the fixture data.

This keeps initial self-hosted setup simple for the hackathon.

## Seed Architecture

The seed system is implemented in:

```text
src/backend/seed.py
```

and reads:

```text
fixtures.json
```

The fixture import creates:

- Event
- Tracks
- Rubric criteria
- Judges
- Users
- Teams
- Team members
- Projects
- Assignments
- Scores
- Test sessions

The seed also handles the known duplicate project submission so the database's unique team/event project constraint is not violated.

Once the database already contains an event, the seed process skips re-importing fixture data.

## Project Lifecycle

A participant project follows this lifecycle:

```text
No Project
    |
    v
Draft
    |
    | edit
    v
Draft
    |
    | submit
    v
Submitted
```

Projects have a unique `(team_id, event_id)` constraint, so a team cannot create multiple independent project records for the same event.

The public gallery only returns:

```text
status = submitted
```

Drafts therefore remain private.

Project creation and editing are protected by the event submission deadline.

## Team Architecture

A team belongs to an event.

Team membership is represented through:

```text
team_members
```

The user who creates a team becomes:

```text
lead_user_id
```

The team lead is allowed to create the first version of the project.

Other members can be associated with the team through the invite-token joining flow.

The backend enforces the four-member maximum when joining an existing team.

## Event Architecture

An event contains:

```text
Event
 ├── Tracks
 ├── Rubric Criteria
 ├── Judges
 ├── Teams
 └── Projects
```

The event's `submissions_close` value is used by the project API to enforce the submission deadline.

The current `published` field records the organizer's publish action.

The current public gallery does not independently hide or reveal projects based on this flag; submitted status controls gallery visibility.

## Judging Architecture

The judging system is composed of:

```text
Event
   |
   +---- Judges
   |
   +---- Projects
          |
          +---- Assignments
          |
          +---- Scores
```

An organizer adds judges to an event.

The assignment system then matches judges to projects.

Assignments are track-aware and load-balanced.

Judges score projects using the event rubric.

A judge's scores are isolated from other judges.

The normalized ranking is calculated by the normalization module.

Detailed judging behavior is documented in:

```text
JUDGING.md
```

## Judge Isolation

Judge score requests are scoped to the currently authenticated judge.

The backend verifies that:

```text
requested judge == authenticated judge
```

when a judge-specific score query is provided.

This prevents one judge from reading another judge's scores.

The frontend also does not display peer scores.

The permission boundary is enforced in Flask rather than relying on React visibility alone.

## Normalization Architecture

Normalization is implemented in:

```text
src/backend/normalization.py
```

The pipeline is:

```text
Raw judge criteria
        |
        v
Weighted review score
        |
        v
Per-judge statistics
        |
        v
Shrink toward global statistics
        |
        v
Z-score each review
        |
        v
Average review z-scores per project
        |
        v
Normalized project ranking
```

The organizer results endpoint uses this module to generate normalized project results.

The raw average and review count are retained alongside the normalized score.

## Organizer Architecture

The organizer dashboard communicates with several organizer APIs:

```text
GET  /api/events
POST /api/events
POST /api/events/<id>/publish
POST /api/events/<id>/judges
GET  /api/events/<id>/judges
POST /api/events/<id>/assignments
GET  /api/organizer/progress
GET  /api/organizer/results
GET  /api/organizer/audit
GET  /api/export.csv
```

The organizer frontend combines these responses into one dashboard.

## Public Gallery Architecture

The public gallery is available without authentication.

The frontend requests:

```text
GET /api/projects
```

The backend only returns submitted projects.

The gallery supports:

```text
?search=
?track=
```

Search is performed against project titles.

Track filtering is performed using the project's track ID.

## Audit Architecture

The backend records selected important actions using:

```text
src/backend/audit.py
```

Examples include:

```text
event_created
judge_added
assignments_created
score_submitted
results_published
```

The organizer can retrieve the audit log through:

```text
GET /api/organizer/audit
```

## Docker Architecture

Docker Compose defines two main services:

```text
db
app
```

### Database

The database service runs:

```text
PostgreSQL 16
```

with a health check.

### Application

The application image uses a two-stage build.

The first stage:

```text
Node
```

builds the React frontend.

The second stage:

```text
Python 3.12-slim
```

copies the built frontend into the backend image.

The resulting container runs the Flask application on:

```text
port 8080
```

At startup the application:

```text
creates database tables
        ↓
runs the seed process
        ↓
starts Flask
```

The Flask application then serves the React build and API routes from the same container.

## Development Architecture

During development, two processes can be used:

```text
Terminal 1
docker compose up
        |
        v
Backend + PostgreSQL
        |
        v
localhost:8080
```

and:

```text
Terminal 2
cd src/frontend
npm run dev
        |
        v
Vite
        |
        v
localhost:5173
```

Vite proxies `/api` requests to the backend.

This allows frontend development without rebuilding the Docker application on every UI change.

## Production-Style Local Architecture

For a production-style local test, the frontend is built into the Docker image.

The workflow is:

```text
npm/Vite build
      |
      v
React dist/
      |
      v
Python application image
      |
      v
Flask serves React + API
      |
      v
localhost:8080
```

## Testing Architecture

The automated tests are located under:

```text
tests/
```

Current test groups include:

```text
test_normalization.py
test_api_permissions.py
test_projects_teams.py
```

`conftest.py` provides an isolated SQLite test application and test data.

The tests cover:

- Authentication requirements
- Role permissions
- Judge score isolation
- Organizer CSV access
- Team membership
- Team invite protection
- Team size limits
- Project permissions
- Deadline enforcement
- Draft creation
- Project editing
- Normalization edge cases

The production application continues to use PostgreSQL.

The SQLite database exists only for isolated automated testing.

## Acceptance Checker Architecture

The official checker communicates with the running portal through configured cookies from:

```text
.dogfood.toml
```

The checker verifies seven behaviors:

```text
T1:
1. Public gallery returns 200
2. Fixture project is visible
3. Closed-event submission is refused

T2:
4. Judge can read own scores
5. Judge cannot read peer scores
6. Participant cannot access judge route
7. Organizer CSV export works
```

The current project claims:

```text
T1 T2
```

## Error Handling

Protected API routes return JSON errors.

Typical responses include:

```text
401 - not logged in
403 - forbidden
404 - not found
400 - invalid request
```

The API helper in the frontend converts non-successful responses into JavaScript errors that can be displayed by page components.

The application deliberately avoids redirecting API requests to HTML login pages.

## Security Boundaries

The major security boundaries are:

```text
Frontend
    |
    | user experience only
    v
Backend authorization
    |
    v
Database
```

Important rules include:

- Backend role checks protect organizer APIs.
- Judge score access is scoped to the logged-in judge.
- Participants cannot access judging APIs.
- Non-members cannot access protected team invite information.
- Project edits require team membership.
- Submission and editing are blocked after the event deadline.
- Draft projects are excluded from the public gallery.

## Offline and Self-Hosted Design

The application does not require:

- Cloud accounts
- Hosted databases
- External APIs
- External authentication services
- Hosted judging services

After Docker images and dependencies are available locally, the application is designed to operate entirely on the local machine.

## Known Limitations

The current architecture intentionally focuses on T1 and T2.

Known limitations include:

- No T3 or T4 implementation.
- Flask development server is used rather than a production WSGI server.
- No Alembic migration history.
- No email verification.
- No password reset flow.
- The event publish flag does not independently control gallery visibility.
- Judge track assignments are stored as a simple comma-separated value.
- Assignment logic aims for the target number of reviews but cannot guarantee the target when insufficient eligible judges exist.
- The current normalization method is a practical hackathon ranking method rather than a statistically definitive ranking system.

## Summary

The system architecture can be summarized as:

```text
                    DOGFOOD PORTAL
                          |
          +---------------+---------------+
          |                               |
          v                               v
     React Frontend                   Flask API
          |                               |
          |                               |
          +---------------+---------------+
                          |
                          v
                   SQLAlchemy ORM
                          |
                          v
                     PostgreSQL
                          |
                          v
                   Fixture Seeder
```

The resulting application provides a complete local submission and judging platform for the T1 and T2 scope, with role-based authorization, team/project management, judging, normalized results, Docker deployment, automated tests, and an offline-capable local architecture.