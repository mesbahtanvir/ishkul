from locust import HttpUser, task, between

class NotifyMeUser(HttpUser):
    wait_time = between(1, 5)  # Time between tasks for each simulated user

    @task
    def post_email(self):
        payload = {
            "email": "email@example.com"  # Replace with the desired email address
        }
        self.client.post("/notifyme", json=payload)

# To run this Locust file:
# 1. Save it as a .py file, for example, `notifyme_locustfile.py`.
# 2. Ensure you have Locust installed (`pip install locust`).
# 3. Run Locust with this file (`locust -f notifyme_locustfile.py`).
# 4. Open your browser and go to http://localhost:8089 to start the test.
