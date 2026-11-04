"""
database.py - SQLite Database Setup and Management for UniVoice
Handles expenses, reminders/tasks, meetings, action items, and campus knowledge base.
"""

import sqlite3
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "univoice.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initializes tables and seeds campus dataset if empty."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Expenses Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Tasks / Reminders Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            due_date TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Meetings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            transcript TEXT,
            summary TEXT,
            email_draft TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. Meeting Action Items Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_action_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER,
            task_description TEXT NOT NULL,
            assignee TEXT DEFAULT 'Unassigned',
            deadline TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
        )
    """)

    # 5. Campus Timetables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campus_timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_code TEXT NOT NULL,
            course_name TEXT NOT NULL,
            professor TEXT NOT NULL,
            day_of_week TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            location TEXT NOT NULL
        )
    """)

    # 6. Campus Events
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campus_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            location TEXT NOT NULL,
            category TEXT NOT NULL
        )
    """)

    # 7. Campus Library
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campus_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT,
            category TEXT NOT NULL,
            rack TEXT NOT NULL,
            available INTEGER DEFAULT 1,
            copies INTEGER DEFAULT 1
        )
    """)

    conn.commit()

    # Seed campus dataset if empty
    seed_campus_data(conn)
    conn.close()

def seed_campus_data(conn):
    cursor = conn.cursor()

    # Check if timetable is already populated
    cursor.execute("SELECT COUNT(*) FROM campus_timetables")
    if cursor.fetchone()[0] == 0:
        sample_timetables = [
            ("CS301", "Database Management Systems", "Dr. Alan Turing", "Monday", "09:00", "10:30", "Lecture Hall A-102"),
            ("CS305", "Artificial Intelligence", "Dr. Priya Nair", "Monday", "11:00", "12:30", "Seminar Room C-204"),
            ("CS302", "Operating Systems", "Prof. David Miller", "Tuesday", "10:00", "11:30", "Lab 3 (Systems Wing)"),
            ("CS308", "Web Technologies", "Dr. Sarah Jenkins", "Tuesday", "14:00", "15:30", "Lecture Hall B-105"),
            ("CS305", "Artificial Intelligence", "Dr. Priya Nair", "Wednesday", "09:00", "10:30", "Seminar Room C-204"),
            ("CS301-L", "Database Systems Lab", "Dr. Alan Turing", "Wednesday", "13:30", "16:30", "CS Computing Lab 2"),
            ("CS302", "Operating Systems", "Prof. David Miller", "Thursday", "10:00", "11:30", "Lab 3 (Systems Wing)"),
            ("CS310", "Software Engineering", "Prof. Marcus Vance", "Thursday", "14:00", "15:30", "Lecture Hall A-102"),
            ("CS399", "Capstone Project Mentorship", "Dr. Priya Nair", "Friday", "10:00", "12:00", "Student Innovation Hub"),
            ("CS310", "Software Engineering", "Prof. Marcus Vance", "Friday", "14:00", "15:30", "Lecture Hall B-105")
        ]
        cursor.executemany("""
            INSERT INTO campus_timetables (course_code, course_name, professor, day_of_week, start_time, end_time, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sample_timetables)

    # Check if events are populated
    cursor.execute("SELECT COUNT(*) FROM campus_events")
    if cursor.fetchone()[0] == 0:
        sample_events = [
            ("Annual Hackathon 2026", "24-hour university coding marathon with tracks in AI, Web3, and Social Impact. $5,000 prize pool.", "2026-11-14", "09:00 AM", "Main Auditorium & Tech Complex", "Hackathon"),
            ("Generative AI & LLM Workshop", "Hands-on masterclass building intelligent voice assistants and multimodal agents with Google Gemini API.", "2026-11-10", "02:00 PM", "Tech Center Lab 1", "Workshop"),
            ("Robotics & IoT Showcase", "Annual exhibition of student-built autonomous drones, rovers, and smart campus IoT gadgets.", "2026-11-12", "11:00 AM", "Student Activity Center", "Exhibition"),
            ("Campus Placement & Career Fair", "Over 45 hiring tech partners recruiting for summer internships and full-time software engineering roles.", "2026-11-20", "10:00 AM", "University Sports Arena", "Career"),
            ("Cultural Fest: UniWaves 2026", "Campus music bands, dance face-offs, food festival, and open-mic night.", "2026-11-28", "05:00 PM", "Open Air Theatre", "Cultural")
        ]
        cursor.executemany("""
            INSERT INTO campus_events (title, description, date, time, location, category)
            VALUES (?, ?, ?, ?, ?, ?)
        """, sample_events)

    # Check if library is populated
    cursor.execute("SELECT COUNT(*) FROM campus_library")
    if cursor.fetchone()[0] == 0:
        sample_books = [
            ("Introduction to Algorithms (CLRS)", "Thomas H. Cormen, Charles E. Leiserson", "978-0262033848", "Computer Science", "Rack A3 - Shelf 2", 1, 3),
            ("Artificial Intelligence: A Modern Approach", "Stuart Russell, Peter Norvig", "978-0136042594", "AI & Machine Learning", "Rack B2 - Shelf 1", 1, 2),
            ("Clean Code: A Handbook of Agile Software Craftsmanship", "Robert C. Martin", "978-0132350884", "Software Engineering", "Rack C1 - Shelf 3", 1, 1),
            ("Designing Data-Intensive Applications", "Martin Kleppmann", "978-1449373320", "Distributed Systems", "Rack C2 - Shelf 5", 0, 0), # Checked out
            ("Computer Networking: A Top-Down Approach", "James Kurose, Keith Ross", "978-0133594140", "Networking", "Rack A2 - Shelf 4", 1, 4),
            ("Operating System Concepts (Dinosaur Book)", "Abraham Silberschatz, Peter B. Galvin", "978-1119800361", "Operating Systems", "Rack B1 - Shelf 3", 1, 2),
            ("Deep Learning", "Ian Goodfellow, Yoshua Bengio, Aaron Courville", "978-0262035613", "AI & Machine Learning", "Rack B2 - Shelf 3", 1, 1),
            ("The Pragmatic Programmer: Your Journey to Mastery", "David Thomas, Andrew Hunt", "978-0135957059", "Software Engineering", "Rack C1 - Shelf 1", 1, 2)
        ]
        cursor.executemany("""
            INSERT INTO campus_library (title, author, isbn, category, rack, available, copies)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, sample_books)

    # Seed initial sample expense and reminder for first-time dashboard preview
    cursor.execute("SELECT COUNT(*) FROM expenses")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO expenses (amount, category, description, date)
            VALUES (12.50, 'Food', 'Cafeteria Lunch & Coffee', ?)
        """, (date.today().isoformat(),))
        cursor.execute("""
            INSERT INTO expenses (amount, category, description, date)
            VALUES (45.00, 'Books', 'Calculus Textbook & Notebooks', ?)
        """, (date.today().isoformat(),))

    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tasks (description, due_date, priority, status)
            VALUES ('Submit AI Project Proposal to Dr. Priya Nair', 'Tomorrow at 5:00 PM', 'high', 'pending')
        """,)
        cursor.execute("""
            INSERT INTO tasks (description, due_date, priority, status)
            VALUES ('Return borrowed Operating Systems book to library', 'Friday', 'medium', 'pending')
        """,)

    conn.commit()

