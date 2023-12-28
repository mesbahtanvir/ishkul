import pymongo
from pymongo.errors import PyMongoError
from bson import json_util
import json
import os

def generate_mongo_connection_string():
    protocol = os.getenv('MONGODB_PROTOCOL')
    host = os.getenv('MONGODB_HOST')
    port = os.getenv('MONGODB_PORT')
    return f"{protocol}://{host}:{port}/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1"

client = pymongo.MongoClient(generate_mongo_connection_string, maxPoolSize=50)


class Database:

    @staticmethod
    def _get_email_collection():
        db = client['prerelease']
        email_collection = db['email_addresses']
        return email_collection

    @staticmethod
    def _get_exam_paper_collection():
        db = client['prerelease']
        exam_paper_collection = db['exam_paper']
        return exam_paper_collection

    @staticmethod
    def addEmail(email: str):
        email_collection = Database._get_email_collection()
        try:
            email_collection.insert_many([{'email': email}])
        except PyMongoError as e:
            # Log the error
            print(f"Error occurred: {e}")

    @staticmethod
    def getEmails():
        email_collection = Database._get_email_collection()
        try:
            cursor = email_collection.find()
            email_documents = [doc for doc in cursor]
            email_documents = json.loads(json_util.dumps(email_documents))
            return email_documents
        except PyMongoError as e:
            # Log the error
            print(f"Error occurred: {e}")
            return None
        
    @staticmethod
    def addExamPaper(resourceUrl: str, metadata:dict[str, str]):
        exam_paper_collection = Database._get_exam_paper_collection()
        try:
            exam_paper_collection.insert_many([{'metadata': metadata, 'resource_url': resourceUrl}])
        except PyMongoError as e:
            # Log the error
            print(f"Error occurred: {e}")

    @staticmethod
    def getExamPapers():
        exam_paper_collection = Database._get_exam_paper_collection()
        try:
            cursor = exam_paper_collection.find()
            exam_paper_documents = [doc for doc in cursor]
            exam_paper_documents = json.loads(json_util.dumps(exam_paper_documents))
            return exam_paper_documents
        except PyMongoError as e:
            # Log the error
            print(f"Error occurred: {e}")
            return None