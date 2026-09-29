# DOGFOOD Portal

A self-hostable hackathon submission and judging portal built for DOGFOOD 2026.

## Current Scope

This submission claims T1 and T2 only.

The latest official acceptance checker result is:

DOGFOOD 2026 acceptance report
portal: http://localhost:8080
claimed: T1 T2
fixtures: fixtures.json

T1  gallery is public ................. PASS
T1  project from fixtures shown ....... PASS
T1  closed event refuses submissions .. PASS
T2  judge sees own scores ............. PASS
T2  judge cannot see peer scores ...... PASS
T2  participant blocked ............... PASS
T2  csv export works .................. PASS

claimed T1 T2, verified T1 T2

The repository also contains an independent automated test suite with 20 passing tests.

## Features

### Public Gallery

- Public project gallery
- Search projects
- Filter projects by track
- Submitted projects are publicly visible
- Draft projects remain private
- Responsive React interface

### Authentication

- Participant registration
- Login and logout
- Organizer, judge, and participant roles
- Database-backed session authentication
- Bearer-token authentication support
- Authenticated-user endpoint

### Teams

- Participants can create teams
- Teams belong to an event
- Team lead is recorded
- Invite tokens are supported
- Participants can join with an invite token
- Maximum team size is four members
- Team invite information is restricted to team members

### Project Submission

Participants can:

- Create draft projects
- Edit projects before the deadline
- Select an event
- Select a track
- Add a title
- Add a summary
- Add a repository URL
- Submit a project

The backend enforces:

- Team membership
- Team-lead requirements for project creation
- Event existence
- Submission deadlines
- Closed-event protection

Draft projects do not appear in the public gallery.

### Organizer Dashboard

Organizers can:

- Create events
- Configure tracks
- Configure rubric criteria and weights
- Add judges
- Assign judges to projects
- Monitor judging progress
- View normalized results
- Export CSV data
- View audit information
- Publish an event

### Judge Dashboard

Judges can:

- View assigned projects
- View their assignments
- Score projects using the event rubric
- Update their own scores
- View their own score history

Judge isolation is enforced in the backend. A judge cannot request another judge's score set. Participants are blocked from judge endpoints.

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- @tailwindcss/vite
- React Router
- ESLint

Shared UI components are implemented in:

src/frontend/src/ui.jsx

The shared UI layer provides:

- PageHeader
- Badge
- Alert
- EmptyState
- LoadingState
- StatCard

The design system, reusable styles, tokens, buttons, inputs, cards, badges, alerts, and tables are defined in:

src/frontend/src/index.css

### Backend

- Python
- Flask
- Flask-SQLAlchemy
- PostgreSQL
- psycopg2

### Infrastructure

- Docker
- Docker Compose

The Dockerfile uses a two-stage build. Node builds the React application and the Python image runs Flask with the built frontend.

## Running with Docker

From the repository root:

docker compose up --build

Then open:

http://localhost:8080

The Docker environment starts the Flask application and PostgreSQL database. The database is initialized automatically and the fixture data is seeded during startup.

For a completely clean rebuild:

docker compose down -v
docker compose up --build

The -v option removes the PostgreSQL volume and causes the application to create a fresh database and reseed the fixtures.

## Development Mode

Docker provides the backend and PostgreSQL while Vite can run the frontend separately.

Terminal 1:

docker compose up

Backend:

http://localhost:8080

Terminal 2:

cd src/frontend
npm run dev

Frontend:

http://localhost:5173

The Vite development server proxies /api requests to the Flask backend on port 8080.

## Frontend Verification

From src/frontend:

npm run lint

npm run build

Both commands have been verified successfully for the current frontend.

## Seeded Accounts

The seed process creates test accounts for:

- Organizer
- Judge A
- Judge B
- Participant

Seeded password:

password123

The acceptance checker uses the session tokens configured in .dogfood.toml.

The checker does not perform the login flow. It attaches the configured authentication headers directly to its requests.

## Acceptance Checker

