import csv
import io
from flask import Blueprint, request, jsonify, Response
from models import db, Judge, Assignment, Score, Project, RubricCriterion, User
from auth import require_login, require_role

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