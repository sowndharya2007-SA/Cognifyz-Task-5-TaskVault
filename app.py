import json
import os
import uuid
from datetime import datetime, timezone
from flask import Flask, jsonify, request, render_template

# Initialize Flask application
app = Flask(__name__, template_folder="templates", static_folder="static")

# Configuration for data persistence
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "tasks.json")

# Allowed values for validation
VALID_PRIORITIES = ["Low", "Medium", "High"]
VALID_STATUSES = ["Pending", "In Progress", "Completed"]


def get_current_timestamp():
    """Return ISO-8601 formatted UTC timestamp."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ensure_data_file():
    """Ensure data directory and JSON storage file exist."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        default_seed_tasks = [
            {
                "id": f"task-{uuid.uuid4().hex[:6]}",
                "title": "Design RESTful API Schema",
                "description": "Establish endpoint contracts for GET, POST, PUT, and DELETE operations following REST standards.",
                "priority": "High",
                "status": "Completed",
                "created_at": get_current_timestamp(),
                "updated_at": get_current_timestamp()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:6]}",
                "title": "Implement Flask Persistence Layer",
                "description": "Create automated JSON storage handler with directory verification, read/write safety, and error recovery.",
                "priority": "High",
                "status": "In Progress",
                "created_at": get_current_timestamp(),
                "updated_at": get_current_timestamp()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:6]}",
                "title": "Build Responsive TaskVault Dashboard",
                "description": "Create modern UI with Indigo-Teal palette, filter controls, live search, and dynamic metric cards.",
                "priority": "Medium",
                "status": "In Progress",
                "created_at": get_current_timestamp(),
                "updated_at": get_current_timestamp()
            },
            {
                "id": f"task-{uuid.uuid4().hex[:6]}",
                "title": "Write End-to-End Test Suite",
                "description": "Verify CRUD operations, bad request handling, 404 responses, and persistence across server restarts.",
                "priority": "Low",
                "status": "Pending",
                "created_at": get_current_timestamp(),
                "updated_at": get_current_timestamp()
            }
        ]
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(default_seed_tasks, f, indent=2)


def read_tasks():
    """Load tasks from JSON storage file safely."""
    ensure_data_file()
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except (json.JSONDecodeError, OSError) as e:
        app.logger.error(f"Error reading tasks JSON: {e}")
        return []


def write_tasks(tasks):
    """Write tasks array to JSON storage file safely."""
    ensure_data_file()
    temp_file = f"{DATA_FILE}.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2, ensure_ascii=False)
    # Atomic replace on Windows/POSIX
    os.replace(temp_file, DATA_FILE)


# ---------------------------------------------------------
# Frontend Routes
# ---------------------------------------------------------

@app.route("/")
def index():
    """Serve the single-page dashboard template."""
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    """Serve empty response for favicon requests to avoid 404s."""
    return "", 204


# ---------------------------------------------------------
# RESTful API Endpoints
# ---------------------------------------------------------

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """
    1. GET /api/tasks
    Return all tasks as JSON.
    Supports optional query filtering: ?status=...&priority=...&search=...
    """
    tasks = read_tasks()

    # Optional server-side filtering
    search = request.args.get("search", "").strip().lower()
    status_filter = request.args.get("status", "").strip()
    priority_filter = request.args.get("priority", "").strip()

    filtered = tasks

    if search:
        filtered = [
            t for t in filtered
            if search in t.get("title", "").lower() or search in t.get("description", "").lower()
        ]

    if status_filter and status_filter.lower() != "all":
        filtered = [
            t for t in filtered
            if t.get("status", "").lower() == status_filter.lower()
        ]

    if priority_filter and priority_filter.lower() != "all":
        filtered = [
            t for t in filtered
            if t.get("priority", "").lower() == priority_filter.lower()
        ]

    return jsonify(filtered), 200


