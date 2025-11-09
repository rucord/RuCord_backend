from app import db

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