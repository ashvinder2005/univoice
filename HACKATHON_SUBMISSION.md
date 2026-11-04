# UniVoice – Smart Voice Action Assistant
## Official Hackathon Submission Summary

---

### 📌 Project Overview

* **Project Title:** UniVoice – Smart Voice Action Assistant
* **Track / Category:** AI / Voice AI / Student Productivity & Education
* **Tagline:** A hands-free, action-oriented Voice AI assistant that turns student speech into verified database actions and multimodal workflows.
* **Developer:** Solo Developer (College Hackathon)
* **Development Timeframe:** 6 Hours (Rapid Solo Hackathon Sprint)
* **Repository Link:** Local Project Root / GitHub
* **Startup Command:** `python app.py` $\rightarrow$ `http://127.0.0.1:5000`

---

### 💡 The Problem & The Solution

#### The Problem
College students struggle with fragmented applications for daily campus life: tracking living expenses across messy spreadsheets, managing homework deadlines, typing meeting minutes for group projects, and searching university portals for class schedules and library books. Existing voice chatbots are conversational novelties that produce long paragraphs of text rather than taking concrete action. When asked campus-specific questions, they frequently **hallucinate** fictional professors, rooms, and dates.

#### The UniVoice Solution
**UniVoice** is an **action-oriented** Voice AI assistant. Instead of conversing aimlessly, it executes deterministic actions:
1. **Listens** via the in-browser Web Speech API.
2. **Understands & Extracts Entities** using Google Gemini 2.5 Flash.
3. **Executes Real State Changes** in a local SQLite database.
4. **Responds Multimodally** via dynamic UI updates, an Activity Feed, and spoken voice responses (`SpeechSynthesis`).

---

### 🌟 The Three Modules

| Module | What It Does | Why It Matters for Students |
|---|---|---|
| **1. Voice Expense & Task Tracker** | Logs campus expenses and academic to-dos completely by voice. Automatically extracts amounts, categories (*Food, Travel, Books, etc.*), due dates, and priorities. | Eliminates the friction of manual budgeting and task management. Real-time metrics compute total and daily spending. |
| **2. Meeting Assistant** | Ingests meeting audio (live in-browser recording or file upload) or rough notes. Gemini transcribes the audio, generates an executive summary, isolates action items with assignees and deadlines, and composes a complete follow-up email draft. | Features a **One-Click "Copy Email Draft"** button so students can immediately paste polished follow-up emails into Gmail or Outlook. |
| **3. Campus Assistant (Strict Grounding)** | Answers questions about weekly class timetables, campus events, and central library books with shelf/rack locations and copy availability. | **Strict Grounding:** Guaranteed zero hallucinations. If a requested course or book is not in the official directory, UniVoice explicitly reports that it was not found rather than inventing an answer. |

---

### 🛠️ Architecture & Tech Stack

```text
[Microphone Audio] 
       │
       ▼
[Web Speech API (STT)] ──> [Flask REST API (Python 3.11)]
                                   │
                                   ├──> [Google Gemini 2.5 Flash (google-genai SDK)]
                                   │           │ (Structured JSON / Multimodal Audio)
                                   │           ▼
                                   ├──> [Deterministic Local NLU Fallback]
                                   │
                                   ▼
                       [SQLite Database (univoice.db)]
                                   │
                                   ▼
           [Dynamic Dashboard UI] <──> [SpeechSynthesis Voice (TTS)]
```

* **Backend:** Python 3.11, Flask 3.1, `python-dotenv`
* **Database:** SQLite3 (7 normalized tables, foreign keys, pre-seeded academic data)
* **AI Brain:** Google Gemini 2.5 Flash (`google-genai` SDK) with structured JSON enforcement
* **Voice Engine:** Web Speech API (`SpeechRecognition`) + HTML5 `SpeechSynthesis`
* **Frontend:** Semantic HTML5, CSS3 Glassmorphism (Dark Mode), Vanilla ES6+ JavaScript

---

### 🏆 Key Innovations & Technical Highlights

