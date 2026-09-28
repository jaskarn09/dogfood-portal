from flask import Blueprint, request, jsonify
from models import db, Team, TeamMember, Event
from auth import require_login

bp = Blueprint("teams", __name__)


def team_to_dict(t):
    members = TeamMember.query.filter_by(team_id=t.id).all()

    return {
        "id": t.id,
        "event_id": t.event_id,
        "name": t.name,
        "lead_user_id": t.lead_user_id,
        "invite_token": t.invite_token,
        "member_count": len(members),
    }


@bp.route("/api/teams", methods=["POST"])
@require_login
def create_team():
    data = request.get_json(silent=True) or {}
    user = request.current_user

    event_id = data.get("event_id")
    name = data.get("name", f"{user.name}'s Team").strip()

    if not event_id:
        return jsonify({"error": "event_id is required"}), 400

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "event not found"}), 404

    if not name:
        return jsonify({"error": "team name is required"}), 400

    team = Team(
        event_id=event.id,
        name=name,
        lead_user_id=user.id,
    )

    db.session.add(team)
    db.session.flush()

    db.session.add(
        TeamMember(
            team_id=team.id,
            user_id=user.id,
        )
    )

    db.session.commit()

    return jsonify(team_to_dict(team)), 201


@bp.route("/api/teams/mine", methods=["GET"])
@require_login
def my_teams():
    user = request.current_user

    memberships = TeamMember.query.filter_by(
        user_id=user.id
    ).all()

    teams = []

    for membership in memberships:
        team = Team.query.get(membership.team_id)
        if team:
            teams.append(team_to_dict(team))

    return jsonify(teams)


@bp.route("/api/teams/join", methods=["POST"])
@require_login
def join_team():
    data = request.get_json(silent=True) or {}
    user = request.current_user

    invite_token = data.get("invite_token")

    if not invite_token:
        return jsonify({"error": "invite_token is required"}), 400

    team = Team.query.filter_by(
        invite_token=invite_token
    ).first()

    if not team:
        return jsonify({"error": "invalid invite link"}), 404

    existing = TeamMember.query.filter_by(
        team_id=team.id,
        user_id=user.id,
    ).first()

    if existing:
        return jsonify(team_to_dict(team)), 200

    member_count = TeamMember.query.filter_by(
        team_id=team.id
    ).count()

    if member_count >= 4:
        return jsonify({"error": "team is full (maximum 4 members)"}), 400

    db.session.add(
        TeamMember(
            team_id=team.id,
            user_id=user.id,
        )
    )

    db.session.commit()

    return jsonify(team_to_dict(team)), 200


@bp.route("/api/teams/<team_id>", methods=["GET"])
@require_login
def get_team(team_id):
    user = request.current_user

    team = Team.query.get(team_id)

    if not team:
        return jsonify({"error": "not found"}), 404

    member = TeamMember.query.filter_by(
        team_id=team.id,
        user_id=user.id,
    ).first()

    if not member:
        return jsonify({"error": "forbidden"}), 403

    return jsonify(team_to_dict(team))