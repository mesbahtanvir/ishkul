from pydantic import EmailStr
import pytest
import httpx
from fastapi import FastAPI
from main import app  # Import your FastAPI instance

import random
import string

def get_random_string(length=10):
    # Choose from all lowercase and uppercase letters and digits
    characters = string.ascii_letters + string.digits
    random_string = ''.join(random.choice(characters) for i in range(length))
    return random_string


@pytest.fixture
def client():
    return httpx.AsyncClient(app=app, base_url="http://localhost:8080")

@pytest.mark.asyncio
async def test_root(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_register_user(client):
    # Mock user data
    user_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": get_random_string()+"@example.com",
        "password": "securepassword",
        "marketing_optin": True
    }
    response = await client.post("/register", json=user_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    response = await client.post("/register", json=user_data)
    assert response.status_code != 200


@pytest.mark.asyncio
async def test_login(client):
    # Mock user data
    user_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": get_random_string()+"@example.com",
        "password": "securepassword",
        "marketing_optin": True
    }
    response = await client.post("/register", json=user_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    user_login_data = {
        "email": EmailStr(user_data["email"]),
        "password": "securepassword",
    }
    response = await client.post("/login", json=user_login_data)
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]
    assert response.json()["first_name"] == "John"
    assert response.json()["last_name"] == "Doe"

    user_login_data = {
        "email": EmailStr(user_data["email"]),
        "password": "wrong_password",
    }

    response = await client.post("/login", json=user_login_data)
    assert response.status_code != 200




# Add more tests for other endpoints like /login, /contrib/exam_paper, etc.

