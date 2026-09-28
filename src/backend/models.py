import uuid
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def new_id():
    return str(uuid.uuid4())

def now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String, primary_key=True, default=new_id)
    email = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)  # participant, judge, organizer, admin
    created_at = db.Column(db.DateTime, default=now)


class Session(db.Model):
    __tablename__ = "sessions"
    token = db.Column(db.String, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=now)
    expires_at = db.Column(db.DateTime, nullable=True)


class Event(db.Model):
    __tablename__ = "events"
    id = db.Column(db.String, primary_key=True, default=new_id)
    name = db.Column(db.String, nullable=False)
    submissions_open = db.Column(db.DateTime, nullable=True)
    submissions_close = db.Column(db.DateTime, nullable=False)
    published = db.Column(db.Boolean, default=False)


class Track(db.Model):
    __tablename__ = "tracks"
    id = db.Column(db.String, primary_key=True, default=new_id)
    event_id = db.Column(db.String, db.ForeignKey("events.id"), nullable=False)
    name = db.Column(db.String, nullable=False)


class Team(db.Model):
    __tablename__ = "teams"
    id = db.Column(db.String, primary_key=True, default=new_id)
    event_id = db.Column(db.String, db.ForeignKey("events.id"), nullable=False)
    name = db.Column(db.String, nullable=False)
    lead_user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=True)
    invite_token = db.Column(db.String, unique=True, nullable=False, default=new_id)


class TeamMember(db.Model):
    __tablename__ = "team_members"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    team_id = db.Column(db.String, db.ForeignKey("teams.id"), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("team_id", "user_id"),)


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.String, primary_key=True, default=new_id)
    event_id = db.Column(db.String, db.ForeignKey("events.id"), nullable=False)
    team_id = db.Column(db.String, db.ForeignKey("teams.id"), nullable=False)
    track_id = db.Column(db.String, db.ForeignKey("tracks.id"), nullable=True)
    title = db.Column(db.String, nullable=False)
    summary = db.Column(db.Text, nullable=True)
    repo_url = db.Column(db.String, nullable=True)
    status = db.Column(db.String, default="draft")  # draft, submitted, duplicate
    submitted_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=now, onupdate=now)
    __table_args__ = (db.UniqueConstraint("team_id", "event_id"),)


class Judge(db.Model):
    __tablename__ = "judges"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.String, db.ForeignKey("events.id"), nullable=False)
    tracks = db.Column(db.String, nullable=True)  
    fixture_id = db.Column(db.String, nullable=True)
    __table_args__ = (db.UniqueConstraint("user_id", "event_id"),)
    added_by = db.Column(db.String, db.ForeignKey("users.id"), nullable=True)  # organizer who added this judge

class Assignment(db.Model):
    __tablename__ = "assignments"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    judge_id = db.Column(db.Integer, db.ForeignKey("judges.id"), nullable=False)
    project_id = db.Column(db.String, db.ForeignKey("projects.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("judge_id", "project_id"),)


class RubricCriterion(db.Model):
    __tablename__ = "rubric_criteria"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    event_id = db.Column(db.String, db.ForeignKey("events.id"), nullable=False)
    name = db.Column(db.String, nullable=False)  # functionality, quality, innovation
    weight = db.Column(db.Float, default=1.0)


class Score(db.Model):
    __tablename__ = "scores"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    judge_id = db.Column(db.Integer, db.ForeignKey("judges.id"), nullable=False)
    project_id = db.Column(db.String, db.ForeignKey("projects.id"), nullable=False)
    criteria = db.Column(db.JSON, nullable=False)  # {"functionality": 4, "quality": 3, ...}
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=now)
    __table_args__ = (db.UniqueConstraint("judge_id", "project_id"),)


class AuditLog(db.Model):
    __tablename__ = "audit_log"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    time = db.Column(db.DateTime, default=now)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String, nullable=False)
    target = db.Column(db.String, nullable=True)
    details = db.Column(db.Text, nullable=True)