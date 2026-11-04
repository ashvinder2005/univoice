"""
app.py - Main Flask Application for UniVoice
Smart Voice Action Assistant for Solo College Hackathon.
"""

import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import database
import gemini_service

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "univoice-secret-key-hackathon-2026")
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Initialize SQLite database on startup
database.init_db()

# ============================================================
# WEB PAGES
# ============================================================

@app.route("/")
def index():
    """Serves the central dashboard."""
    return render_template("index.html")

# ============================================================
# SYSTEM STATUS & DASHBOARD STATS
# ============================================================

@app.route("/api/system/status", methods=["GET"])
def system_status():
    """Returns AI model status and summary counts."""
    stats = database.get_dashboard_stats()
    gemini_active = gemini_service.is_gemini_available()
    return jsonify({
        "status": "online",
        "gemini_active": gemini_active,
        "engine": "Google Gemini 2.5 Flash" if gemini_active else "Local Fallback NLU (Add GEMINI_API_KEY for Gemini)",
        "stats": stats
    })

# ============================================================
# CORE VOICE ACTION PIPELINE
# User speaks -> STT -> Gemini intent -> Python Action -> DB -> Response
# ============================================================

@app.route("/api/voice-command", methods=["POST"])
def voice_command():
    """
    Core Voice AI Endpoint:
    1. Receives transcribed voice input (or text fallback).
    2. Uses Gemini to extract intent & entities.
    3. Executes database action.
    4. Returns structured result + text response for SpeechSynthesis.
    """
    payload = request.get_json(silent=True) or {}
    user_text = payload.get("text", "").strip()

    if not user_text:
        return jsonify({
            "success": False,
            "error": "No speech or text provided."
        }), 400

    # Step 1 & 2: Understand Intent using Gemini
    intent_data = gemini_service.extract_voice_intent(user_text)
    intent = intent_data.get("intent", "help")
    params = intent_data.get("parameters", {})
    confidence = intent_data.get("confidence", 0.8)
    source = intent_data.get("source", "gemini")

    # Step 3 & 4: Execute predefined action with parameter validation
    result_action = None
    spoken_response = ""
    display_data = None

    if intent == "add_expense":
        amount = params.get("amount")
        if amount is not None and float(amount) > 0:
            category = params.get("category", "Other")
            description = params.get("description", "Voice Expense")
            expense_date = params.get("date")
            new_expense = database.add_expense(amount, category, description, expense_date)
            result_action = "EXPENSE_ADDED"
            spoken_response = f"Added expense of ${float(amount):.2f} for {description} under {new_expense['category']}."
            display_data = {
                "expense": new_expense,
                "summary": database.get_expense_summary()
            }
        else:
            spoken_response = "I couldn't identify the expense amount. Please say something like: 'Spent 15 dollars on lunch'."
            result_action = "EXPENSE_FAILED"

    elif intent == "list_expenses":
        cat = params.get("category")
        expenses = database.get_expenses(limit=10, category=cat)
        summary = database.get_expense_summary()
        result_action = "EXPENSES_LISTED"
        if summary["total_count"] == 0:
            spoken_response = "You have no recorded expenses yet."
        else:
            spoken_response = f"Your total recorded spending is ${summary['total_amount']:.2f} across {summary['total_count']} items. Today's spend is ${summary['today_amount']:.2f}."
        display_data = {
            "expenses": expenses,
            "summary": summary
        }

    elif intent == "add_task":
        desc = params.get("description")
        if desc:
            due = params.get("due_date", "Today")
            priority = params.get("priority", "medium")
            new_task = database.add_task(desc, due, priority)
            result_action = "TASK_ADDED"
            spoken_response = f"Reminder created: {desc}, due {due}."
            display_data = {
                "task": new_task,
                "tasks": database.get_tasks("pending")
            }
        else:
            spoken_response = "I couldn't identify the task details. Try saying: 'Remind me to submit assignment by Friday'."
            result_action = "TASK_FAILED"

    elif intent == "list_tasks":
        tasks = database.get_tasks("pending")
        result_action = "TASKS_LISTED"
        if not tasks:
            spoken_response = "You have no pending tasks or reminders. Great job staying on track!"
        else:
            count = len(tasks)
            top_tasks = ", ".join([t["description"] for t in tasks[:2]])
            spoken_response = f"You have {count} pending {'task' if count == 1 else 'tasks'}. Upcoming: {top_tasks}."
        display_data = {"tasks": tasks}

    elif intent == "query_timetable":
        day = params.get("day")
        course = params.get("course")
        prof = params.get("professor")
        classes = database.query_timetable(day=day, course=course, professor=prof)
        result_action = "TIMETABLE_QUERIED"
        if classes:
            class_summaries = []
            for c in classes[:3]:
                class_summaries.append(f"{c['course_name']} on {c['day_of_week']} at {c['start_time']} in {c['location']}")
            spoken_response = f"Found {len(classes)} matching {'class' if len(classes) == 1 else 'classes'}. " + "; ".join(class_summaries) + "."
            if len(classes) > 3:
                spoken_response += f" And {len(classes) - 3} more on your dashboard."
        else:
            # STRICT GROUNDING: Do not invent classes!
            criteria = []
            if day: criteria.append(f"on {day}")
            if course: criteria.append(f"for {course}")
            if prof: criteria.append(f"with {prof}")
            crit_str = " ".join(criteria) if criteria else "matching your search"
            spoken_response = f"I could not find any classes {crit_str} in the campus timetable directory."
        display_data = {"classes": classes}

    elif intent == "query_events":
        kw = params.get("keyword")
        cat = params.get("category")
        events = database.query_events(keyword=kw, category=cat)
        result_action = "EVENTS_QUERIED"
        if events:
            ev_list = [f"{e['title']} on {e['date']} at {e['location']}" for e in events[:2]]
            spoken_response = f"Found {len(events)} upcoming campus {'event' if len(events) == 1 else 'events'}: " + "; and ".join(ev_list) + "."
        else:
            # STRICT GROUNDING: Do not invent events!
            spoken_response = "No campus events matched your request in the official events registry."
        display_data = {"events": events}

    elif intent == "query_library":
        kw = params.get("keyword")
        books = database.query_library(keyword=kw)
        result_action = "LIBRARY_QUERIED"
        if books:
            b = books[0]
            avail_status = f"available in {b['rack']} with {b['copies']} copies" if b['available'] else "currently checked out and unavailable"
            spoken_response = f"Found '{b['title']}' by {b['author']}. It is {avail_status}."
        else:
            # STRICT GROUNDING: Do not invent books!
            term = kw or 'that title'
            spoken_response = f"I searched the university library catalog, but '{term}' was not found. Please check with the library front desk."
        display_data = {"books": books}

    else:
        result_action = "HELP"
        spoken_response = "Hi! I am UniVoice. I can track your expenses, manage reminders, transcribe meetings with email drafts, and answer campus questions about timetables, events, and library books."
        display_data = None

    return jsonify({
        "success": True,
        "input_text": user_text,
        "intent": intent,
        "confidence": confidence,
        "source": source,
        "action_taken": result_action,
        "spoken_response": spoken_response,
        "data": display_data,
        "stats": database.get_dashboard_stats()
    })

