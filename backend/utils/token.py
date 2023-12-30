import jwt
from datetime import datetime, timedelta, timezone
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

SECRET_KEY = "super-secret-backend-key"

class token():

    @staticmethod
    def generate_jwt(email: str):
        payload = {
            'email': email,
            'exp': datetime.utcnow() + timedelta(days=1)  # Token expiration set to 1 day
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        return token

    @staticmethod
    def decode_jwt(token: str):
        try:
            # Decode the token
            decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return decoded_token
        except ExpiredSignatureError:
            # Handle expired token
            print("The token has expired.")
        except InvalidTokenError:
            # Handle invalid token
            print("Invalid token.")
        except Exception as e:
            # Handle any other exceptions
            print(f"Token validation failed: {e}")
        return None

    @staticmethod
    def validate(token: str):
        decoded = decode_jwt(token)
        if not decoded:
            return False
        return decoded.get("email")

        



    