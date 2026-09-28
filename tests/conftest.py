import os
import sys
from datetime import datetime, timedelta, timezone

import pytest
from flask import Flask

sys.path.insert(
    0,
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "src",
            "backend",
        )
    ),
)

from models import (
    db,
    User,
    Session,
    Event,
    Track,
    Team,
    TeamMember,
    Project,
    Judge,
    Score,
)


@pytest.fixture()
def app():
    app = Flask(__name__)

    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    db.init_app(app)

    from routes.projects import bp as projects_bp
    from routes.teams import bp as teams_bp
    from routes.judging import bp as judging_bp
    from routes.events import bp as events_bp

    app.register_blueprint(projects_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(judging_bp)
    app.register_blueprint(events_bp)

    with app.app_context():
        db.create_all()

        now = datetime.now(timezone.utc)

        closed_event = Event(
            id="event_closed",
            name="Closed Event",
            submissions_close=now - timedelta(days=1),
        )

        open_event = Event(
            id="event_open",
            name="Open Event",
            submissions_close=now + timedelta(days=1),
        )

        db.session.add_all([
            closed_event,
            open_event,
        ])

        track = Track(
            id="track_web",
            event_id="event_open",
            name="Web",
        )
        db.session.add(track)

        organizer = User(
            id="user_organizer",
            email="organizer@test",
            name="Organizer",
            password_hash="test",
            role="organizer",
        )

        participant = User(
            id="user_participant",
            email="participant@test",
            name="Participant",
            password_hash="test",
            role="participant",
        )

        participant_2 = User(
            id="user_participant_2",
            email="participant2@test",
            name="Participant 2",
            password_hash="test",
            role="participant",
        )

        judge_a_user = User(
            id="user_judge_a",
            email="judgea@test",
            name="Judge A",
            password_hash="test",
            role="judge",
        )

        judge_b_user = User(
            id="user_judge_b",
            email="judgeb@test",
            name="Judge B",
            password_hash="test",
            role="judge",
        )

        db.session.add_all([
            organizer,
            participant,
            participant_2,
            judge_a_user,
            judge_b_user,
        ])
        db.session.flush()

        db.session.add_all([
            Session(
                token="organizer_token",
                user_id=organizer.id,
            ),
            Session(
                token="participant_token",
                user_id=participant.id,
            ),
            Session(
                token="participant_2_token",
                user_id=participant_2.id,
            ),
            Session(
                token="judge_a_token",
                user_id=judge_a_user.id,
            ),
            Session(
                token="judge_b_token",
                user_id=judge_b_user.id,
            ),
        ])

        open_team = Team(
            id="team_open",
            event_id="event_open",
            name="Open Team",
            lead_user_id=participant.id,
        )

        closed_team = Team(
            id="team_closed",
            event_id="event_closed",
            name="Closed Team",
            lead_user_id=participant.id,
        )

        db.session.add_all([
            open_team,
            closed_team,
        ])
        db.session.flush()

        db.session.add_all([
            TeamMember(
                team_id=open_team.id,
                user_id=participant.id,
            ),
            TeamMember(
                team_id=closed_team.id,
                user_id=participant.id,
            ),
        ])

        project_open = Project(
            id="project_open",
            event_id="event_open",
            team_id="team_open",
            track_id="track_web",
            title="Open Project",
            summary="Open project",
            status="submitted",
            submitted_at=now,
        )

        project_closed = Project(
            id="project_closed",
            event_id="event_closed",
            team_id="team_closed",
            title="Closed Project",
            summary="Closed project",
            status="submitted",
            submitted_at=now - timedelta(days=2),
        )

        db.session.add_all([
            project_open,
            project_closed,
        ])

        judge_a = Judge(
            user_id=judge_a_user.id,
            event_id="event_open",
            fixture_id="fixture_judge_a",
            tracks="track_web",
        )

        judge_b = Judge(
            user_id=judge_b_user.id,
            event_id="event_open",
            fixture_id="fixture_judge_b",
            tracks="track_web",
        )

        db.session.add_all([
            judge_a,
            judge_b,
        ])
        db.session.flush()

        db.session.add_all([
            Score(
                judge_id=judge_a.id,
                project_id="project_open",
                criteria={
                    "functionality": 4,
                    "quality": 4,
                    "innovation": 4,
                },
                comment="Judge A score",
            ),
            Score(
                judge_id=judge_b.id,
                project_id="project_open",
                criteria={
                    "functionality": 5,
                    "quality": 5,
                    "innovation": 5,
                },
                comment="Judge B score",
            ),
        ])

        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def auth_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }