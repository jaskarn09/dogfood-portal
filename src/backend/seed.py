import json
import os
import secrets
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash

from models import (
    db, User, Session, Event, Track, Team, TeamMember,
    Project, Judge, Assignment, RubricCriterion, Score, new_id
)

FIXTURES_PATH = os.path.join(os.path.dirname(__file__), "fixtures.json")

# Fixed test accounts the checker will use.
# Judge A and Judge B are picked because both have many scores in the fixture data.
TEST_ACCOUNTS = {
    "organizer":   {"email": "organizer@test.dev",   "role": "organizer"},
    "participant": {"email": None,                   "role": "participant"},  # filled from a real team lead
    "judge_a":     {"email": None,                    "role": "judge", "fixture_judge_id": "jdg_24"},
    "judge_b":     {"email": None,                    "role": "judge", "fixture_judge_id": "jdg_26"},
}

DEV_PASSWORD = "password123"


def parse_dt(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def get_or_create_user(email, name, role):
    user = User.query.filter_by(email=email).first()
    if user:
        return user
    user = User(
        id=new_id(),
        email=email,
        name=name,
        password_hash=generate_password_hash(DEV_PASSWORD),
        role=role,
    )
    db.session.add(user)
    db.session.flush()
    return user


def get_or_create_session(user, fixed_token=None):
    existing = Session.query.filter_by(user_id=user.id).first()
    if existing:
        return existing
    token = fixed_token or secrets.token_urlsafe(16)
    sess = Session(token=token, user_id=user.id)
    db.session.add(sess)
    db.session.flush()
    return sess


def run_seed():
    # If events already exist, we've seeded before -- don't duplicate.
    if Event.query.first() is not None:
        print("Database already seeded, skipping fixture load.")
        print_test_tokens()
        return

    with open(FIXTURES_PATH, encoding="utf-8") as f:
        fixture = json.load(f)

    # --- Event ---
    ev = fixture["event"]
    event = Event(
        id=ev["id"],
        name=ev["name"],
        submissions_close=parse_dt(ev["submissions_close"]),
        published=False,
    )
    db.session.add(event)

    # --- Tracks ---
    track_map = {}
    for t in fixture["tracks"]:
        track = Track(id=t["id"], event_id=event.id, name=t["name"])
        db.session.add(track)
        track_map[t["id"]] = track
    db.session.flush()

    # --- Rubric ---
    for name, weight in [("functionality", 1.0), ("quality", 1.0), ("innovation", 1.0)]:
        db.session.add(RubricCriterion(event_id=event.id, name=name, weight=weight))

    # --- Judges (as users too) ---
    judge_user_by_fixture_id = {}
    judge_row_by_fixture_id = {}
    for j in fixture["judges"]:
        user = get_or_create_user(j["email"], j["name"], "judge")
        judge = Judge(
            user_id=user.id,
            event_id=event.id,
            tracks=",".join(j.get("tracks", [])),
            fixture_id=j["id"],
        )
        db.session.add(judge)
        db.session.flush()
        judge_user_by_fixture_id[j["id"]] = user
        judge_row_by_fixture_id[j["id"]] = judge

    # --- Teams + members ---
    team_map = {}
    for t in fixture["teams"]:
        team = Team(id=t["id"], event_id=event.id, name=t["name"])
        db.session.add(team)
        db.session.flush()
        lead_user = None
        for email in t.get("members", []):
            user = get_or_create_user(email, email.split("@")[0], "participant")
            db.session.add(TeamMember(team_id=team.id, user_id=user.id))
            if lead_user is None:
                lead_user = user
        if lead_user:
            team.lead_user_id = lead_user.id
        team_map[t["id"]] = team
    db.session.flush()

    # --- Projects (handle the known duplicate: prj_07 / prj_41, same team) ---
    projects_by_team = {}
    for p in fixture["projects"]:
        projects_by_team.setdefault(p["team"], []).append(p)

    project_id_map = {}
    for team_id, plist in projects_by_team.items():
        plist_sorted = sorted(plist, key=lambda p: p["submitted_at"])
        latest = plist_sorted[-1]  # keep only the newest submission per team
        skipped = plist_sorted[:-1]

        project = Project(
            id=latest["id"],
            event_id=event.id,
            team_id=team_id,
            track_id=latest.get("track"),
            title=latest["title"],
            summary=latest.get("summary"),
            repo_url=latest.get("repo_url"),
            status="submitted",
            submitted_at=parse_dt(latest["submitted_at"]),
        )
        db.session.add(project)
        project_id_map[latest["id"]] = project

        for old in skipped:
            print(f"  skipping duplicate project {old['id']} "
                  f"(team {team_id} already has {latest['id']} as the latest submission)")
    db.session.flush()

    # --- Scores + assignments ---
    seen_assignment = set()
    for s in fixture["scores"]:
        judge_row = judge_row_by_fixture_id.get(s["judge"])
        project = project_id_map.get(s["project"])
        if not judge_row or not project:
            continue
        key = (judge_row.id, project.id)
        if key not in seen_assignment:
            db.session.add(Assignment(judge_id=judge_row.id, project_id=project.id))
            seen_assignment.add(key)
        db.session.add(Score(
            judge_id=judge_row.id,
            project_id=project.id,
            criteria=s["criteria"],
            comment=s.get("comment") or "",
        ))

    db.session.commit()

    # --- Test accounts on top of fixture data ---
    organizer_user = get_or_create_user("organizer@test.dev", "Test Organizer", "organizer")

    # Pick a real team lead as the participant test account.
    any_team = fixture["teams"][0]
    participant_email = any_team["members"][0]
    participant_user = User.query.filter_by(email=participant_email).first()

    judge_a_user = judge_user_by_fixture_id["jdg_24"]
    judge_b_user = judge_user_by_fixture_id["jdg_26"]

    get_or_create_session(organizer_user, fixed_token="org_seed_token_001")
    get_or_create_session(participant_user, fixed_token="prt_seed_token_001")
    get_or_create_session(judge_a_user, fixed_token="jdga_seed_token_001")
    get_or_create_session(judge_b_user, fixed_token="jdgb_seed_token_001")

    db.session.commit()
    print("Fixture data loaded.")
    print_test_tokens()


def print_test_tokens():
    print()
    print("seeded. test logins:")
    print("  organizer    Cookie: session=org_seed_token_001")
    print("  judge_a      Cookie: session=jdga_seed_token_001   (jdg_24)")
    print("  judge_b      Cookie: session=jdgb_seed_token_001   (jdg_26)")
    print("  participant  Cookie: session=prt_seed_token_001")
    print()