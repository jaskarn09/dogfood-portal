import secrets
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Session, new_id
from auth import require_login

bp = Blueprint("auth_routes", __name__)


@bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    name = data.get("name")
    password = data.get("password")
    role = "participant"  # self-signup is always a participant; organizers promote judges

    if not email or not name or not password:
        return jsonify({"error": "email, name and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 400

    user = User(
        id=new_id(),
        email=email,
        name=name,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"id": user.id, "email": user.email, "role": user.role}), 201


@bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid email or password"}), 401

    token = secrets.token_urlsafe(24)
    db.session.add(Session(token=token, user_id=user.id))
    db.session.commit()

    resp = jsonify({"id": user.id, "email": user.email, "role": user.role})
    resp.set_cookie(
        "session", token,
        httponly=True, samesite="Lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    return resp, 200


@bp.route("/api/auth/logout", methods=["POST"])
@require_login
def logout():
    token = request.cookies.get("session")
    if token:
        Session.query.filter_by(token=token).delete()
        db.session.commit()
    resp = jsonify({"status": "logged out"})
    resp.delete_cookie("session")
    return resp, 200