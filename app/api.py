from app import app, db
from app.database import User, Server
from flask import request, jsonify

@app.route("/api/auth/login", methods=["POST"])
def api_login():
    username = request.json.get("username")
    password = request.json.get("password")

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = user.generate_token()
        db.session.commit()
        return jsonify(success=True, token=token), 200
    else:
        return jsonify(success=False, message="Invalid credentials"), 401

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    username = request.json.get("username")
    email = request.json.get("email")
    password = request.json.get("password")

    if User.query.filter_by(username=username).first():
        return jsonify(success=False, value="username", message="Username already taken"), 409
    if User.query.filter_by(email=email).first():
        return jsonify(success=False, value="email", message="Email already in use"), 409

    user = User.create_user(username, email, password)
    db.session.add(user)
    token = user.generate_token()
    db.session.commit()
    return jsonify(success=True, token=token), 201

@app.route("/api/server/list", methods=["POST"])
def api_server_list():
    token = request.json.get("token")
    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify(success=False, message="Invalid token"), 401

    servers = []
    for server in user.servers:
        servers.append({
            "id": server.id,
            "name": server.name,
            "description": server.description,
            "owner_id": server.owner_id
        })
    return jsonify(success=True, servers=servers), 200

@app.route("/api/server/create", methods=["POST"])
def api_server_create():
    token = request.json.get("token")
    name = request.json.get("name")
    description = request.json.get("description")
    is_public = request.json.get("is_public", True)

    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify(success=False, message="Invalid token"), 401

    if Server.query.filter_by(name=name).first():
        return jsonify(success=False, message="Server name already exists"), 409

    server = Server(name=name, description=description, owner_id=user.id, is_public=is_public)
    server.users.append(user)

    db.session.add(server)
    db.session.commit()

    return jsonify(success=True, server_id=server.id), 201

@app.route("/api/server/join", methods=["POST"])
def api_server_join():
    token = request.json.get("token")
    server_id = request.json.get("server_id")

    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify(success=False, message="Invalid token"), 401

    server = Server.query.get(server_id)
    if not server:
        return jsonify(success=False, message="Server not found"), 404

    if user in server.users:
        return jsonify(success=False, message="User already in server"), 409

    if not server.is_public:
        return jsonify(success=False, message="Cannot join private server"), 403
    
    server.users.append(user)
    db.session.commit()

    return jsonify(success=True, message="Joined server successfully"), 200

@app.route("/api/server/leave", methods=["POST"])
def api_server_leave():
    token = request.json.get("token")
    server_id = request.json.get("server_id")

    user = User.query.filter_by(token=token).first()
    if not user:
        return jsonify(success=False, message="Invalid token"), 401

    server = Server.query.get(server_id)
    if not server:
        return jsonify(success=False, message="Server not found"), 404

    if user not in server.users:
        return jsonify(success=False, message="User not in server"), 409

    server.users.remove(user)
    db.session.commit()

    return jsonify(success=True, message="Left server successfully"), 200

@app.route("/api/server/kick", methods=["POST"])
def api_server_kick():
    token = request.json.get("token")
    server_id = request.json.get("server_id")
    user_id = request.json.get("user_id")

    requester = User.query.filter_by(token=token).first()
    if not requester:
        return jsonify(success=False, message="Invalid token"), 401

    server = Server.query.get(server_id)
    if not server:
        return jsonify(success=False, message="Server not found"), 404

    if server.owner_id != requester.id:
        return jsonify(success=False, message="Only the server owner can kick users"), 403

    user_to_kick = User.query.get(user_id)
    if not user_to_kick or user_to_kick not in server.users:
        return jsonify(success=False, message="User not in server"), 404

    server.users.remove(user_to_kick)
    db.session.commit()

    return jsonify(success=True, message="User kicked successfully"), 200

@app.route("/api/server/delete", methods=["POST"])
def api_server_delete():
    token = request.json.get("token")
    server_id = request.json.get("server_id")

    requester = User.query.filter_by(token=token).first()
    if not requester:
        return jsonify(success=False, message="Invalid token"), 401

    server = Server.query.get(server_id)
    if not server:
        return jsonify(success=False, message="Server not found"), 404

    if server.owner_id != requester.id:
        return jsonify(success=False, message="Only the server owner can delete the server"), 403

    db.session.delete(server)
    db.session.commit()

    return jsonify(success=True, message="Server deleted successfully"), 200

