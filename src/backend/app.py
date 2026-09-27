import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, Session, User
from seed import run_seed
from auth import get_current_user
from routes.projects import bp as projects_bp

app = Flask(__name__, static_folder="static", static_url_path="/")
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

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/auth/me")
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "not logged in"}), 401
    return jsonify({"id": user.id, "email": user.email, "role": user.role})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        run_seed()
    app.run(host="0.0.0.0", port=8080)