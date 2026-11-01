
import sqlite3
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from hall import router as hall_router
from datesheet import router as datesheet_router


import hashlib
import hmac
import secrets

# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="ETIS Backend",
    description="Examination Timetable Information System",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE
# =========================================================

DATABASE_NAME = Path(__file__).resolve().parent / "etis.db"


def get_database():
    connection = sqlite3.connect(DATABASE_NAME)
    connection.row_factory = sqlite3.Row
    return connection

# =========================================================
# PASSWORD SECURITY
# =========================================================

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        310000
    ).hex()

    return f"pbkdf2_sha256${salt}${password_hash}"


def verify_password(password: str, stored_password: str) -> bool:
    # Support passwords registered before this update.
    if not stored_password.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(password, stored_password)

    try:
        algorithm, salt, saved_hash = stored_password.split("$")

        if algorithm != "pbkdf2_sha256":
            return False

        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            310000
        ).hex()

        return hmac.compare_digest(calculated_hash, saved_hash)

    except ValueError:
        return False

def create_database():
    connection = get_database()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                registration_no TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        connection.commit()

    finally:
        connection.close()


create_database()


# =========================================================
# USER DATA MODEL
# =========================================================

class SignupData(BaseModel):
    full_name: str
    registration_no: str
    email: str
    password: str
    role: str = "student"


class LoginData(BaseModel):
    email: str
    password: str


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():
    return {
        "message": "ETIS Backend is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database": "SQLite"
    }


# =========================================================
# SIGNUP
# =========================================================

@app.post("/api/signup")
def signup(user: SignupData):
    connection = get_database()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO users (
                full_name,
                registration_no,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user.full_name,
                user.registration_no,
                user.email,
                hash_password(user.password),
                user.role,
            )
        )

        connection.commit()

        return {
            "success": True,
            "message": "Account created successfully.",
            "user_id": cursor.lastrowid
        }

    except sqlite3.IntegrityError as error:
        error_message = str(error).lower()

        if "email" in error_message:
            message = "This email is already registered."
        elif "registration_no" in error_message:
            message = (
                "This registration number "
                "is already registered."
            )
        else:
            message = "This user already exists."

        return {
            "success": False,
            "message": message
        }

    finally:
        connection.close()



# =========================================================
# LOGIN
# =========================================================

@app.post("/api/login")
def login(user: LoginData):
    connection = get_database()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id, full_name, registration_no, email, password, role
            FROM users
            WHERE LOWER(email) = LOWER(?)
            """,
            (user.email.strip(),)
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            return {
                "success": False,
                "message": "Invalid email or password."
            }

        if not verify_password(
            user.password,
            existing_user["password"]
        ):
            return {
                "success": False,
                "message": "Invalid email or password."
            }

        # Upgrade an older plain-text password after successful login.
        if not existing_user["password"].startswith("pbkdf2_sha256$"):
            cursor.execute(
                """
                UPDATE users
                SET password = ?
                WHERE id = ?
                """,
                (
                    hash_password(user.password),
                    existing_user["id"]
                )
            )
            connection.commit()

        return {
            "success": True,
            "message": "Login successful.",
            "user": {
                "id": existing_user["id"],
                "full_name": existing_user["full_name"],
                "registration_no": existing_user["registration_no"],
                "email": existing_user["email"],
                "role": existing_user["role"]
            }
        }

    finally:
        connection.close()
# =========================================================
# GET ALL USERS
# =========================================================

@app.get("/api/users")
def get_users():
    connection = get_database()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                registration_no,
                email,
                role,
                created_at
            FROM users
            ORDER BY id DESC
            """
        )

        users = cursor.fetchall()

        return [dict(user) for user in users]

    finally:
        connection.close()


# =========================================================
# DELETE USER
# =========================================================

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):
    connection = get_database()

    try:
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM users WHERE id = ?",
            (user_id,)
        )

        connection.commit()

        if cursor.rowcount == 0:
            return {
                "success": False,
                "message": "User not found."
            }

        return {
            "success": True,
            "message": "User deleted successfully."
        }

    finally:
        connection.close()


# =========================================================
# DATE SHEET MODULE
# =========================================================

app.include_router(datesheet_router)


app.include_router(hall_router)