# ==========================================
# MODULE 1: EXPENSES & TASKS CRUD
# ==========================================

def add_expense(amount, category, description, expense_date=None):
    if not expense_date:
        expense_date = date.today().isoformat()
    # Normalize category
    cat_clean = category.strip().title() if category else "Other"
    valid_categories = ["Food", "Travel", "Books", "Supplies", "Tech", "Entertainment", "Health", "Other"]
    if cat_clean not in valid_categories:
        cat_clean = "Other"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO expenses (amount, category, description, date)
        VALUES (?, ?, ?, ?)
    """, (float(amount), cat_clean, description.strip(), expense_date))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {
        "id": new_id,
        "amount": float(amount),
        "category": cat_clean,
        "description": description.strip(),
        "date": expense_date
    }

def get_expenses(limit=50, category=None):
    conn = get_db()
    cursor = conn.cursor()
    if category:
        cursor.execute("""
            SELECT id, amount, category, description, date, created_at
            FROM expenses
            WHERE LOWER(category) = LOWER(?)
            ORDER BY date DESC, id DESC LIMIT ?
        """, (category, limit))
    else:
        cursor.execute("""
            SELECT id, amount, category, description, date, created_at
            FROM expenses
            ORDER BY date DESC, id DESC LIMIT ?
        """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_expense_summary():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM expenses")
    total_amount, total_count = cursor.fetchone()

    today_str = date.today().isoformat()
    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date = ?", (today_str,))
    today_amount = cursor.fetchone()[0]

    cursor.execute("""
        SELECT category, SUM(amount) as cat_total, COUNT(*) as cat_count
        FROM expenses
        GROUP BY category
        ORDER BY cat_total DESC
    """)
    category_breakdown = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total_amount": round(total_amount, 2),
        "today_amount": round(today_amount, 2),
        "total_count": total_count,
        "categories": category_breakdown
    }

def delete_expense(expense_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def add_task(description, due_date="Today", priority="medium"):
    pri = priority.lower() if priority and priority.lower() in ["low", "medium", "high"] else "medium"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tasks (description, due_date, priority, status)
        VALUES (?, ?, ?, 'pending')
    """, (description.strip(), due_date.strip() if due_date else "No due date", pri))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {
        "id": new_id,
        "description": description.strip(),
        "due_date": due_date,
        "priority": pri,
        "status": "pending"
    }

