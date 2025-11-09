from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from app.telegram_auth import telegram_bp

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['TELEGRAM_BOT_TOKEN'] = '8336256532:AAF8Qrt5NHVN0iB20dEpeIN-2W1SBwzEoDk'
app.config['TELEGRAM_BOT_USERNAME'] = 'rucord_bot'
db = SQLAlchemy(app)

app.register_blueprint(telegram_bp)

from app import routes, api, database
with app.app_context():
    db.create_all()