Run the official checker from the repository root:

python run.py .dogfood.toml

The checker verifies the claimed tiers.

### T1

- Gallery is public
- A fixture project is visible
- A closed event refuses participant submissions

### T2

- Judge can access their own scores
- Judge cannot access another judge's scores
- Participant cannot access judge endpoints
- Organizer can export CSV

The latest result is:

claimed T1 T2, verified T1 T2

The acceptance output is stored in:

acceptance-report.txt

## Automated Tests

Run:

python -m pytest -q

The current result is:

20 passed

The tests cover:

- Authentication and permissions
- Organizer-only access
- Judge score isolation
- Participant blocking
- Team creation
- Team listing
- Team member limits
- Team invite privacy
- Closed-event submission protection
- Closed-event project editing protection
- Draft creation
- Project membership protection
- Weighted score calculation
- Normalization edge cases
- Single-review judges
- Flat or zero-variance judges
- Different review counts

The test suite currently produces SQLAlchemy LegacyAPIWarning messages for the legacy Query.get() API. These are warnings only and do not cause test failures.

## API Overview

### Authentication

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
GET /api/health

### Events

GET /api/events
POST /api/events
POST /api/events/<event_id>/publish
POST /api/events/<event_id>/judges
GET /api/events/<event_id>/judges
POST /api/events/<event_id>/assignments

### Teams

POST /api/teams
GET /api/teams/mine
POST /api/teams/join
GET /api/teams/<team_id>

### Projects

GET /api/projects
GET /api/projects/mine
POST /api/projects
PATCH /api/projects/<project_id>

The public gallery supports:

GET /api/projects?search=...
GET /api/projects?track=...

### Judging

GET /api/judge/assignments
GET /api/judge/scores
POST /api/judge/scores

### Organizer

GET /api/organizer/progress
GET /api/organizer/results
GET /api/export.csv
GET /api/audit

## Authentication and Role Isolation

Authentication uses database-backed session tokens.

The browser uses a session cookie named:

session

The backend also accepts bearer authentication.

Authorization is enforced by the backend rather than relying only on the frontend.

Examples:

Participant accessing a judge endpoint returns 401 or 403.

Judge B requesting Judge A's scores returns 403.

The acceptance checker verifies these permission boundaries.

## Project Lifecycle

A project belongs to a team and an event.

Supported states:

draft
submitted

Draft projects can be edited before the deadline and are not shown in the public gallery.

Submitted projects are shown in the public gallery and can be judged.

The backend enforces event deadlines and team membership rules.

Closed events reject project creation and project editing.

## Judging System

Each event contains rubric criteria with numeric weights.

The default fixture rubric is:

functionality = 1.0
quality = 1.0
innovation = 1.0

Organizers can create events with different criteria and weights.

### Weighted Score

For every review:

weighted review score = sum(criterion score × criterion weight)

### Judge Normalization

The system normalizes judge scoring styles before combining project reviews.

For every judge it calculates:

- Number of reviews
- Mean
- Population standard deviation

The global mean and population standard deviation are calculated across all reviews.

The implementation applies shrinkage:

w = n / (n + 3)

shrunk mean = w × judge mean + (1 - w) × global mean

shrunk standard deviation = w × judge standard deviation + (1 - w) × global standard deviation

Each weighted review is then converted into a z-score:

z = (weighted score - shrunk judge mean) / shrunk judge standard deviation

Zero variance is protected against division by zero.

Project results include:

- Normalized score
- Raw average
- Review count

The normalization approach is intentionally deterministic and explainable rather than being presented as a statistical guarantee of fairness.

More detail is available in JUDGING.md.

## Judge Assignment

The organizer can request a target review count.

The assignment process:

1. Loads submitted projects.
2. Loads judges.
3. Uses track information when available.
4. Checks existing assignment counts.
5. Orders eligible judges by current load.
6. Assigns judges until the target review count is reached or eligible judges are exhausted.
7. Prevents duplicate judge/project assignments.