# ============================================================
# MODULE 1: EXPENSES & REMINDERS REST APIS
# ============================================================

@app.route("/api/expenses", methods=["GET"])
def list_expenses():
    cat = request.args.get("category")
    limit = int(request.args.get("limit", 50))
    expenses = database.get_expenses(limit=limit, category=cat)
    summary = database.get_expense_summary()
    return jsonify({
        "expenses": expenses,
        "summary": summary
    })

@app.route("/api/expenses", methods=["POST"])
def create_expense():
    data = request.get_json(silent=True) or {}
    try:
        amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    category = data.get("category", "Other")
    description = data.get("description", "Manual Expense")
    expense_date = data.get("date")

    exp = database.add_expense(amount, category, description, expense_date)
    return jsonify({
        "success": True,
        "expense": exp,
        "summary": database.get_expense_summary()
    }), 201

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def remove_expense(expense_id):
    deleted = database.delete_expense(expense_id)
    return jsonify({
        "success": deleted,
        "summary": database.get_expense_summary()
    })

@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    status = request.args.get("status")
    tasks = database.get_tasks(status=status)
    return jsonify({"tasks": tasks})

@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json(silent=True) or {}
    desc = data.get("description", "").strip()
    if not desc:
        return jsonify({"error": "Task description is required"}), 400
    due = data.get("due_date", "Today")
    priority = data.get("priority", "medium")
    task = database.add_task(desc, due, priority)
    return jsonify({"success": True, "task": task}), 201

