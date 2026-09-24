import os

from dotenv import load_dotenv


load_dotenv() 


# Email configuration
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHMS = os.getenv("JWT_ALGORITHMS")
JWT_EXPIRE_MINUTES = os.getenv("JWT_EXPIRE_MINUTES")


if not ADMIN_EMAIL:
    raise ValueError("ADMIN_EMAIL is missimg in .env file")

if not ADMIN_PASSWORD:
    raise ValueError("ADMIN_PASSWORD is missimg in .env file")

if not JWT_SECRET:
    raise ValueError("JWT_SECRET is missimg in .env file")

if not JWT_ALGORITHMS:
    raise ValueError("JWT_ALGORITHMS is missimg in .env file")

if not JWT_EXPIRE_MINUTES:
    raise ValueError("JWT_EXPIRE_MINUTES is missimg in .env file")