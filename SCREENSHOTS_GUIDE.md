# UniVoice – Screenshot Capture & Documentation Guide
## Recommended Visual Assets for Submission & Presentation Slides

This guide outlines the exact screenshots to capture for the **UniVoice** hackathon submission, GitHub repository showcase, and judging slide deck.

---

### 📷 Recommended Capture Settings
* **Browser:** Google Chrome or Microsoft Edge (100% zoom).
* **Viewport Resolution:** 1920 × 1080 (1080p Full HD) or 1440 × 900.
* **Format:** PNG (lossless compression).
* **Folder Location:** Save images into a `screenshots/` directory in the repository root.

---

### 🖼️ Screenshot Checklist

#### Screenshot 1: Central Voice Console in Active State
* **Filename:** `screenshots/01_voice_console_active.png`
* **Tab:** **Console** (Main View)
* **What to Show:**
  * Click the central microphone button so the button turns pulsating red with the active halo.
  * 10 animated audio wave bars bouncing actively below the mic.
  * Recognized Speech card displaying interim transcript: *"Spent $14.50 on lunch at cafeteria"*.
  * UniVoice AI Response card showing: *"Added expense of $14.50 for Lunch At Cafeteria under Food."*
  * Green action badge: `Action Executed: EXPENSE ADDED (add_expense)`.
  * Top navigation bar with green status pill: `Gemini 2.5 Flash Online`.
* **Caption / Slide Context:** *"Core Voice Interaction Loop: Real-time STT, Gemini intent extraction, parameter validation, and visual + synthetic voice response."*

---

#### Screenshot 2: Module 1 – Voice Expense & Task Tracker
* **Filename:** `screenshots/02_expense_task_tracker.png`
* **Tab:** **Expenses & Tasks**
* **What to Show:**
  * Metric summary cards at the top: *Total Tracked Spend ($72.00)*, *Pending Reminders (2)*.
  * Left Panel: *Expenses Breakdown* table populated with 3–4 items across categories (*Food, Books, Travel*) with colored badges, dates, and amounts.
  * Right Panel: *Reminders & Tasks* checklist showing items with due dates (e.g. *Friday 5 PM*), priority flags, and at least one task marked completed (strikethrough text).
* **Caption / Slide Context:** *"Module 1: Hands-free expense logging and academic task reminders backed by SQLite persistence."*

---

#### Screenshot 3: Manual Fallback Modals
* **Filename:** `screenshots/03_manual_modal_fallback.png`
* **Tab:** **Expenses & Tasks** (with Modal Open)
* **What to Show:**
  * Click the **"Manual Expense"** or **"Manual Task"** button to trigger the modal dialog.
  * Glassmorphism background blur overlay with clean form fields (*Description, Amount, Category dropdown*).
* **Caption / Slide Context:** *"Accessibility & Reliability: Manual text fallback options ensure students can always manage data even in quiet study environments."*

---

#### Screenshot 4: Module 2 – Meeting Assistant (Input & Recording)
* **Filename:** `screenshots/04_meeting_assistant_input.png`
* **Tab:** **Meeting Assistant**
* **What to Show:**
  * Left Panel: In-browser audio recording module showing timer at `00:18` with pulsing recording circle.
  * Drag-and-drop audio dropzone below with supported formats tag (`.mp3, .wav, .webm, .m4a`).
  * Notes input textarea populated with sample project discussion text:  
    *"Alex will deploy Flask backend by Wednesday. Sarah to finish UI styling by Thursday. David will prepare presentation slides by Friday."*
* **Caption / Slide Context:** *"Module 2 Ingestion: Multimodal options supporting live microphone audio, audio file uploads, or rough typed notes."*

---

#### Screenshot 5: Module 2 – Meeting Assistant (AI Insights & Email Draft)
* **Filename:** `screenshots/05_meeting_ai_email_draft.png`
* **Tab:** **Meeting Assistant**
* **What to Show:**
  * Right Panel: Meeting title (e.g. `Capstone Sprint 2 Sync-up`), Executive Summary bullet points.
  * Extracted Action Items cards highlighting assignees (blue badge) and deadlines (amber badge).
  * Follow-up Email Draft preview card showing complete email with subject line, greeting, and sign-off.
  * Click **"Copy Email Draft"** button so the button displays `Copied!` and an animated toast notification appears at the bottom-right: *"Email draft copied to clipboard! Ready to paste into Gmail or Outlook."*