@app.route("/api/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    """
    2. GET /api/tasks/<id>
    Return a single task by ID.
    """
    tasks = read_tasks()
    task = next((t for t in tasks if str(t.get("id")) == str(task_id)), None)

    if not task:
        return jsonify({"error": f"Task with ID '{task_id}' not found"}), 404

    return jsonify(task), 200


@app.route("/api/tasks", methods=["POST"])
def create_task():
    """
    3. POST /api/tasks
    Create a task after validating the submitted data.
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Malformed JSON payload"}), 400

    title = data.get("title")
    if not title or not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Task title is required and cannot be empty"}), 400

    title = title.strip()
    if len(title) > 150:
        return jsonify({"error": "Task title cannot exceed 150 characters"}), 400

    description = data.get("description", "")
    if description is None:
        description = ""
    elif not isinstance(description, str):
        return jsonify({"error": "Description must be a text string"}), 400
    description = description.strip()

    # Priority validation
    priority = data.get("priority", "Medium")
    if isinstance(priority, str):
        priority = priority.strip().title()
    if priority not in VALID_PRIORITIES:
        return jsonify({
            "error": f"Invalid priority '{priority}'. Allowed values: {', '.join(VALID_PRIORITIES)}"
        }), 400

    # Status validation
    status = data.get("status", "Pending")
    if isinstance(status, str):
        status_norm = status.strip().title()
        # Handle "In progress" capitalization normalization
        if status_norm.lower() == "in progress":
            status = "In Progress"
        elif status_norm in VALID_STATUSES:
            status = status_norm
        else:
            status = None
    else:
        status = None

    if status not in VALID_STATUSES:
        return jsonify({
            "error": f"Invalid status '{data.get('status')}'. Allowed values: {', '.join(VALID_STATUSES)}"
        }), 400

    timestamp = get_current_timestamp()
    new_task = {
        "id": f"task-{uuid.uuid4().hex[:6]}",
        "title": title,
        "description": description,
        "priority": priority,
        "status": status,
        "created_at": timestamp,
        "updated_at": timestamp
    }

    tasks = read_tasks()
    tasks.insert(0, new_task)  # Insert at beginning so newest appears first
    write_tasks(tasks)

    return jsonify(new_task), 201


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    """
    4. PUT /api/tasks/<id>
    Update an existing task.
    """
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Malformed JSON payload"}), 400

    tasks = read_tasks()
    task_index = next((i for i, t in enumerate(tasks) if str(t.get("id")) == str(task_id)), None)

    if task_index is None:
        return jsonify({"error": f"Task with ID '{task_id}' not found"}), 404

    current_task = tasks[task_index]

    # Validate title if supplied
    if "title" in data:
        title = data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Task title cannot be empty"}), 400
        title = title.strip()
        if len(title) > 150:
            return jsonify({"error": "Task title cannot exceed 150 characters"}), 400
        current_task["title"] = title

    # Update description if supplied
    if "description" in data:
        description = data.get("description", "")
        if description is None:
            description = ""
        elif not isinstance(description, str):
            return jsonify({"error": "Description must be a text string"}), 400
        current_task["description"] = description.strip()

    # Validate priority if supplied
    if "priority" in data:
        priority = data.get("priority")
        if isinstance(priority, str):
            priority = priority.strip().title()
        if priority not in VALID_PRIORITIES:
            return jsonify({
                "error": f"Invalid priority '{priority}'. Allowed values: {', '.join(VALID_PRIORITIES)}"
            }), 400
        current_task["priority"] = priority

    # Validate status if supplied
    if "status" in data:
        status_input = data.get("status")
        if isinstance(status_input, str):
            status_norm = status_input.strip().title()
            if status_norm.lower() == "in progress":
                status = "In Progress"
            elif status_norm in VALID_STATUSES:
                status = status_norm
            else:
                status = None
        else:
            status = None

        if status not in VALID_STATUSES:
            return jsonify({
                "error": f"Invalid status '{status_input}'. Allowed values: {', '.join(VALID_STATUSES)}"
            }), 400
        current_task["status"] = status

    current_task["updated_at"] = get_current_timestamp()
    tasks[task_index] = current_task
    write_tasks(tasks)

    return jsonify(current_task), 200


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """
    5. DELETE /api/tasks/<id>
    Delete a task.
    """
    tasks = read_tasks()
    task_index = next((i for i, t in enumerate(tasks) if str(t.get("id")) == str(task_id)), None)

    if task_index is None:
        return jsonify({"error": f"Task with ID '{task_id}' not found"}), 404

    deleted_task = tasks.pop(task_index)
    write_tasks(tasks)

    return jsonify({
        "message": f"Task '{deleted_task.get('title')}' deleted successfully",
        "id": task_id
    }), 200


# ---------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------

@app.errorhandler(404)
def not_found_handler(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Resource not found"}), 404
    return render_template("index.html"), 404


@app.errorhandler(405)
def method_not_allowed_handler(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Method not allowed for requested route"}), 405
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def server_error_handler(e):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    ensure_data_file()
    print("TaskVault Server starting on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True)
