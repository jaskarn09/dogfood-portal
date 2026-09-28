from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Event, Track, RubricCriterion, Judge, User
from auth import require_login, require_role
from audit import log_action

bp = Blueprint("events", __name__)


def parse_dt(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def event_to_dict(e):
    tracks = Track.query.filter_by(event_id=e.id).all()
    rubric = RubricCriterion.query.filter_by(event_id=e.id).all()
    return {
        "id": e.id,
        "name": e.name,
        "submissions_close": e.submissions_close.isoformat(),
        "published": e.published,
        "tracks": [{"id": t.id, "name": t.name} for t in tracks],
        "rubric": [{"name": r.name, "weight": r.weight} for r in rubric],
    }


@bp.route("/api/events", methods=["GET"])
def list_events():
    return jsonify([event_to_dict(e) for e in Event.query.all()])


@bp.route("/api/events", methods=["POST"])
@require_login
@require_role("organizer")
def create_event():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    close = data.get("submissions_close")
    if not name or not close:
        return jsonify({"error": "name and submissions_close are required"}), 400

    event = Event(name=name, submissions_close=parse_dt(close))
    db.session.add(event)
    db.session.flush()

    for track_name in data.get("tracks", []):
        db.session.add(Track(event_id=event.id, name=track_name))

    rubric = data.get("rubric") or {"functionality": 1.0, "quality": 1.0, "innovation": 1.0}
    for crit, weight in rubric.items():
        db.session.add(RubricCriterion(event_id=event.id, name=crit, weight=float(weight)))

    log_action(request.current_user, "event_created", target=event.id)
    db.session.commit()
    return jsonify(event_to_dict(event)), 201


@bp.route("/api/events/<event_id>/publish", methods=["POST"])
@require_login
@require_role("organizer")
def publish_event(event_id):
    event = Event.query.get(event_id)
    if not event:
        return jsonify({"error": "not found"}), 404
    event.published = True
    log_action(request.current_user, "results_published", target=event.id)
    db.session.commit()
    return jsonify(event_to_dict(event)), 200

@bp.route("/api/events/<event_id>/judges", methods=["POST"])
@require_login
@require_role("organizer")
def add_judge(event_id):
    data = request.get_json(silent=True) or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user:
        return jsonify({"error": "no user with that email"}), 404

    if user.role in ("organizer", "admin"):
        return jsonify({"error": "that account is an organizer and can't also be a judge"}), 400

    user.role = "judge"

    if not Judge.query.filter_by(user_id=user.id, event_id=event_id).first():
        db.session.add(Judge(
            user_id=user.id,
            event_id=event_id,
            tracks=",".join(data.get("tracks", [])),
            added_by=request.current_user.id,
        ))

    log_action(request.current_user, "judge_added", target=user.email)
    db.session.commit()
    return jsonify({"status": "judge added", "email": user.email, "role": user.role}), 200


@bp.route("/api/events/<event_id>/judges", methods=["GET"])
@require_login
@require_role("organizer")
def list_judges(event_id):
    track_names = {t.id: t.name for t in Track.query.filter_by(event_id=event_id).all()}
    result = []
    for j in Judge.query.filter_by(event_id=event_id).all():
        u = User.query.get(j.user_id)
        adder = User.query.get(j.added_by) if j.added_by else None
        result.append({
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "added_by": adder.name if adder else None,
            "tracks": [track_names.get(t, t) for t in (j.tracks or "").split(",") if t],
        })
    return jsonify(result)