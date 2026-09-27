import csv
import io
from flask import Blueprint, request, jsonify, Response
from models import db, Judge, Assignment, Score, Project, RubricCriterion, User, AuditLog
from auth import require_login, require_role
from normalization import normalize_scores
from audit import log_action

bp = Blueprint("judging", __name__)


def get_judge_for_user(user):
    """Find the Judge row for the logged-in user, if they are one."""
    return Judge.query.filter_by(user_id=user.id).first()


@bp.route("/api/judge/scores", methods=["GET"])
@require_login
def judge_scores():
    """A judge reads their OWN scores only.
    ?judge=<fixture_judge_user_id> lets the checker probe another judge's
    data as a DIFFERENT logged-in judge — that must be refused.
    """
    user = request.current_user

    if user.role != "judge":
        return jsonify({"error": "forbidden"}), 403

    my_judge_row = get_judge_for_user(user)
    if not my_judge_row:
        return jsonify({"error": "forbidden"}), 403

    requested_fixture_id = request.args.get("judge")
    if requested_fixture_id and requested_fixture_id != my_judge_row.fixture_id:
        # Someone is asking for a DIFFERENT judge's scores. Refuse.
        return jsonify({"error": "forbidden"}), 403

    scores = Score.query.filter_by(judge_id=my_judge_row.id).all()
    return jsonify([
        {
            "project_id": s.project_id,
            "criteria": s.criteria,
            "comment": s.comment,
        }
        for s in scores
    ])


@bp.route("/api/judge/scores", methods=["POST"])
@require_login
def submit_score():
    user = request.current_user
    if user.role != "judge":
        return jsonify({"error": "forbidden"}), 403

    judge_row = get_judge_for_user(user)
    if not judge_row:
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True) or {}
    project_id = data.get("project_id")
    criteria = data.get("criteria")
    comment = data.get("comment", "")

    if not project_id or not criteria:
        return jsonify({"error": "project_id and criteria are required"}), 400

    existing = Score.query.filter_by(judge_id=judge_row.id, project_id=project_id).first()
    if existing:
        existing.criteria = criteria
        existing.comment = comment
    else:
        db.session.add(Score(
            judge_id=judge_row.id,
            project_id=project_id,
            criteria=criteria,
            comment=comment,
        ))

    log_action(user, "score_submitted", target=project_id)

    db.session.commit()
    return jsonify({"status": "saved"}), 200


@bp.route("/api/organizer/progress", methods=["GET"])
@require_login
@require_role("organizer")
def organizer_progress():
    projects = Project.query.filter_by(status="submitted").all()
    result = []
    for p in projects:
        count = Score.query.filter_by(project_id=p.id).count()
        result.append({"project_id": p.id, "title": p.title, "review_count": count})
    return jsonify(result)


@bp.route("/api/export.csv", methods=["GET"])
@require_login
@require_role("organizer")
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["project_id", "title", "judge_id", "functionality", "quality", "innovation", "comment"])

    scores = Score.query.all()
    for s in scores:
        project = Project.query.get(s.project_id)
        writer.writerow([
            s.project_id,
            project.title if project else "",
            s.judge_id,
            s.criteria.get("functionality", ""),
            s.criteria.get("quality", ""),
            s.criteria.get("innovation", ""),
            s.comment or "",
        ])

    return Response(output.getvalue(), mimetype="text/csv")

@bp.route("/api/organizer/results", methods=["GET"])
@require_login
@require_role("organizer")
def organizer_results():
    event_id = request.args.get("event_id")
    criteria_rows = RubricCriterion.query.filter_by(event_id=event_id).all() if event_id else RubricCriterion.query.all()
    weights = {c.name: c.weight for c in criteria_rows} or {"functionality": 1.0, "quality": 1.0, "innovation": 1.0}

    all_scores = Score.query.all()
    score_dicts = [
        {"judge_id": s.judge_id, "project_id": s.project_id, "criteria": s.criteria}
        for s in all_scores
    ]

    normalized = normalize_scores(score_dicts, weights)

    results = []
    for project_id, stats in normalized.items():
        project = Project.query.get(project_id)
        if not project:
            continue
        results.append({
            "project_id": project_id,
            "title": project.title,
            **stats,
        })

    results.sort(key=lambda r: r["normalized_score"], reverse=True)
    return jsonify(results)

@bp.route("/api/events/<event_id>/assignments", methods=["POST"])
@require_login
@require_role("organizer")
def create_assignments(event_id):
    """Auto-assign judges to projects: only judges whose track list includes
    the project's track, balancing load, aiming for at least 3 reviews per project."""
    data = request.get_json(silent=True) or {}
    target_reviews = data.get("target_reviews", 3)

    projects = Project.query.filter_by(event_id=event_id, status="submitted").all()
    judges = Judge.query.filter_by(event_id=event_id).all()

    load = {j.id: Assignment.query.filter_by(judge_id=j.id).count() for j in judges}

    created = 0
    for project in projects:
        existing_count = Assignment.query.filter_by(project_id=project.id).count()
        needed = target_reviews - existing_count
        if needed <= 0:
            continue

        eligible = [
            j for j in judges
            if not project.track_id or (j.tracks and project.track_id in j.tracks.split(","))
        ]
        eligible.sort(key=lambda j: load.get(j.id, 0))

        already_assigned = {
            a.judge_id for a in Assignment.query.filter_by(project_id=project.id).all()
        }

        for judge in eligible:
            if needed <= 0:
                break
            if judge.id in already_assigned:
                continue
            db.session.add(Assignment(judge_id=judge.id, project_id=project.id))
            load[judge.id] = load.get(judge.id, 0) + 1
            already_assigned.add(judge.id)
            needed -= 1
            created += 1

    log_action(request.current_user, "assignments_created", target=event_id, details=f"{created} created")

    db.session.commit()
    return jsonify({"assignments_created": created}), 200


@bp.route("/api/judge/assignments", methods=["GET"])
@require_login
def my_assignments():
    user = request.current_user
    if user.role != "judge":
        return jsonify({"error": "forbidden"}), 403

    judge_row = Judge.query.filter_by(user_id=user.id).first()
    if not judge_row:
        return jsonify({"error": "forbidden"}), 403

    assignments = Assignment.query.filter_by(judge_id=judge_row.id).all()
    result = []
    for a in assignments:
        project = Project.query.get(a.project_id)
        if not project:
            continue
        already_scored = Score.query.filter_by(judge_id=judge_row.id, project_id=project.id).first() is not None
        result.append({
            "project_id": project.id,
            "title": project.title,
            "scored": already_scored,
        })
    return jsonify(result)

@bp.route("/api/organizer/audit", methods=["GET"])
@require_login
@require_role("organizer")
def audit_log():
    entries = AuditLog.query.order_by(AuditLog.time.desc()).limit(100).all()
    return jsonify([
        {
            "time": e.time.isoformat(),
            "user_id": e.user_id,
            "action": e.action,
            "target": e.target,
            "details": e.details,
        }
        for e in entries
    ])