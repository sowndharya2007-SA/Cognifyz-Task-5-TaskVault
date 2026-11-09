"""
TaskVault API Automated Test Suite
Tests all RESTful endpoints, input validation, HTTP status codes, and persistence.
"""

import unittest
import json
import os
import shutil
import tempfile
from app import app, DATA_DIR, DATA_FILE, ensure_data_file


class TaskVaultApiTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

        # Create temporary backup of real tasks.json if it exists
        self.real_tasks_backup = None
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                self.real_tasks_backup = f.read()

        ensure_data_file()

    def tearDown(self):
        # Restore real tasks.json if it was backed up
        if self.real_tasks_backup is not None:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                f.write(self.real_tasks_backup)

    def test_01_get_all_tasks(self):
        """Test GET /api/tasks returns 200 and a list of tasks."""
        res = self.client.get('/api/tasks')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        first = data[0]
        self.assertIn('id', first)
        self.assertIn('title', first)
        self.assertIn('priority', first)
        self.assertIn('status', first)
        self.assertIn('created_at', first)
        print("PASS: test_01_get_all_tasks")

    def test_02_create_task_success(self):
        """Test POST /api/tasks creates task and returns 201."""
        payload = {
            "title": "Automated Unit Test Task",
            "description": "Created during testing execution.",
            "priority": "High",
            "status": "Pending"
        }
        res = self.client.post('/api/tasks', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn('id', data)
        self.assertEqual(data['title'], "Automated Unit Test Task")
        self.assertEqual(data['priority'], "High")
        self.assertEqual(data['status'], "Pending")
        self.assertIn('created_at', data)
        self.created_task_id = data['id']
        print(f"PASS: test_02_create_task_success (ID: {data['id']})")

    def test_03_create_task_validation_failures(self):
        """Test POST /api/tasks rejects invalid inputs with 400."""
        # Missing title
        res = self.client.post('/api/tasks', json={"description": "No title"})
        self.assertEqual(res.status_code, 400)
        self.assertIn('error', res.get_json())

        # Empty whitespace title
        res = self.client.post('/api/tasks', json={"title": "   "})
        self.assertEqual(res.status_code, 400)

        # Invalid priority
        res = self.client.post('/api/tasks', json={"title": "Valid Title", "priority": "Urgent"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid priority", res.get_json()['error'])

        # Invalid status
        res = self.client.post('/api/tasks', json={"title": "Valid Title", "status": "Archived"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid status", res.get_json()['error'])
        print("PASS: test_03_create_task_validation_failures")

    def test_04_get_single_task_and_404(self):
        """Test GET /api/tasks/<id> for existing task and 404 for missing task."""
        # Create a task first
        create_res = self.client.post('/api/tasks', json={
            "title": "Single Task Fetch Test",
            "priority": "Low",
            "status": "Completed"
        })
        task_id = create_res.get_json()['id']

        # Fetch it
        res = self.client.get(f'/api/tasks/{task_id}')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['id'], task_id)
        self.assertEqual(data['title'], "Single Task Fetch Test")

        # Nonexistent task 404
        bad_res = self.client.get('/api/tasks/nonexistent-task-999')
        self.assertEqual(bad_res.status_code, 404)
        self.assertIn('error', bad_res.get_json())
        print("PASS: test_04_get_single_task_and_404")

    def test_05_update_task(self):
        """Test PUT /api/tasks/<id> updates existing task and handles 404."""
        # Create a task
        create_res = self.client.post('/api/tasks', json={
            "title": "Task Before Update",
            "priority": "Medium",
            "status": "Pending"
        })
        task_id = create_res.get_json()['id']

        # Update it
        update_res = self.client.put(f'/api/tasks/{task_id}', json={
            "title": "Task After Update",
            "status": "In Progress"
        })
        self.assertEqual(update_res.status_code, 200)
        data = update_res.get_json()
        self.assertEqual(data['title'], "Task After Update")
        self.assertEqual(data['status'], "In Progress")
        self.assertEqual(data['priority'], "Medium")  # untouched field preserved

        # 404 for nonexistent task
        bad_res = self.client.put('/api/tasks/fake-id-123', json={"title": "Won't Work"})
        self.assertEqual(bad_res.status_code, 404)
        print("PASS: test_05_update_task")

    def test_06_delete_task(self):
        """Test DELETE /api/tasks/<id> removes task and subsequent fetch returns 404."""
        # Create a task
        create_res = self.client.post('/api/tasks', json={
            "title": "Task To Delete",
            "priority": "Low",
            "status": "Pending"
        })
        task_id = create_res.get_json()['id']

        # Delete it
        del_res = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertIn('deleted successfully', del_res.get_json()['message'])

        # Verify it is no longer found
        fetch_res = self.client.get(f'/api/tasks/{task_id}')
        self.assertEqual(fetch_res.status_code, 404)

        # Deleting already deleted task returns 404
        del_again_res = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(del_again_res.status_code, 404)
        print("PASS: test_06_delete_task")

    def test_07_persistence_check(self):
        """Test that changes are saved directly to tasks.json on disk."""
        unique_title = f"Disk Persistence Verification {os.urandom(4).hex()}"
        res = self.client.post('/api/tasks', json={
            "title": unique_title,
            "priority": "High",
            "status": "In Progress"
        })
        self.assertEqual(res.status_code, 201)

        # Read JSON file directly from filesystem
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            disk_data = json.load(f)

        found = any(t['title'] == unique_title for t in disk_data)
        self.assertTrue(found, "Created task must exist in data/tasks.json file on disk")
        print("PASS: test_07_persistence_check")


if __name__ == '__main__':
    unittest.main()
