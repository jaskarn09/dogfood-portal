from conftest import auth_headers

from models import db, User, Session


def test_create_team_requires_event(client):
    response = client.post(
        "/api/teams",
        headers=auth_headers("participant_token"),
        json={"name": "No Event Team"},
    )

    assert response.status_code == 400


def test_participant_can_list_their_teams(client):
    response = client.get(
        "/api/teams/mine",
        headers=auth_headers("participant_token"),
    )

    assert response.status_code == 200

    teams = response.get_json()

    assert len(teams) == 2
    assert {team["id"] for team in teams} == {
        "team_open",
        "team_closed",
    }


def test_non_member_cannot_view_team_invite_token(client):
    response = client.get(
        "/api/teams/team_open",
        headers=auth_headers("participant_2_token"),
    )

    assert response.status_code == 403


def test_team_join_enforces_four_member_limit(client, app):
    team_response = client.get(
        "/api/teams/mine",
        headers=auth_headers("participant_token"),
    )
    assert team_response.status_code == 200

    open_team = next(
        team for team in team_response.get_json()
        if team["id"] == "team_open"
    )
    invite_token = open_team["invite_token"]

    tokens = []

    with app.app_context():
        for index in range(4):
            user_id = f"extra_user_{index}"
            token = f"extra_token_{index}"

            db.session.add(
                User(
                    id=user_id,
                    email=f"extra{index}@test",
                    name=f"Extra {index}",
                    password_hash="test",
                    role="participant",
                )
            )
            db.session.add(
                Session(
                    token=token,
                    user_id=user_id,
                )
            )
            tokens.append(token)

        db.session.commit()

    # Existing team has one member. The next three should join successfully,
    # making the team size four.
    for token in tokens[:3]:
        response = client.post(
            "/api/teams/join",
            headers=auth_headers(token),
            json={"invite_token": invite_token},
        )
        assert response.status_code == 200

    response = client.post(
        "/api/teams/join",
        headers=auth_headers(tokens[3]),
        json={"invite_token": invite_token},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "team is full (maximum 4 members)"


def test_closed_event_refuses_project_creation(client):
    response = client.post(
        "/api/projects",
        headers=auth_headers("participant_token"),
        json={
            "event_id": "event_closed",
            "title": "Should Be Refused",
            "summary": "Closed event test",
            "status": "draft",
        },
    )

    assert response.status_code == 403


def test_closed_event_refuses_project_edit(client):
    response = client.patch(
        "/api/projects/project_closed",
        headers=auth_headers("participant_token"),
        json={
            "title": "Should Still Be Closed",
            "status": "draft",
        },
    )

    assert response.status_code == 403


def test_participant_can_create_draft_on_open_event(client):
    response = client.post(
        "/api/projects",
        headers=auth_headers("participant_token"),
        json={
            "event_id": "event_open",
            "title": "Draft Project",
            "summary": "Draft test",
            "track_id": "track_web",
            "status": "draft",
        },
    )

    assert response.status_code == 200
    assert response.get_json()["status"] == "draft"


def test_non_member_cannot_edit_project(client):
    response = client.patch(
        "/api/projects/project_open",
        headers=auth_headers("participant_2_token"),
        json={
            "title": "Unauthorized Edit",
        },
    )

    assert response.status_code == 403