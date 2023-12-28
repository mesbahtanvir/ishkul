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

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

@app.get("/question_set/{question_set_id}")
async def read_question_set(question_set_id: str):
    return {"pdf_url": "https://ssl.du.ac.bd/fontView/images/file/1682568584Sample.pdf"}

@app.post("/notifyme")
async def NotifyMe(request: model.NotifyMeRequest):
    # You can now use request.email to access the email address sent in the payload
    email = request.email
    Database.addEmail(email)
    # Perform your logic here, such as sending an email notification

@app.get("/notifyme")
async def NotifyMe():
    # You can now use request.email to access the email address sent in the payload
    return Database.getEmails()
    # Perform your logic here, such as sending an email notification

@app.post("/contrib/exam_paper")
async def ExamPaper(request: model.ExamPaperRequest):
    Database.addExamPaper(request.resource_url, request.metadata)
    # Perform your logic here, such as sending an email notification

@app.get("/contrib/exam_paper")
async def ExamPaper():
    return Database.getExamPapers()
    # Perform your logic here, such as sending an email notification
