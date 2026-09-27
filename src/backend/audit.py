from models import db, AuditLog


def log_action(user, action, target=None, details=None):
    entry = AuditLog(
        user_id=user.id if user else None,
        action=action,
        target=target,
        details=details,
    )
    db.session.add(entry)