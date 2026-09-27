from flask import Blueprint, request, jsonify
from models import db, Team, TeamMember, User, new_id
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
    name = data.get("name", f"{user.name}'s Team")

    team = Team(event_id=event_id, name=name, lead_user_id=user.id)
    db.session.add(team)
    db.session.flush()
    db.session.add(TeamMember(team_id=team.id, user_id=user.id))
    db.session.commit()

    return jsonify(team_to_dict(team)), 201


@bp.route("/api/teams/<team_id>", methods=["GET"])
@require_login
def get_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"error": "not found"}), 404
    return jsonify(team_to_dict(team))


@bp.route("/api/teams/join", methods=["POST"])
@require_login
def join_team():
    data = request.get_json(silent=True) or {}
    user = request.current_user
    invite_token = data.get("invite_token")

    team = Team.query.filter_by(invite_token=invite_token).first()
    if not team:
        return jsonify({"error": "invalid invite link"}), 404

    existing = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if existing:
        return jsonify(team_to_dict(team)), 200

    db.session.add(TeamMember(team_id=team.id, user_id=user.id))
    db.session.commit()
    return jsonify(team_to_dict(team)), 200