@app.route("/api/server/edit", methods=["UPDATE"])
def api_server_edit():
    token = request.json.get("token")
    server_id = request.json.get("server_id")
    name = request.json.get("name")
    description = request.json.get("description")
    is_public = request.json.get("is_public")

    requester = User.query.filter_by(token=token).first()
    if not requester:
        return jsonify(success=False, message="Invalid token"), 401

    server = Server.query.get(server_id)
    if not server:
        return jsonify(success=False, message="Server not found"), 404

    if server.owner_id != requester.id:
        return jsonify(success=False, message="Only the server owner can edit the server"), 403

    if name:
        server.name = name
    if description:
        server.description = description
    if is_public is not None:
        server.is_public = is_public

    db.session.commit()

    return jsonify(success=True, message="Server updated successfully"), 200

"""
# Register
curl -X POST http://localhost:9999/api/auth/register -H "Content-Type: application/json" -d '{"username":"dom4k","email":"me@dom4k.pro","password":"1234"}'
-> {"success":true,"token":"<token_value>"}

curl -X POST http://localhost:9999/api/auth/register -H "Content-Type: application/json" -d '{"username":"dom4k","email":"me@15999.ru","password":"4321"}'
-> {"success":false,"value":"username","message":"Username already taken"}

curl -X POST http://localhost:9999/api/auth/register -H "Content-Type: application/json" -d '{"username":"15999","email":"me@dom4k.pro","password":"4321"}'
-> {"success":false,"value":"email","message":"Email already in use"}

# Login
curl -X POST http://localhost:9999/api/auth/login -H "Content-Type: application/json" -d '{"username":"dom4k","password":"1234"}'
-> {"success":true,"token":"<token_value>"}

curl -X POST http://localhost:9999/api/auth/login -H "Content-Type: application/json" -d '{"username":"dom4k","password":"wrongpassword"}'
-> {"success":false,"message":"Invalid credentials"}

# Create Server
curl -X POST http://localhost:9999/api/server/create -H "Content-Type: application/json" -d '{"token":"<token_value>","name":"My Server","description":"This is my server","is_public":true}'
-> {"success":true,"server_id":1}

curl -X POST http://localhost:9999/api/server/create -H "Content-Type: application/json" -d '{"token":"<token_value>","name":"My Server","description":"Another server"}'
-> {"success":false,"message":"Server name already exists"}

# Join Server
curl -X POST http://localhost:9999/api/server/join -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":1}'
-> {"success":true,"message":"Joined server successfully"}

curl -X POST http://localhost:9999/api/server/join -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":999}'
-> {"success":false,"message":"Server not found"}

curl -X POST http://localhost:9999/api/server/join -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":2}'
-> {"success":false,"message":"Cannot join private server"}

curl -X POST http://localhost:9999/api/server/join -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":1}'
-> {"success":false,"message":"User already in server"}

# Leave Server
curl -X POST http://localhost:9999/api/server/leave -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":1}'
-> {"success":true,"message":"Left server successfully"}

curl -X POST http://localhost:9999/api/server/leave -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":999}'
-> {"success":false,"message":"Server not found"}

curl -X POST http://localhost:9999/api/server/leave -H "Content-Type: application/json" -d '{"token":"<token_value>","server_id":1}'
-> {"success":false,"message":"User not in server"}

# Kick User
curl -X POST http://localhost:9999/api/server/kick -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":1,"user_id":2}'
-> {"success":true,"message":"User kicked successfully"}

curl -X POST http://localhost:9999/api/server/kick -H "Content-Type: application/json" -d '{"token":"<non_owner_token>","server_id":1,"user_id":2}'
-> {"success":false,"message":"Only the server owner can kick users"}

curl -X POST http://localhost:9999/api/server/kick -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":1,"user_id":999}'
-> {"success":false,"message":"User not in server"}

curl -X POST http://localhost:9999/api/server/kick -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":999,"user_id":2}'
-> {"success":false,"message":"Server not found"}

# Delete Server
curl -X POST http://localhost:9999/api/server/delete -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":1}'
-> {"success":true,"message":"Server deleted successfully"}

curl -X POST http://localhost:9999/api/server/delete -H "Content-Type: application/json" -d '{"token":"<non_owner_token>","server_id":1}'
-> {"success":false,"message":"Only the server owner can delete the server"}

curl -X POST http://localhost:9999/api/server/delete -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":999}'
-> {"success":false,"message":"Server not found"}

# Edit Server
curl -X UPDATE http://localhost:9999/api/server/edit -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":1,"name":"New Server Name","description":"Updated description","is_public":false}'
-> {"success":true,"message":"Server updated successfully"}

curl -X UPDATE http://localhost:9999/api/server/edit -H "Content-Type: application/json" -d '{"token":"<non_owner_token>","server_id":1,"name":"New Server Name"}'
-> {"success":false,"message":"Only the server owner can edit the server"}

curl -X UPDATE http://localhost:9999/api/server/edit -H "Content-Type: application/json" -d '{"token":"<owner_token>","server_id":999,"name":"New Server Name"}'
-> {"success":false,"message":"Server not found"}
"""