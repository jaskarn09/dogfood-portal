from conftest import auth_headers


def test_protected_endpoint_without_login_returns_401(client):
    response = client.get("/api/judge/scores")

    assert response.status_code == 401


def test_participant_cannot_use_judge_scores(client):
    response = client.get(
        "/api/judge/scores",
        headers=auth_headers("participant_token"),
    )

    assert response.status_code == 403


def test_judge_can_read_own_scores(client):
    response = client.get(
        "/api/judge/scores",
        headers=auth_headers("judge_a_token"),
    )

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 1
    assert data[0]["comment"] == "Judge A score"


def test_judge_cannot_read_peer_scores(client):
    response = client.get(
        "/api/judge/scores?judge=fixture_judge_b",
        headers=auth_headers("judge_a_token"),
    )

    assert response.status_code == 403


def test_participant_cannot_access_organizer_csv(client):
    response = client.get(
        "/api/export.csv",
        headers=auth_headers("participant_token"),
    )

    assert response.status_code == 403


def test_organizer_can_access_csv(client):
    response = client.get(
        "/api/export.csv",
        headers=auth_headers("organizer_token"),
    )

    assert response.status_code == 200
    assert "," in response.get_data(as_text=True).splitlines()[0]