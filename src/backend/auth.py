from functools import wraps
from flask import request, jsonify
from models import Session, User


def get_current_user():
    """Read the session cookie (or Bearer header) and return the User, or None."""
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer "):]
    if not token:
        return None
    sess = Session.query.filter_by(token=token).first()
    if not sess:
        return None
    return User.query.get(sess.user_id)


def require_login(view_func):
    """Blocks the request with 401 JSON if there's no valid logged-in user."""
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "not logged in"}), 401
        request.current_user = user
        return view_func(*args, **kwargs)
    return wrapper


def require_role(*roles):
    """Blocks the request with 403 JSON if the logged-in user's role isn't in roles.
    Use together with require_login, e.g.:
        @require_login
        @require_role("organizer")
        def my_view(): ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            user = getattr(request, "current_user", None) or get_current_user()
            if not user:
                return jsonify({"error": "not logged in"}), 401
            if user.role not in roles:
                return jsonify({"error": "forbidden"}), 403
            request.current_user = user
            return view_func(*args, **kwargs)
        return wrapper
    return decorator