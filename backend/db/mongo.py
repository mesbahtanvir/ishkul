import pymongo
from pymongo.errors import PyMongoError
import os
import json
from bson import json_util

def generate_mongo_connection_string():
    protocol = os.getenv('MONGODB_SCHEME', "mongodb")
    host = os.getenv('MONGODB_HOST', "localhost")
    port = os.getenv('MONGODB_PORT', "27017")
    return f"{protocol}://{host}:{port}/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1"

class Database:
    print(generate_mongo_connection_string())
    client = pymongo.MongoClient(generate_mongo_connection_string(), maxPoolSize=50)
    
    @staticmethod
    def _get_collection(db_name, collection_name):
        db = Database.client[db_name]
        return db[collection_name]

    @staticmethod
    def add_email(email: str):
        email_collection = Database._get_collection('prerelease', 'email_addresses')
        try:
            email_collection.insert_one({'email': email})
            return {"success": True}
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_emails():
        email_collection = Database._get_collection('prerelease', 'email_addresses')
        try:
            cursor = email_collection.find()
            return json.loads(json_util.dumps(list(cursor)))
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return None

    @staticmethod
    def add_exam_paper(resource_url: str, metadata: dict):
        exam_paper_collection = Database._get_collection('prerelease', 'exam_paper')
        try:
            exam_paper_collection.insert_one({'metadata': metadata, 'resource_url': resource_url})
            return {"success": True}
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_exam_papers():
        exam_paper_collection = Database._get_collection('prerelease', 'exam_paper')
        try:
            cursor = exam_paper_collection.find()
            return json.loads(json_util.dumps(list(cursor)))
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return None

    @staticmethod
    def add_user(first_name: str, last_name: str, email: str, marketing_optin: bool, hash: str):
        user_collection = Database._get_collection('released', 'users')
        try:
            user_collection.insert_one({
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'marketing_optin': marketing_optin,
                'hash': hash
            })
            return {"success": True}
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def user_exists(email: str):
        user_collection = Database._get_collection('released', 'users')
        try:
            return user_collection.count_documents({'email': email}) > 0
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return True

    @staticmethod
    def get_user_by_email(email: str):
        user_collection = Database._get_collection('released', 'users')
        try:
            user = user_collection.find_one({'email': email})
            return {"data": json.loads(json_util.dumps(user)), "success": True} if user else {"success": False}
        except PyMongoError as e:
            print(f"Error occurred: {e}")
            return {"success": False, "error": str(e)}

# Create the index for users collection
Database._get_collection('released', 'users').create_index('email')
