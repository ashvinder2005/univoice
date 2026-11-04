"""
test_univoice.py - Automated Test Suite for UniVoice Assistant
Tests all 3 modules, voice command dispatching, SQLite storage, and meeting analysis.
"""

import unittest
import json
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import database
from app import app

class UniVoiceTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        database.init_db()

    def test_01_system_status(self):
        response = self.app.get("/api/system/status")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "online")
        self.assertIn("stats", data)
        print("[PASS] System status endpoint OK")

    def test_02_voice_add_expense(self):
        payload = {"text": "Spent 18.50 on pizza for dinner"}
        response = self.app.post("/api/voice-command", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["intent"], "add_expense")
        self.assertEqual(data["action_taken"], "EXPENSE_ADDED")
        self.assertIn("18.50", data["spoken_response"])
        print(f"[PASS] Voice add expense OK: '{data['spoken_response']}'")

    def test_03_voice_add_reminder(self):
        payload = {"text": "Remind me to finish the robotics circuit by Friday 4 PM"}
        response = self.app.post("/api/voice-command", json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["intent"], "add_task")
        self.assertEqual(data["action_taken"], "TASK_ADDED")
        self.assertIn("robotics", data["spoken_response"].lower())
        print(f"[PASS] Voice add task OK: '{data['spoken_response']}'")

    def test_04_voice_list_expenses_and_tasks(self):
        # List expenses
        resp_exp = self.app.post("/api/voice-command", json={"text": "How much did I spend?"})
        self.assertEqual(resp_exp.status_code, 200)
        data_exp = json.loads(resp_exp.data)
        self.assertEqual(data_exp["intent"], "list_expenses")
        self.assertIn("$", data_exp["spoken_response"])

        # List tasks
        resp_task = self.app.post("/api/voice-command", json={"text": "What are my tasks?"})
        self.assertEqual(resp_task.status_code, 200)
        data_task = json.loads(resp_task.data)
        self.assertEqual(data_task["intent"], "list_tasks")
        print("[PASS] Voice list expenses and tasks OK")

    def test_05_campus_timetable_query(self):
        # Query Monday
        response = self.app.post("/api/voice-command", json={"text": "What classes do I have on Monday?"})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["intent"], "query_timetable")
        self.assertIn("classes", data["data"])
        self.assertTrue(len(data["data"]["classes"]) > 0)
        print(f"[PASS] Campus timetable query OK: '{data['spoken_response']}'")

    def test_06_campus_strict_grounding(self):
        # Query a non-existent course: Quantum Astrology 999
        response = self.app.post("/api/voice-command", json={"text": "When is Quantum Astrology 999 lecture?"})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["intent"], "query_timetable")
        # Should indicate not found, NEVER fabricate
        self.assertIn("could not find", data["spoken_response"].lower())
        print(f"[PASS] Campus strict grounding (no hallucinations) OK: '{data['spoken_response']}'")

    def test_07_campus_library_query(self):
        # Existing book
        response = self.app.post("/api/voice-command", json={"text": "Is Clean Code available in library?"})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["intent"], "query_library")
        self.assertIn("Clean Code", data["spoken_response"])
        self.assertIn("Rack C1", data["spoken_response"])

        # Non-existing book
        resp_missing = self.app.post("/api/voice-command", json={"text": "Find book on Flying Unicorns"})
        data_missing = json.loads(resp_missing.data)
        self.assertIn("not found", data_missing["spoken_response"].lower())
        print(f"[PASS] Campus library query OK: '{data['spoken_response']}'")

    def test_08_meeting_assistant_process(self):
        meeting_notes = """
        Today's Sprint Planning Meeting:
        Alex will deploy the Flask backend server to production by Wednesday.
        Maya will finish the responsive UI styling by Thursday 6 PM.
        David will prepare the final presentation slides by Friday morning.
        """
        response = self.app.post("/api/meetings/process", json={"transcript": meeting_notes})
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertTrue(data["success"])
        meeting = data["meeting"]
        self.assertIn("title", meeting)
        self.assertIn("email_draft", meeting)
        self.assertIn("Subject:", meeting["email_draft"])
        self.assertTrue(len(meeting["action_items"]) >= 2)
        print("[PASS] Meeting processing, action items extraction, & email draft OK")
        print(f"  Meeting Title: {meeting['title']}")
        print(f"  Extracted Action Items: {len(meeting['action_items'])}")
        print(f"  Email Draft starts with:\n  {meeting['email_draft'][:90]}...")

    def test_09_manual_crud(self):
        # Add expense
        resp = self.app.post("/api/expenses", json={"amount": 9.99, "category": "Tech", "description": "USB Cable"})
        self.assertEqual(resp.status_code, 201)
        exp_id = json.loads(resp.data)["expense"]["id"]

        # Delete expense
        del_resp = self.app.delete(f"/api/expenses/{exp_id}")
        self.assertEqual(del_resp.status_code, 200)

        # Add task
        t_resp = self.app.post("/api/tasks", json={"description": "Study for midterms", "due_date": "Next Monday"})
        self.assertEqual(t_resp.status_code, 201)
        t_id = json.loads(t_resp.data)["task"]["id"]

        # Toggle task
        toggle_resp = self.app.patch(f"/api/tasks/{t_id}/toggle")
        self.assertEqual(toggle_resp.status_code, 200)
        self.assertEqual(json.loads(toggle_resp.data)["status"], "completed")
        print("[PASS] Manual CRUD endpoints OK")

if __name__ == "__main__":
    unittest.main()
