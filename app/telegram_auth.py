from flask import Blueprint, request, session, jsonify, url_for, current_app
import os
import hashlib
import hmac
import time
from app import database

telegram_bp = Blueprint("telegram_auth", __name__)

def verify_telegram_auth(data: dict) -> bool:
    if not data or "hash" not in data:
        return False
    data = data.copy()
    received_hash = data.pop("hash")

    try:
        auth_date = int(data.get("auth_date", 0))
    except Exception:
        return False
    if abs(time.time() - auth_date) > 86400:
        return False

    data_check_arr = []
    for key in sorted(data.keys()):
        data_check_arr.append(f"{key}={data[key]}")
    data_check_string = "\n".join(data_check_arr)

    bot_token = current_app.config.get("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        current_app.logger.error("TELEGRAM_BOT_TOKEN not set")
        return False

    secret_key = hashlib.sha256(bot_token.encode()).digest()
    hmac_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return hmac_hash == received_hash

@telegram_bp.route("/auth/telegram", methods=["POST"])
def auth_telegram():
    data = {}
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    if not verify_telegram_auth(data):
        return jsonify({"ok": False, "error": "invalid_auth"}), 400

    tg_id = str(data.get("id"))
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    username = data.get("username")
    photo = data.get("photo_url")
    
    user = database.get_or_create_user_by_telegram(
        telegram_id=tg_id,
        first_name=first_name,
        last_name=last_name,
        username=username,
        photo_url=photo,
    )
    
    session["user_id"] = getattr(user, "id", None)
    
    return jsonify({"ok": True, "redirect": url_for("dashboard")})