* **Caption / Slide Context:** *"Multimodal AI Processing: Gemini transcribes audio, extracts action items, and generates an executive email draft with one-click clipboard copying."*

---

#### Screenshot 6: Module 3 – Campus Hub (Weekly Timetables)
* **Filename:** `screenshots/06_campus_timetable.png`
* **Tab:** **Campus Hub** $\rightarrow$ **Class Timetables**
* **What to Show:**
  * Weekly class schedule table with filter pill `Monday` selected.
  * Showing course codes (`CS301`, `CS305`), course titles (*Database Management Systems*, *Artificial Intelligence*), professors (*Dr. Alan Turing*, *Dr. Priya Nair*), and lecture halls (*Hall A-102*, *Room C-204*).
* **Caption / Slide Context:** *"Module 3 Timetable: Instant schedule lookups by day, course code, or professor name."*

---

#### Screenshot 7: Module 3 – Campus Hub (Library Catalog & Shelf Locations)
* **Filename:** `screenshots/07_campus_library_catalog.png`
* **Tab:** **Campus Hub** $\rightarrow$ **Library Catalog**
* **What to Show:**
  * Library search bar with search term `"Clean Code"`.
  * Table displaying book title, author (*Robert C. Martin*), category (*Software Engineering*), physical shelf rack (`Rack C1 - Shelf 3`), and green status badge `Available (1 copies)`.
  * Include a second row showing *Designing Data-Intensive Applications* with red badge `Checked Out`.
* **Caption / Slide Context:** *"Central Library Directory: Real-time book search with physical rack coordinates and availability counts."*

---

#### Screenshot 8: Anti-Hallucination Strict Grounding Demo
* **Filename:** `screenshots/08_strict_grounding_demo.png`
* **Tab:** **Console**
* **What to Show:**
  * Recognized speech card: *"When is Quantum Astrology 999 lecture?"*
  * AI response card: *"I could not find any classes for Quantum Astrology 999 in the campus timetable directory."*
  * Grounding callout card in Campus Hub highlighting strict grounding principles.
* **Caption / Slide Context:** *"Strict Grounding Guardrails: Rejects false queries and explicitly reports missing items rather than hallucinating fictional campus information."*

---

#### Screenshot 9: Automated Unit Test Suite (Terminal Verification)
* **Filename:** `screenshots/09_automated_tests_pass.png`
* **Window:** VS Code Terminal / PowerShell
* **What to Show:**
  * Command: `python tests/test_univoice.py`
  * Clean output showing all 9 test cases passing:
    ```text
    .........
    ----------------------------------------------------------------------
    Ran 9 tests in 0.220s

    OK
    [PASS] System status endpoint OK
    [PASS] Voice add expense OK
    [PASS] Voice add task OK
    [PASS] Voice list expenses and tasks OK
    [PASS] Campus timetable query OK
    [PASS] Campus strict grounding (no hallucinations) OK
    [PASS] Campus library query OK
    [PASS] Meeting processing, action items extraction, & email draft OK
    [PASS] Manual CRUD endpoints OK
    ```
* **Caption / Slide Context:** *"Comprehensive Automated Verification: 100% passing test coverage verifying backend APIs, database integrity, and voice intent processing."*

---

### 📊 Recommended Slide Deck Layout

| Slide # | Slide Title | Recommended Screenshot |
|---|---|---|
| **Slide 1** | Cover & Elevator Pitch | `01_voice_console_active.png` |
| **Slide 2** | The Problem: Campus Friction | Diagram / Icons |
| **Slide 3** | Architecture: The Voice Action Loop | Architecture Mermaid Diagram |
| **Slide 4** | Module 1: Voice Expense & Tasks | `02_expense_task_tracker.png` |
| **Slide 5** | Module 2: Meeting Assistant & Email Draft | `05_meeting_ai_email_draft.png` |
| **Slide 6** | Module 3: Grounded Campus Hub | `06_campus_timetable.png` & `07_campus_library_catalog.png` |
| **Slide 7** | Anti-Hallucination & AI Reliability | `08_strict_grounding_demo.png` |
| **Slide 8** | Technical Verification & Test Results | `09_automated_tests_pass.png` |
| **Slide 9** | Conclusion & Future Roadmap | Summary & Repository Link |

