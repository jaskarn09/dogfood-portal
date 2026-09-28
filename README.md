# DOGFOOD Portal

A self-hostable hackathon submission and judging platform built for DOGFOOD 2026.

The portal supports event creation, participant teams, project submissions, judge assignments, scoring, normalized results, CSV export, and audit logging.

The project is designed to run locally with Docker and PostgreSQL without requiring cloud services or external APIs.

## What It Supports

### Participants

Participants can:

- Sign up and log in
- Create a team for an open event
- Join an existing team using an invite token
- See their team and members
- Create a project draft
- Edit a project before the deadline
- Select a track
- Save a draft
- Submit a project
- View submitted projects in the public gallery

### Judges

Judges can:

- Log in
- See assigned projects
- Score projects using the event rubric
- Add comments
- Edit their own scores
- See the judging panel for their event

Judges cannot access another judge's scores.

### Organizers

Organizers can:

- Create events
- Define tracks
- Define rubric criteria and weights
- Add judges to events
- Assign judges to projects
- View judging progress
- View normalized results
- View the audit log
- Export judging data as CSV
- Mark results as published

## Technology Stack

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS 4

### Backend

- Python
- Flask
- Flask-SQLAlchemy
- PostgreSQL 16
- psycopg2

### Infrastructure

- Docker
- Docker Compose

## Project Structure

```text
dogfood-portal/
├── .dogfood.toml
├── acceptance-report.txt
├── docker-compose.yml
├── Dockerfile
├── LICENSE
├── README.md
├── ARCHITECTURE.md
├── DATA-MODEL.md
├── JUDGING.md
├── run.py
├── fixtures.json
├── spec.md
├── context.txt
├── example.dogfood.toml
├── tests/
│   ├── conftest.py
│   ├── test_normalization.py
│   ├── test_api_permissions.py
│   └── test_projects_teams.py
└── src/
    ├── backend/
    │   ├── app.py
    │   ├── models.py
    │   ├── seed.py
    │   ├── auth.py
    │   ├── audit.py
    │   ├── normalization.py
    │   ├── requirements.txt
    │   └── routes/
    │       ├── auth_routes.py
    │       ├── events.py
    │       ├── projects.py
    │       ├── teams.py
    │       └── judging.py
    │
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
            └── pages/
                ├── Gallery.jsx
                ├── Login.jsx
                ├── MyTeam.jsx
                ├── JoinTeam.jsx
                ├── Judge.jsx
                └── Organizer.jsx
```

## Running the Application

### Requirements

The normal development workflow requires:

- Docker Desktop
- Git
- Node.js and npm
- Python

Docker is the main runtime used by the project.

### Start the Application

From the project root:

```powershell
docker compose up --build
```

The portal will be available at:

```text
http://localhost:8080
```

The application creates the database tables and loads fixture data automatically when the database is initialized.

### Frontend Development Mode

For frontend development, use a second terminal:

```powershell
cd src\frontend
npm install
npm run dev
```

Vite runs the frontend on:

```text
http://localhost:5173
```

The Vite configuration proxies `/api` requests to:

```text
http://localhost:8080
```

## Resetting the Database

To remove the PostgreSQL volume and recreate the seeded database:

```powershell
docker compose down -v
docker compose up --build
```

The `-v` option removes the database volume, so fixture data will be imported again.

## Seeded Accounts

The development seed creates fixed test sessions.

Default password for seeded accounts:

```text
password123
```

### Organizer

```text
Email: organizer@test.dev
Password: password123
```

### Participant

The seeded participant account is taken from the first member of the first fixture team.

The fixed session token is:

```text
prt_seed_token_001
```

### Judge A

```text
Password: password123
Cookie token: jdga_seed_token_001
Fixture judge: jdg_24
```

### Judge B

```text
Password: password123
Cookie token: jdgb_seed_token_001
Fixture judge: jdg_26
```

The exact participant email is determined from `fixtures.json` during seeding.

## Authentication

The application uses a custom database-backed session system rather than Flask's built-in session.

Authentication can use a session cookie or a Bearer header.

Protected API requests return JSON `401` or `403` responses rather than redirecting to a login page.

