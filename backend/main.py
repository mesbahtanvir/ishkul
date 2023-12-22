from fastapi import FastAPI

app = FastAPI()

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