@app.route("/api/tasks/<int:task_id>/toggle", methods=["PATCH"])
def toggle_task(task_id):
    new_status = database.toggle_task(task_id)
    if new_status is None:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"success": True, "status": new_status})

@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def remove_task(task_id):
    deleted = database.delete_task(task_id)
    return jsonify({"success": deleted})

# ============================================================
# MODULE 2: MEETING ASSISTANT REST APIS
# ============================================================

@app.route("/api/meetings/process", methods=["POST"])
def process_meeting():
    """
    Accepts audio upload (wav/webm/mp3) OR text notes.
    Uses Gemini to transcribe, summarize, extract action items, and draft an email.
    """
    audio_file = request.files.get("audio")
    text_content = request.form.get("transcript") or request.form.get("text")

    # Also handle JSON payload if sent as json
    if not audio_file and not text_content and request.is_json:
        json_data = request.get_json(silent=True) or {}
        text_content = json_data.get("transcript") or json_data.get("text")

    if not audio_file and not text_content:
        return jsonify({"error": "Please provide an audio recording or meeting notes text."}), 400

    audio_bytes = None
    mime_type = "audio/webm"

    if audio_file:
        audio_bytes = audio_file.read()
        mime_type = audio_file.content_type or "audio/webm"

    # Analyze with Gemini
    analysis = gemini_service.analyze_meeting(
        text_content=text_content,
        audio_bytes=audio_bytes,
        mime_type=mime_type
    )

    # Save to SQLite
    title = analysis.get("title", "Project Meeting")
    transcript = analysis.get("transcript", text_content or "Audio transcript")
    summary = analysis.get("summary", "")
    email_draft = analysis.get("email_draft", "")
    action_items = analysis.get("action_items", [])

    saved_meeting = database.save_meeting(
        title=title,
        transcript=transcript,
        summary=summary,
        email_draft=email_draft,
        action_items=action_items
    )

    return jsonify({
        "success": True,
        "meeting": saved_meeting,
        "source": analysis.get("source", "gemini")
    }), 201

@app.route("/api/meetings", methods=["GET"])
def get_meetings():
    meetings = database.get_meetings(limit=15)
    return jsonify({"meetings": meetings})

@app.route("/api/meetings/<int:meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    meeting = database.get_meeting_by_id(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    return jsonify({"meeting": meeting})

# ============================================================
# MODULE 3: CAMPUS ASSISTANT REST APIS
# ============================================================

@app.route("/api/campus/timetable", methods=["GET"])
def get_timetable():
    day = request.args.get("day")
    course = request.args.get("course")
    prof = request.args.get("professor")
    classes = database.query_timetable(day=day, course=course, professor=prof)
    return jsonify({
        "count": len(classes),
        "classes": classes
    })

@app.route("/api/campus/events", methods=["GET"])
def get_events():
    kw = request.args.get("keyword")
    cat = request.args.get("category")
    events = database.query_events(keyword=kw, category=cat)
    return jsonify({
        "count": len(events),
        "events": events
    })

@app.route("/api/campus/library", methods=["GET"])
def get_library():
    kw = request.args.get("query") or request.args.get("keyword")
    books = database.query_library(keyword=kw)
    return jsonify({
        "count": len(books),
        "books": books
    })

# ============================================================
# APPLICATION RUNNER
# ============================================================

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║              UniVoice - Smart Voice Assistant                ║
║           Solo College Hackathon Production Build            ║
║  URL: http://127.0.0.1:{port}                                    ║
╚══════════════════════════════════════════════════════════════╝
    """)
    app.run(host="0.0.0.0", port=port, debug=debug)