## Main API Areas

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/health
```

### Events

```text
GET  /api/events
POST /api/events
POST /api/events/<event_id>/publish
GET  /api/events/<event_id>/judges
POST /api/events/<event_id>/judges
```

### Teams

```text
POST /api/teams
GET  /api/teams/mine
GET  /api/teams/<team_id>
POST /api/teams/join
```

### Projects

```text
GET   /api/projects
GET   /api/projects/mine
POST  /api/projects
PATCH /api/projects/<project_id>
```

### Judging

```text
GET  /api/judge/assignments
GET  /api/judge/scores
POST /api/judge/scores
GET  /api/judge/peers
```

### Organizer

```text
GET  /api/organizer/progress
GET  /api/organizer/results
GET  /api/organizer/audit
GET  /api/export.csv
POST /api/events/<event_id>/assignments
```

## Participant Workflow

The normal participant workflow is:

```text
Organizer creates an open event
        ↓
Participant opens My Team
        ↓
Participant creates a team
        ↓
Participant shares the invite link
        ↓
Other participants join the team
        ↓
Team lead creates a project draft
        ↓
Team lead edits the project
        ↓
Team lead submits the project
        ↓
Submitted project appears in the public gallery
```

The fixture event is intentionally closed. To demonstrate a new participant submission, the organizer should create a new event with a future submission deadline.

## Judging Workflow

The judging workflow is:

```text
Organizer creates event
        ↓
Organizer adds judges
        ↓
Organizer assigns judges to projects
        ↓
Judge opens assigned projects
        ↓
Judge submits scores and comments
        ↓
Organizer views progress
        ↓
Organizer views normalized results
        ↓
Organizer can export CSV
```

## Running the Acceptance Checker

The official acceptance checker can be run from the project root:

```powershell
python run.py .dogfood.toml
```

To save the output to the required report file:

```powershell
python run.py .dogfood.toml | Out-File -Encoding utf8 acceptance-report.txt
```

The project claims:

```text
T1 T2
```

The acceptance checker verifies seven checks:

```text
T1 gallery is public
T1 project from fixtures shown
T1 closed event refuses submissions
T2 judge sees own scores
T2 judge cannot see peer scores
T2 participant blocked
T2 csv export works
```

## Running Tests

From the project root:

```powershell
python -m pytest -q
```

The current test suite covers:

- Authentication and permission checks
- Judge score isolation
- CSV authorization
- Team membership
- Team size limits
- Team invite access
- Project permissions
- Deadline enforcement
- Draft creation
- Project editing
- Normalization edge cases

## Frontend Checks

From:

```text
src\frontend
```

run:

```powershell
npm run lint
```

and:

```powershell
npm run build
```

Both should complete without errors.

## Docker Verification

For a clean local verification:

```powershell
docker compose down -v
docker compose up --build
```

Then verify:

```text
http://localhost:8080
```

The application should start with its PostgreSQL database and seeded fixture data.

## Offline Operation

After the Docker images and dependencies have already been built, the application is intended to operate without network access during normal local use.

The application does not require:

- Cloud accounts
- Hosted databases
- External APIs
- Hosted judging services

## Fixture Data

The seed process reads:

```text
fixtures.json
```

and loads the event, tracks, judges, teams, projects, assignments, scores, and related data.

A duplicate project exists in the source fixture:

```text
prj_07
prj_41
```

Both belong to the same team.

The seed keeps the latest project record and skips the older duplicate so that the database's unique team/event constraint remains valid.

## License

This project is released under the MIT License.

See:

```text
LICENSE
```

## Known Limitations

This implementation intentionally focuses on the T1 and T2 scope.

Known limitations include:

- T3 and T4 are not implemented.
- The backend uses Flask's development server rather than a production WSGI server.
- There is no email verification system.
- There is no password reset flow.
- The event `published` flag currently records the publish action but does not independently control the public gallery.
- Database tables are created using `db.create_all()` rather than a migration system such as Alembic.
- The project is primarily designed for the DOGFOOD 2026 hackathon and local/self-hosted execution.

## T1 / T2 Scope

The project claims:

```text
T1
T2
```

The goal is to provide a working self-hostable submission and judging platform with:

- Authentication and role enforcement
- Event management
- Team formation
- Project draft/edit/submit workflow
- Public project gallery
- Judge assignment
- Judge scoring
- Judge isolation
- Normalized results
- CSV export
- Audit logging
- Docker-based local deployment

## Final Verification Checklist

Before submitting the project:

```text
[ ] docker compose down -v
[ ] docker compose up --build
[ ] Portal loads at localhost:8080
[ ] Participant workflow works
[ ] Judge workflow works
[ ] Organizer workflow works
[ ] python -m pytest -q
[ ] npm run lint
[ ] npm run build
[ ] python run.py .dogfood.toml
[ ] acceptance-report.txt updated
[ ] Offline test completed
[ ] Fresh clone test completed
[ ] Demo video recorded
[ ] Final git commit created
[ ] Changes pushed to GitHub
```