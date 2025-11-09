from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['TELEGRAM_BOT_TOKEN'] = '8336256532:AAF8Qrt5NHVN0iB20dEpeIN-2W1SBwzEoDk'
app.config['TELEGRAM_BOT_USERNAME'] = 'rucord_bot'

db = SQLAlchemy(app)

# inject bot username into all templates
@app.context_processor
def inject_telegram_bot():
    return {"TELEGRAM_BOT_USERNAME": app.config.get("TELEGRAM_BOT_USERNAME", "")}

# Добавляем/расширяем Content-Security-Policy: frame-ancestors,
# чтобы разрешить встраивание/работу Telegram виджета.
# Разрешаем telegram.org, oauth.telegram.org и t.me плюс self.
@app.after_request
def ensure_csp_frame_ancestors(response):
    allowed = "frame-ancestors 'self' https://telegram.org https://oauth.telegram.org https://t.me;"
    existing = response.headers.get("Content-Security-Policy")
    if existing:
        # если уже есть frame-ancestors — заменяем, иначе дополняем
        import re
        if re.search(r"\bframe-ancestors\b", existing):
            new = re.sub(r"frame-ancestors[^;]*;?", allowed, existing)
        else:
            # просто добавляем директиву в конец
            new = existing.rstrip(';') + "; " + allowed
        response.headers["Content-Security-Policy"] = new
    else:
        response.headers["Content-Security-Policy"] = allowed
    return response

# импортируем blueprint после создания db, чтобы избежать circular import
from app.telegram_auth import telegram_bp
app.register_blueprint(telegram_bp)

from app import routes, api, database
with app.app_context():
    db.create_all()