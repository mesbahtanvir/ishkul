from pydantic import BaseModel, HttpUrl

class NotifyMeRequest(BaseModel):
    email: str

class ExamPaperRequest(BaseModel):
    metadata: dict[str, str]
    resource_url: HttpUrl