def get_tasks(status=None):
    conn = get_db()
    cursor = conn.cursor()
    if status:
        cursor.execute("""
            SELECT id, description, due_date, priority, status, created_at
            FROM tasks
            WHERE status = ?
            ORDER BY id DESC
        """, (status,))
    else:
        cursor.execute("""
            SELECT id, description, due_date, priority, status, created_at
            FROM tasks
            ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC
        """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def toggle_task(task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    new_status = 'completed' if row['status'] == 'pending' else 'pending'
    cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (new_status, task_id))
    conn.commit()
    conn.close()
    return new_status

def delete_task(task_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ==========================================
# MODULE 2: MEETINGS & ACTION ITEMS
# ==========================================

def save_meeting(title, transcript, summary, email_draft, action_items=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO meetings (title, transcript, summary, email_draft)
        VALUES (?, ?, ?, ?)
    """, (title, transcript, summary, email_draft))
    meeting_id = cursor.lastrowid

    saved_items = []
    if action_items and isinstance(action_items, list):
        for item in action_items:
            task_desc = item.get("task") or item.get("task_description") or "Follow up"
            assignee = item.get("assignee", "Team")
            deadline = item.get("deadline", "TBD")
            cursor.execute("""
                INSERT INTO meeting_action_items (meeting_id, task_description, assignee, deadline)
                VALUES (?, ?, ?, ?)
            """, (meeting_id, task_desc, assignee, deadline))
            saved_items.append({
                "id": cursor.lastrowid,
                "meeting_id": meeting_id,
                "task_description": task_desc,
                "assignee": assignee,
                "deadline": deadline,
                "status": "pending"
            })

    conn.commit()
    conn.close()

    return {
        "id": meeting_id,
        "title": title,
        "transcript": transcript,
        "summary": summary,
        "email_draft": email_draft,
        "action_items": saved_items,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M")
    }

def get_meetings(limit=10):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, transcript, summary, email_draft, created_at
        FROM meetings
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    meetings = [dict(r) for r in cursor.fetchall()]

    for m in meetings:
        cursor.execute("""
            SELECT id, task_description, assignee, deadline, status
            FROM meeting_action_items
            WHERE meeting_id = ?
        """, (m["id"],))
        m["action_items"] = [dict(a) for a in cursor.fetchall()]

    conn.close()
    return meetings

def get_meeting_by_id(meeting_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, transcript, summary, email_draft, created_at
        FROM meetings
        WHERE id = ?
    """, (meeting_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    meeting = dict(row)
    cursor.execute("""
        SELECT id, task_description, assignee, deadline, status
        FROM meeting_action_items
        WHERE meeting_id = ?
    """, (meeting_id,))
    meeting["action_items"] = [dict(a) for a in cursor.fetchall()]
    conn.close()
    return meeting

# ==========================================
# MODULE 3: CAMPUS QUERIES (STRICT GROUNDING)
# ==========================================

def query_timetable(day=None, course=None, professor=None):
    """Queries campus timetable. Returns matching classes."""
    conn = get_db()
    cursor = conn.cursor()
    conditions = []
    params = []

    if day:
        conditions.append("LOWER(day_of_week) LIKE ?")
        params.append(f"%{day.lower().strip()}%")
    if course:
        conditions.append("(LOWER(course_name) LIKE ? OR LOWER(course_code) LIKE ?)")
        params.append(f"%{course.lower().strip()}%")
        params.append(f"%{course.lower().strip()}%")
    if professor:
        conditions.append("LOWER(professor) LIKE ?")
        params.append(f"%{professor.lower().strip()}%")

    sql = "SELECT course_code, course_name, professor, day_of_week, start_time, end_time, location FROM campus_timetables"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, start_time"

    cursor.execute(sql, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def query_events(keyword=None, category=None):
    """Queries campus events."""
    conn = get_db()
    cursor = conn.cursor()
    conditions = []
    params = []

    if keyword:
        conditions.append("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(location) LIKE ?)")
        params.append(f"%{keyword.lower().strip()}%")
        params.append(f"%{keyword.lower().strip()}%")
        params.append(f"%{keyword.lower().strip()}%")
    if category:
        conditions.append("LOWER(category) LIKE ?")
        params.append(f"%{category.lower().strip()}%")

    sql = "SELECT title, description, date, time, location, category FROM campus_events"
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY date ASC"

    cursor.execute(sql, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def query_library(keyword=None):
    """Queries campus library catalog."""
    conn = get_db()
    cursor = conn.cursor()
    if keyword:
        kw = f"%{keyword.lower().strip()}%"
        cursor.execute("""
            SELECT title, author, isbn, category, rack, available, copies
            FROM campus_library
            WHERE LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(category) LIKE ?
            ORDER BY title ASC
        """, (kw, kw, kw))
    else:
        cursor.execute("SELECT title, author, isbn, category, rack, available, copies FROM campus_library ORDER BY title ASC")

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM expenses")
    total_expense, expense_count = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'pending'")
    pending_tasks = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM campus_events")
    total_events = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM meetings")
    total_meetings = cursor.fetchone()[0]

    conn.close()
    return {
        "total_expense": round(total_expense, 2),
        "expense_count": expense_count,
        "pending_tasks": pending_tasks,
        "total_events": total_events,
        "total_meetings": total_meetings
    }

