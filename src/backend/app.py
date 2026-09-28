import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from models import db
from seed import run_seed
from auth import get_current_user

app = Flask(__name__, static_folder=None)
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
CORS(app, supports_credentials=True)

database_url = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://dogfood:dogfood@localhost:5432/dogfood",
)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

from routes.projects import bp as projects_bp
app.register_blueprint(projects_bp)

from routes.teams import bp as teams_bp
app.register_blueprint(teams_bp)

from routes.judging import bp as judging_bp
app.register_blueprint(judging_bp)

from routes.auth_routes import bp as auth_routes_bp
app.register_blueprint(auth_routes_bp)

from routes.events import bp as events_bp
app.register_blueprint(events_bp)


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/auth/me")
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "not logged in"}), 401
    return jsonify({"id": user.id, "email": user.email, "name": user.name, "role": user.role})


# Keep this LAST among the routes: it serves the React app for every non-API URL.
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "not found"}), 404
    full = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(full):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        run_seed()
    app.run(host="0.0.0.0", port=8080)