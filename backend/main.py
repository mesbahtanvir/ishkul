from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from model import model
from db.mongo import Database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/health")
async def ping():
    return {"healty": "ok"}

@app.get("/")
async def read_root():
    return {"Hello": "World Soon"}

@app.post("/contrib/exam_paper")
async def ExamPaper(request: model.ExamPaperRequest):
    Database.addExamPaper(request.resource_url, request.metadata)

@app.get("/contrib/exam_paper")
async def ExamPaper():
    return Database.getExamPapers()