1. **Deterministic Action Loop:** UniVoice executes real SQLite transactions (`INSERT`, `SELECT`, `UPDATE`, `DELETE`) with strict parameter validation before database execution.
2. **Dual-Engine AI Resilience:** If the Google Gemini API quota is reached or network connectivity drops, UniVoice automatically falls back to an internal **regex/heuristic NLU engine**, ensuring zero downtime during live presentations.
3. **Multimodal Meeting Assistant:** Supports live microphone recording via HTML5 `MediaRecorder`, audio file uploads (`.mp3`, `.wav`, `.webm`, `.m4a`), or raw text notes, all processed by Gemini into structured minutes and email drafts.
4. **Strict Grounding (Anti-Hallucination):** Strictly bounds answers to verified SQLite records. Queries for non-existent entities (e.g. *"When is Quantum Astrology lecture?"*) are cleanly rejected with a polite not-found message.
5. **Zero-Bloat Lightweight Footprint:** Runs on native browser APIs with no heavy Node.js/npm build pipelines, PyTorch/CUDA dependencies, or paid cloud TTS subscriptions.

---

### 🎯 Judging Criteria Alignment

| Criteria | How UniVoice Excels |
|---|---|
| **Technical Execution** | Clean separation of concerns between `app.py`, `database.py`, `gemini_service.py`, and client JS modules. Fully tested with 9 passing automated unit tests in `tests/test_univoice.py`. |
| **Practical Utility** | Addresses real, daily problems faced by university students: budget tracking, project meetings, and campus schedules. |
| **User Experience & Polish** | Modern dark-tech design system with pulsing glowing microphone, live audio waveforms, real-time interim speech transcripts, and one-click clipboard copying. |
| **AI Integration & Ethics** | Uses Gemini 2.5 Flash responsibly with strict prompt engineering, JSON schema enforcement, and zero-hallucination grounding. |

---

### ⏱️ 2-Minute Live Demo Script for Judges

* **0:00 – 0:25 (Voice Expense Tracker):**  
  Click the central mic button and say:  
  `"Spent 14.50 on lunch at cafeteria"`  
  *Show:* Live speech transcript appears $\rightarrow$ AI extracts $14.50, Food, Lunch at Cafeteria $\rightarrow$ Expense table updates $\rightarrow$ UniVoice speaks confirmation.

* **0:25 – 0:50 (Voice Task Reminder):**  
  Click the mic button and say:  
  `"Remind me to submit AI assignment by Friday 5 PM"`  
  *Show:* Task is added to the checklist with due date and priority $\rightarrow$ Click checkbox to toggle complete.

* **0:50 – 1:20 (Meeting Assistant & Email Draft):**  
  Navigate to the Meeting Assistant tab. Paste project notes:  
  `"Alex will deploy Flask backend by Wednesday. Sarah to finish UI by Thursday. David will prepare slides by Friday."`  
  Click **"Process Meeting with AI"**.  
  *Show:* AI generates title, executive summary, 3 action items with assignees/deadlines, and a complete follow-up email draft. Click **"Copy Email Draft"** to trigger the clipboard toast.

* **1:20 – 1:45 (Campus Directory & Anti-Hallucination Demo):**  
  Navigate to Campus Hub. Ask:  
  `"What classes do I have on Monday?"`  
  *Show:* Monday schedule (CS301 & CS305) is read aloud and highlighted.  
  Now test strict grounding:  
  `"When is Quantum Astrology 999 lecture?"`  
  *Show:* UniVoice strictly reports: *"I could not find any classes for Quantum Astrology 999 in the campus timetable directory."*

* **1:45 – 2:00 (Conclusion):**  
  Show the terminal test suite running (`python tests/test_univoice.py`) with all 9 tests passing.

---

### 🚀 Quickstart in 3 Steps
```bash
pip install -r requirements.txt
copy .env.example .env
python app.py
```
Open **`http://127.0.0.1:5000`** in Google Chrome or Microsoft Edge.

