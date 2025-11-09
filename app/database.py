from app import db
import secrets
import sqlalchemy.exc

server_users = db.Table(
    "server_users",
    db.Column("user_id", db.Integer, db.ForeignKey("user.id"), primary_key=True),
    db.Column("server_id", db.Integer, db.ForeignKey("server.id"), primary_key=True),
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    token = db.Column(db.String(256), unique=True, nullable=True)

    # Telegram related fields
    telegram_id = db.Column(db.String(64), unique=True, nullable=True)
    first_name = db.Column(db.String(150), nullable=True)
    last_name = db.Column(db.String(150), nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)

    servers = db.relationship(
        "Server",
        secondary=server_users,
        back_populates="users",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<User {self.username}>"

    def set_password(self, password):
        import hashlib
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password):
        import hashlib
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()

    def generate_token(self):
        import hashlib
        self.token = hashlib.sha256(f"{self.username}{self.password_hash}".encode()).hexdigest()
        return self.token

    @staticmethod
    def create_user(username, email, password):
        user = User(username=username, email=email)
        user.set_password(password)
        return user

def get_user_by_telegram_id(telegram_id: str):
    if not telegram_id:
        return None
    return User.query.filter_by(telegram_id=str(telegram_id)).first()

def get_user_by_id(user_id: int):
    return User.query.get(user_id)

def create_user(data: dict):
    """
    Create and persist a User from dict.
    Expected keys: username, email, password (optional)
    For telegram-created users, provide telegram_id and optionally first_name, last_name, username, photo_url.
    Returns the created User instance (committed) or raises on DB error.
    """
    # Normalize input
    telegram_id = data.get("telegram_id")
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # Ensure required fields for DB constraints
    if not username:
        if telegram_id:
            username = f"tg_{telegram_id}"
        else:
            username = f"user_{secrets.token_hex(4)}"

    if not email:
        # create a deterministic dummy email for telegram users to satisfy non-nullable constraint
        if telegram_id:
            email = f"{telegram_id}@telegram.local"
        else:
            email = f"{secrets.token_hex(8)}@local.invalid"

    if not password:
        # generate a random password (will be hashed)
        password = secrets.token_hex(16)

    user = User(username=username, email=email)
    user.set_password(password)

    # Telegram fields
    if telegram_id:
        user.telegram_id = str(telegram_id)
    if data.get("first_name"):
        user.first_name = data.get("first_name")
    if data.get("last_name"):
        user.last_name = data.get("last_name")
    if data.get("photo_url"):
        user.photo_url = data.get("photo_url")

    try:
        db.session.add(user)
        db.session.commit()
        return user
    except sqlalchemy.exc.IntegrityError:
        db.session.rollback()
        # try to resolve uniqueness conflicts: if username/email already exist, append suffix
        base_username = username
        for i in range(1, 100):
            try:
                user.username = f"{base_username}_{i}"
                db.session.add(user)
                db.session.commit()
                return user
            except sqlalchemy.exc.IntegrityError:
                db.session.rollback()
        raise

def save_user(user: User):
    """
    Persist changes to an existing user instance.
    """
    try:
        db.session.add(user)
        db.session.commit()
        return user
    except Exception:
        db.session.rollback()
        raise

def get_or_create_user_by_telegram(telegram_id: str, first_name=None, last_name=None, username=None, photo_url=None):
    try:
        user = get_user_by_telegram_id(telegram_id)
        if user:
            # обновляем поля при необходимости
            updated = False
            if first_name and user.first_name != first_name:
                user.first_name = first_name
                updated = True
            if last_name and user.last_name != last_name:
                user.last_name = last_name
                updated = True
            if username and user.username != username:
                # осторожно: username уникален; обновляем только если свободен
                existing = User.query.filter_by(username=username).first()
                if not existing or existing.id == user.id:
                    user.username = username
                    updated = True
            if photo_url and user.photo_url != photo_url:
                user.photo_url = photo_url
                updated = True
            if updated:
                save_user(user)
            return user
    except NameError:
        pass

    new_user = create_user({
        "telegram_id": telegram_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "photo_url": photo_url,
    })
    return new_user

class Server(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    description = db.Column(db.String(500), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    is_public = db.Column(db.Boolean, default=True)

    users = db.relationship(
        "User",
        secondary=server_users,
        back_populates="servers",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Server {self.name}>"

class Channel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    server_id = db.Column(db.Integer, db.ForeignKey("server.id"), nullable=False)

    def __repr__(self):
        return f"<Channel {self.name} in {self.server_id}>"