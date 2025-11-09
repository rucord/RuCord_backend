from app import app
from flask import render_template

@app.route("/", methods=["GET"])
def index(): return render_template("index.html", TELEGRAM_BOT_USERNAME=app.config.get("TELEGRAM_BOT_USERNAME", ""))

@app.route("/login", methods=["GET"])
def login(): return render_template("login.html")

@app.route("/register", methods=["GET"])
def register(): return render_template("register.html")

@app.route("/dashboard", methods=["GET"])
def dashboard(): return render_template("dashboard.html")
