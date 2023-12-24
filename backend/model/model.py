from pydantic import BaseModel

class NotifyMeRequest(BaseModel):
    email: str