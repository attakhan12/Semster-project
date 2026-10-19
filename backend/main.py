import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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

DATABASE_NAME = "etis.db"


def get_database():
    connection = sqlite3.connect(DATABASE_NAME)

    connection.row_factory = sqlite3.Row

    return connection


def create_database():

    connection = get_database()

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


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "ETIS Backend is running"
    }


# =========================================================
# HEALTH
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

    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            INSERT INTO users
            (
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
                user.password,
                user.role,
            )
        )

        connection.commit()

        user_id = cursor.lastrowid

        return {
            "success": True,
            "message": "Account created successfully.",
            "user_id": user_id
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
# GET ALL USERS
# =========================================================

@app.get("/api/users")
def get_users():

    connection = get_database()

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

    connection.close()

    return [dict(user) for user in users]


# =========================================================
# DELETE USER
# =========================================================

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int):

    connection = get_database()

    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM users WHERE id = ?",
        (user_id,)
    )

    connection.commit()

    deleted = cursor.rowcount

    connection.close()

    if deleted == 0:

        return {
            "success": False,
            "message": "User not found."
        }

    return {
        "success": True,
        "message": "User deleted successfully."
    }