The organizer interface currently uses a target of three reviews when assigning judges.

## CSV Export

Organizer-only CSV export is available at:

GET /api/export.csv

The export contains:

project_id
title
judge_id
functionality
quality
innovation
comment

The CSV provides a raw-score view alongside the normalized organizer results.

## Audit Trail

Judging-related actions are recorded in the audit log.

Examples include:

- Score submission
- Assignment creation

Organizers can inspect recent audit information through the organizer interface and API.

## Repository Structure

dogfood-portal/
├── .dogfood.toml
├── acceptance-report.txt
├── ARCHITECTURE.md
├── DATA-MODEL.md
├── JUDGING.md
├── LICENSE
├── README.md
├── Dockerfile
├── docker-compose.yml
├── fixtures.json
├── run.py
├── spec.md
├── context.txt
├── tests/
│   ├── conftest.py
│   ├── test_api_permissions.py
│   ├── test_normalization.py
│   └── test_projects_teams.py
└── src/
    ├── backend/
    │   ├── app.py
    │   ├── auth.py
    │   ├── audit.py
    │   ├── models.py
    │   ├── normalization.py
    │   ├── seed.py
    │   ├── requirements.txt
    │   └── routes/
    │       ├── auth_routes.py
    │       ├── events.py
    │       ├── judging.py
    │       ├── projects.py
    │       └── teams.py
    └── frontend/
        ├── package.json
        ├── vite.config.js
        ├── index.html
        └── src/
            ├── App.jsx
            ├── AuthContext.jsx
            ├── Navbar.jsx
            ├── api.js
            ├── index.css
            ├── main.jsx
            ├── ui.jsx
            └── pages/
                ├── Gallery.jsx
                ├── JoinTeam.jsx
                ├── Judge.jsx
                ├── Login.jsx
                ├── MyTeam.jsx
                └── Organizer.jsx

## Documentation

ARCHITECTURE.md documents the frontend, backend, database, Docker architecture, authentication flow, and application data flow.

DATA-MODEL.md documents the database tables, relationships, fixture import process, team and project structure, and CSV export.

JUDGING.md documents judge assignment, rubric weights, weighted scoring, normalization, judge isolation, the audit trail, and known judging limitations.

## Known Limitations

This submission intentionally claims only T1 and T2.

Known limitations include:

- T3 is not implemented
- T4 is not implemented
- No email verification
- No password reset flow
- Flask uses the built-in development server
- Event publishing currently sets a publish flag rather than implementing a separate public-results publishing workflow
- Judge assignment uses a deterministic greedy strategy rather than an optimization solver
- Normalization is intentionally simple and explainable
- No advanced statistical outlier detection is implemented
- Hosted deployment is separate from the Docker and self-hosted deployment

These limitations are documented intentionally rather than hidden.

## Self-Hosted Requirement

The primary deployment target is local self-hosting.

The project is designed to run using:

docker compose up --build

without requiring:

- Cloud accounts
- Hosted databases
- External APIs
- Third-party authentication services

The public deployment, if configured, is an additional demonstration environment and does not replace the Docker deployment.

## Public Demo

Live Demo:

TBD

The Docker deployment remains the canonical self-hosted version of the project.

## Demo Video

The final demo should show one complete event lifecycle:

1. Organizer creates an event.
2. Participant creates a team.
3. Participant creates a project.
4. Participant submits the project.
5. Organizer adds and assigns judges.
6. Judge opens an assignment.
7. Judge submits a score.
8. Organizer views judging progress.
9. Organizer views normalized results.
10. Organizer exports CSV.
11. Role isolation is demonstrated.
12. The acceptance report is shown.

## License

This project is released under the MIT License.

See LICENSE for the complete license text.

## DOGFOOD 2026

Built for DOGFOOD 2026 as a self-hostable submission and judging portal.

Current verified scope:

Claimed tiers: T1 T2
Verified tiers: T1 T2
Acceptance checks: 7/7
Automated tests: 20 passed