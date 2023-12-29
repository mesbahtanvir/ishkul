from pydantic import BaseModel, HttpUrl, EmailStr
from datetime import datetime

# Pydantic Models
class NotifyMeRequest(BaseModel):
    email: str

class ExamPaperRequest(BaseModel):
    metadata: dict[str, str]
    resource_url: HttpUrl

class RegisterAccountRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    marketing_optin: bool

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    token: str

class StatusResponse(BaseModel):
    status: str
    message: str

class ExamPapersResponse(BaseModel):
    status: str
    data: list