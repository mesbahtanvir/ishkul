from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from model import model
from utils.token import token
from db.mongo import Database
import bcrypt
import base64


app = FastAPI()

# CORS Middleware settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.post("/register",response_model=model.StatusResponse)
async def register_user(request: model.RegisterAccountRequest):
    if Database.user_exists(request.email):
        raise HTTPException(status_code=409, detail="Email already in use")
    
    hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt())
    success = Database.add_user(
        request.first_name, request.last_name, request.email, request.marketing_optin, hashed_password
    )
    if not success:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again later.")
    return {"status": "success", "message": "Registration successful"}

@app.post("/login", response_model=model.LoginResponse)
async def login_user(request: model.LoginRequest):
    user = Database.get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    print(user)
    print(request)
    if not bcrypt.checkpw(request.password.encode('utf-8'), base64.b64decode(user['data']['hash']['$binary']['base64'])):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    jwt_token = token.generate_jwt(user['data']['email'])
    return {
        "email":user['data']['email'],
        "first_name": user['data']['first_name'],
        "last_name": user['data']['last_name'],
        "token": jwt_token,
    }

@app.post("/contrib/exam_paper", response_model=model.StatusResponse)
async def add_exam_paper(request: model.ExamPaperRequest):
    Database.add_exam_paper(request.resource_url, request.metadata)
    return {"status": "success", "message": "Exam paper added successfully"}

@app.get("/contrib/exam_paper", response_model=model.ExamPapersResponse)
async def get_exam_papers():
    exam_papers = Database.get_exam_papers()
    return {"status": "success", "data": exam_papers}
