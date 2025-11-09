from app import app
from app.database import User
from flask import request

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    username = request.json.get("username")
    password = request.json.get("password")

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = user.generate_token()
        return {"success": True, "token": token}, 200
    else:
        return {"success": False, "message": "Invalid credentials"}, 401

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    username = request.json.get("username")
    email = request.json.get("email")
    password = request.json.get("password")

    if User.query.filter_by(username=username).first():
        return {"success": False, "value": "username", "message": "Это имя пользователя уже используется"}, 409
    if User.query.filter_by(email=email).first():
        return {"success": False, "value": "email", "message": "Эта почта уже используется"}, 409

    user = User.create_user(username, email, password)
    token = user.generate_token()
    return {"success": True, "token": token}, 201