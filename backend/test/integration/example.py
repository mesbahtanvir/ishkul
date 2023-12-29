from pydantic import EmailStr
import random
import string
import httpx
import asyncio

BASE_URL = "http://localhost:8080"
def get_random_string(length=10):
    # Choose from all lowercase and uppercase letters and digits
    characters = string.ascii_letters + string.digits
    random_string = ''.join(random.choice(characters) for i in range(length))
    return random_string

async def test_root():
    async with httpx.AsyncClient() as client:
        response = await client.get(BASE_URL)
        assert response.status_code == 200
        assert response.json() == {"message": "Hello, World!"}

async def test_health_check():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

async def test_register_user():
    # Mock user data
    user_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": get_random_string()+"@example.com",
        "password": "securepassword",
        "marketing_optin": True
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/register", json=user_data)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        response = await client.post(f"{BASE_URL}/register", json=user_data)
        assert response.status_code != 200

async def test_login():
    # Mock user data
    user_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": get_random_string()+"@example.com",
        "password": "securepassword",
        "marketing_optin": True
    }
    async with httpx.AsyncClient() as client:

        response = await client.post(f"{BASE_URL}/register", json=user_data)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        user_login_data = {
            "email": EmailStr(user_data["email"]),
            "password": "securepassword",
        }
        response = await client.post(f"{BASE_URL}/login", json=user_login_data)
        assert response.status_code == 200
        assert response.json()["email"] == user_data["email"]
        assert response.json()["first_name"] == "John"
        assert response.json()["last_name"] == "Doe"
        user_login_data = {
            "email": EmailStr(user_data["email"]),
            "password": "wrong_password",
        }

        response = await client.post(f"{BASE_URL}/login", json=user_login_data)
        assert response.status_code != 200

asyncio.run(test_root())
asyncio.run(test_health_check())
asyncio.run(test_register_user())
asyncio.run(test_login())
