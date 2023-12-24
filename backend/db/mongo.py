import pymongo

# Replace 'your_connection_string' with your actual MongoDB connection string
client = pymongo.MongoClient("mongodb://mongodb:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.1.1")
db = client['prerelease']
email_collection = db['email_addresses']

class Database:

    @staticmethod
    def addEmail(email: str):
        email_collection.insert_many([{'email': email}])

    @staticmethod
    def getEmails():
        filter = {'email': 'mesbah.tanvir.cs@gmail.com'}
        print(email_collection.count_documents(filter))

