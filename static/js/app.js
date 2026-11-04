/**
 * app.js - Main Application Logic for UniVoice
 * Handles state, API interactions, dashboard updates, meeting recorder, and UI events.
 */

(function () {
  'use strict';

  // State
  let appState = {
    geminiActive: false,
    stats: {},
    expenses: [],
    expenseSummary: {},
    tasks: [],
    meetings: [],
    currentMeeting: null,
    timetable: [],
    events: [],
    library: [],
    activityLog: []
  };

  // MediaRecorder state for Meeting Assistant
  let mediaRecorder = null;
  let audioChunks = [];
  let recordInterval = null;
  let recordSeconds = 0;
  let recordedAudioBlob = null;
  let uploadedAudioFile = null;

  // DOM Elements
  const speechOutput = document.getElementById('recognized-speech-text');
  const aiResponseText = document.getElementById('ai-response-text');
  const aiEngineTag = document.getElementById('ai-engine-tag');
  const aiStatusText = document.getElementById('ai-status-text');
  const aiStatusPill = document.getElementById('ai-status-pill');
  const aiActionBadgeContainer = document.getElementById('ai-action-badge-container');
  const fallbackInput = document.getElementById('voice-fallback-input');
  const sendBtn = document.getElementById('send-command-btn');

  // ============================================================
  // INITIALIZATION
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    initVoiceEngine();
    initNavigationTabs();
    initQuickPrompts();
    initFallbackInput();
    initModals();
    initMeetingRecorder();
    initMeetingUpload();
    initCopyButtons();
    initCampusFilters();

    // Load initial data from SQLite backend
    loadSystemStatus();
    loadExpenses();
    loadTasks();
    loadMeetings();
    loadTimetable();
    loadEvents();
    loadLibrary();
    loadCachedActivity();
  });

  function initVoiceEngine() {
    if (window.VoiceEngine) {
      window.VoiceEngine.init((spokenText) => {
        if (spokenText) {
          executeVoiceCommand(spokenText);
        }
      });
    }
  }

  // ============================================================
  // CORE VOICE COMMAND PIPELINE
  // ============================================================
  async function executeVoiceCommand(commandText) {
    if (!commandText || !commandText.trim()) return;

    const query = commandText.trim();
    if (speechOutput) speechOutput.textContent = `"${query}"`;
    if (aiResponseText) aiResponseText.textContent = "Processing with UniVoice AI...";
    if (aiEngineTag) aiEngineTag.textContent = "Analyzing Intent...";

    try {
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });

      const data = await response.json();

      if (data.success) {
        // 1. Display AI response text
        if (aiResponseText) aiResponseText.textContent = data.spoken_response;
        if (aiEngineTag) aiEngineTag.textContent = data.source || 'Gemini 2.5 Flash';

        // 2. Render Action Badge
        renderActionBadge(data.action_taken, data.intent);

        // 3. Browser Voice Synthesis
        if (window.VoiceEngine) {
          window.VoiceEngine.speak(data.spoken_response);
        }

        // 4. Log to Live Activity Feed
        addActivityItem({
          command: query,
          intent: data.intent,
          action: data.action_taken,
          response: data.spoken_response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // 5. Update data reactively based on action
        if (data.action_taken === 'EXPENSE_ADDED' || data.intent === 'list_expenses') {
          loadExpenses();
          showToast(`Expense updated! Recorded in SQLite.`, 'success');
        } else if (data.action_taken === 'TASK_ADDED' || data.intent === 'list_tasks') {
          loadTasks();
          showToast(`Task reminder saved!`, 'success');
        } else if (data.intent === 'query_timetable') {
          if (data.data && data.data.classes) {
            renderTimetableTable(data.data.classes);
          }
        } else if (data.intent === 'query_events') {
          if (data.data && data.data.events) {
            renderEventsGrid(data.data.events);
          }
        } else if (data.intent === 'query_library') {
          if (data.data && data.data.books) {
            renderLibraryTable(data.data.books);
          }
        }

        // Refresh stats
        if (data.stats) updateStatsUI(data.stats);
      } else {
        if (aiResponseText) aiResponseText.textContent = data.error || "Sorry, I could not understand that command.";
      }
    } catch (err) {
      console.error('[UniVoice Error]:', err);
      if (aiResponseText) aiResponseText.textContent = "Network error connecting to backend service.";
      showToast("Could not reach backend API.", "error");
    }
  }

  function renderActionBadge(action, intent) {
    if (!aiActionBadgeContainer) return;
    if (!action) {
      aiActionBadgeContainer.innerHTML = '';
      return;
    }
    const cleanAction = action.replace('_', ' ');
    aiActionBadgeContainer.innerHTML = `
      <span class="badge badge-primary mt-3" style="display: inline-block;">
        <i class="fa-solid fa-check-circle"></i> Action Executed: ${cleanAction} (${intent})
      </span>
    `;
  }

  // ============================================================
  // NAVIGATION TABS & SUB-TABS
  // ============================================================
  function initNavigationTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const activePane = document.getElementById(`tab-${targetTab}`);
        if (activePane) activePane.classList.add('active');
      });
    });

    // Campus Hub Sub-Tabs
    const subtabBtns = document.querySelectorAll('.subtab-btn');
    const subtabContents = document.querySelectorAll('.subtab-content');

    subtabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = btn.getAttribute('data-subtab');
        subtabBtns.forEach(b => b.classList.remove('active'));
        subtabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const activeContent = document.getElementById(`subtab-${sub}`);
        if (activeContent) activeContent.classList.add('active');
      });
    });
  }

  // Quick Action Prompt Chips
  function initQuickPrompts() {
    const promptChips = document.querySelectorAll('.prompt-chip');
    promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-command');
        if (cmd) {
          executeVoiceCommand(cmd);
        }
      });
    });
  }

  // Fallback Text Input
  function initFallbackInput() {
    if (sendBtn && fallbackInput) {
      const handleSend = () => {
        const val = fallbackInput.value.trim();
        if (val) {
          executeVoiceCommand(val);
          fallbackInput.value = '';
        }
      };

      sendBtn.addEventListener('click', handleSend);
      fallbackInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
      });
    }
  }

  // ============================================================
  // SYSTEM STATUS & METRICS
  // ============================================================
  async function loadSystemStatus() {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      appState.geminiActive = data.gemini_active;
      appState.stats = data.stats || {};

      if (aiStatusText) {
        aiStatusText.textContent = data.gemini_active ? "Gemini 2.5 Flash Online" : "Local NLU Mode";
      }
      if (aiStatusPill) {
        if (data.gemini_active) {
          aiStatusPill.classList.remove('offline');
          aiStatusPill.title = "Connected to Google Gemini 2.5 Flash API";
        } else {
          aiStatusPill.classList.add('offline');
          aiStatusPill.title = "Local rule-based NLU active. Provide GEMINI_API_KEY in .env for Gemini multimodal features.";
        }
      }

      updateStatsUI(appState.stats);
    } catch (e) {
      console.warn('Status check failed:', e);
    }
  }

  function updateStatsUI(stats) {
    if (!stats) return;
    const totalExpEl = document.getElementById('stat-total-expense');
    const todayExpEl = document.getElementById('stat-today-expense');
    const tasksEl = document.getElementById('stat-pending-tasks');
    const meetingsEl = document.getElementById('stat-total-meetings');
    const eventsEl = document.getElementById('stat-total-events');

    if (totalExpEl && stats.total_expense !== undefined) {
      totalExpEl.textContent = `$${stats.total_expense.toFixed(2)}`;
    }
    if (tasksEl && stats.pending_tasks !== undefined) {
      tasksEl.textContent = stats.pending_tasks;
    }
    if (meetingsEl && stats.total_meetings !== undefined) {
      meetingsEl.textContent = stats.total_meetings;
    }
    if (eventsEl && stats.total_events !== undefined) {
      eventsEl.textContent = stats.total_events;
    }
  }

  // ============================================================
  // MODULE 1: EXPENSES & TASKS
  // ============================================================
  async function loadExpenses(category = '') {
    try {
      const url = category ? `/api/expenses?category=${encodeURIComponent(category)}` : '/api/expenses';
      const res = await fetch(url);
      const data = await res.json();
      appState.expenses = data.expenses || [];
      appState.expenseSummary = data.summary || {};

      renderExpensesTable(appState.expenses);
      renderOverviewExpenses(appState.expenses);

      const totalBanner = document.getElementById('expense-total-banner');
      if (totalBanner && appState.expenseSummary.total_amount !== undefined) {
        totalBanner.textContent = `Total Spend: $${appState.expenseSummary.total_amount.toFixed(2)} (${appState.expenseSummary.total_count} transactions)`;
      }

      const todayExpEl = document.getElementById('stat-today-expense');
      if (todayExpEl && appState.expenseSummary.today_amount !== undefined) {
        todayExpEl.textContent = `Today: $${appState.expenseSummary.today_amount.toFixed(2)}`;
      }

      const totalExpEl = document.getElementById('stat-total-expense');
      if (totalExpEl && appState.expenseSummary.total_amount !== undefined) {
        totalExpEl.textContent = `$${appState.expenseSummary.total_amount.toFixed(2)}`;
      }
    } catch (e) {
      console.error('Error loading expenses:', e);
    }
  }

  function renderExpensesTable(expenses) {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    if (!expenses.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-dim); padding: 2rem;">No expenses found. Use voice command: "Spent 15 on lunch".</td></tr>`;
      return;
    }

    tbody.innerHTML = expenses.map(exp => `
      <tr>
        <td style="font-weight: 500;">${escapeHtml(exp.description || 'Expense')}</td>
        <td><span class="badge-category cat-${exp.category}">${exp.category}</span></td>
        <td style="color: var(--text-muted); font-size: 0.82rem;">${exp.date}</td>
        <td class="text-right" style="font-weight: 700; color: #fff;">$${exp.amount.toFixed(2)}</td>
        <td class="text-center">
          <button class="btn-danger-icon" onclick="window.deleteExpenseItem(${exp.id})" title="Delete Expense">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderOverviewExpenses(expenses) {
    const container = document.getElementById('overview-expenses-list');
    if (!container) return;
    if (!expenses.length) {
      container.innerHTML = `<p class="placeholder-text">No expenses tracked yet.</p>`;
      return;
    }
    container.innerHTML = expenses.slice(0, 3).map(exp => `
      <div class="mini-item">
        <div>
          <span style="font-weight: 600;">${escapeHtml(exp.description)}</span>
          <span class="badge-category cat-${exp.category}" style="margin-left: 0.5rem; font-size: 0.68rem;">${exp.category}</span>
        </div>
        <span style="font-weight: 700; color: #fff;">$${exp.amount.toFixed(2)}</span>
      </div>
    `).join('');
  }

  window.deleteExpenseItem = async function (id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Expense deleted.', 'info');
        loadExpenses();
      }
    } catch (e) {
      showToast('Failed to delete expense.', 'error');
    }
  };

  // Category filter dropdown
  const categoryFilter = document.getElementById('expense-category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      loadExpenses(categoryFilter.value);
    });
  }

  // TASKS & REMINDERS
  async function loadTasks(status = '') {
    try {
      const url = status ? `/api/tasks?status=${status}` : '/api/tasks';
      const res = await fetch(url);
      const data = await res.json();
      appState.tasks = data.tasks || [];

      renderTasksChecklist(appState.tasks);
      renderOverviewTasks(appState.tasks);

      // Update pending count in stat card
      const pendingCount = appState.tasks.filter(t => t.status === 'pending').length;
      const tasksEl = document.getElementById('stat-pending-tasks');
      if (tasksEl) tasksEl.textContent = pendingCount;
    } catch (e) {
      console.error('Error loading tasks:', e);
    }
  }

  function renderTasksChecklist(tasks) {
    const container = document.getElementById('tasks-checklist');
    if (!container) return;

    if (!tasks.length) {
      container.innerHTML = `<p class="placeholder-text" style="padding: 1.5rem; text-align: center;">No reminders right now. Say: "Remind me to finish homework by Friday".</p>`;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const isCompleted = t.status === 'completed';
      const priClass = `task-priority-${t.priority || 'medium'}`;
      return `
        <div class="task-item ${isCompleted ? 'completed' : ''}" id="task-row-${t.id}">
          <div class="task-checkbox-wrap">
            <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} onchange="window.toggleTaskItem(${t.id})">
            <span class="task-text">${escapeHtml(t.description)}</span>
          </div>
          <div class="task-meta">
            <span class="task-due-badge"><i class="fa-regular fa-clock"></i> ${escapeHtml(t.due_date || 'Today')}</span>
            <span class="${priClass}" title="Priority: ${t.priority}"><i class="fa-solid fa-flag"></i></span>
            <button class="btn-danger-icon" onclick="window.deleteTaskItem(${t.id})" title="Delete Reminder">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderOverviewTasks(tasks) {
    const container = document.getElementById('overview-tasks-list');
    if (!container) return;
    const pending = tasks.filter(t => t.status === 'pending');
    if (!pending.length) {
      container.innerHTML = `<p class="placeholder-text">All caught up! No pending tasks.</p>`;
      return;
    }
    container.innerHTML = pending.slice(0, 3).map(t => `
      <div class="mini-item">
        <span style="font-weight: 500;">${escapeHtml(t.description)}</span>
        <span class="task-due-badge">${escapeHtml(t.due_date)}</span>
      </div>
    `).join('');
  }

  window.toggleTaskItem = async function (id) {
    try {
      const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadTasks();
      }
    } catch (e) {
      showToast('Failed to update task.', 'error');
    }
  };

  window.deleteTaskItem = async function (id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Reminder deleted.', 'info');
        loadTasks();
      }
    } catch (e) {
      showToast('Failed to delete reminder.', 'error');
    }
  };

  // Task filter select
  const taskFilterSelect = document.getElementById('task-filter-select');
  if (taskFilterSelect) {
    taskFilterSelect.addEventListener('change', () => {
      const val = taskFilterSelect.value === 'all' ? '' : 'pending';
      loadTasks(val);
    });
  }

  // ============================================================
  // MODULE 2: MEETING ASSISTANT
  // ============================================================
  function initMeetingRecorder() {
    const recordBtn = document.getElementById('meeting-record-btn');
    const timerEl = document.getElementById('record-timer');
    const instructionEl = document.getElementById('record-instruction');

    if (!recordBtn) return;

    recordBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Stop recording
        mediaRecorder.stop();
        clearInterval(recordInterval);
        recordBtn.classList.remove('recording');
        if (instructionEl) instructionEl.textContent = 'Audio recorded! Click "Process Meeting with AI" below.';
        showToast('Meeting audio recording captured!', 'success');
      } else {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          audioChunks = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.onstop = () => {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            uploadedAudioFile = null;
            // Free microphone stream
            stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          recordBtn.classList.add('recording');
          recordSeconds = 0;
          if (instructionEl) instructionEl.textContent = 'Recording in progress... Click again to stop.';

          recordInterval = setInterval(() => {
            recordSeconds++;
            const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
            const secs = String(recordSeconds % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
          }, 1000);

        } catch (err) {
          console.error('Mic access error:', err);
          showToast('Could not access microphone for meeting recording.', 'error');
        }
      }
    });
  }

  function initMeetingUpload() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('meeting-file-input');
    const fileInfo = document.getElementById('selected-file-info');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleAudioFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        handleAudioFileSelected(fileInput.files[0]);
      }
    });

    function handleAudioFileSelected(file) {
      uploadedAudioFile = file;
      recordedAudioBlob = null; // Prioritize uploaded file
      if (fileInfo) {
        fileInfo.classList.remove('hidden');
        fileInfo.innerHTML = `
          <span><i class="fa-solid fa-file-audio"></i> ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          <button class="btn-xs btn-outline" id="remove-file-btn"><i class="fa-solid fa-xmark"></i></button>
        `;
        document.getElementById('remove-file-btn').onclick = (e) => {
          e.stopPropagation();
          uploadedAudioFile = null;
          fileInput.value = '';
          fileInfo.classList.add('hidden');
        };
      }
      showToast(`Selected file: ${file.name}`, 'info');
    }

    // Process Meeting Button Handler
    const processBtn = document.getElementById('process-meeting-btn');
    if (processBtn) {
      processBtn.addEventListener('click', async () => {
        const notesInput = document.getElementById('meeting-notes-input');
        const notesText = notesInput ? notesInput.value.trim() : '';

        if (!uploadedAudioFile && !recordedAudioBlob && !notesText) {
          showToast('Please record audio, upload an audio file, or paste meeting notes first.', 'error');
          return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing with Gemini AI...`;

        try {
          const formData = new FormData();
          if (uploadedAudioFile) {
            formData.append('audio', uploadedAudioFile);
          } else if (recordedAudioBlob) {
            formData.append('audio', recordedAudioBlob, 'meeting-recording.webm');
          }
          if (notesText) {
            formData.append('transcript', notesText);
          }

          const res = await fetch('/api/meetings/process', {
            method: 'POST',
            body: formData
          });

          const data = await res.json();

          if (data.success && data.meeting) {
            displayMeetingResults(data.meeting);
            showToast('Meeting analyzed successfully! Summary and email draft ready.', 'success');
            loadMeetings(); // Refresh history
            loadSystemStatus();
          } else {
            showToast(data.error || 'Failed to process meeting.', 'error');
          }
        } catch (err) {
          console.error('Meeting process error:', err);
          showToast('Error communicating with AI service.', 'error');
        } finally {
          processBtn.disabled = false;
          processBtn.innerHTML = `<i class="fa-solid fa-sparkles"></i> Process Meeting with AI`;
        }
      });
    }
  }

  function displayMeetingResults(meeting) {
    appState.currentMeeting = meeting;

    const titleEl = document.getElementById('current-meeting-title');
    const dateEl = document.getElementById('meeting-date-subtitle');
    const summaryEl = document.getElementById('meeting-summary-text');
    const actionsEl = document.getElementById('meeting-actions-container');
    const emailEl = document.getElementById('meeting-email-draft');

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-clipboard-check"></i> ${escapeHtml(meeting.title || 'Meeting Summary')}`;
    if (dateEl) dateEl.textContent = `Analyzed on ${meeting.created_at || 'Today'} • Powered by Google Gemini`;

    if (summaryEl) {
      summaryEl.innerHTML = meeting.summary ? escapeHtml(meeting.summary) : '<p class="placeholder-text">No summary points generated.</p>';
    }

    if (actionsEl) {
      if (meeting.action_items && meeting.action_items.length) {
        actionsEl.innerHTML = meeting.action_items.map(item => `
          <div class="action-card">
            <span class="action-title">${escapeHtml(item.task || item.task_description)}</span>
            <div class="action-badges">
              <span class="badge-assignee"><i class="fa-regular fa-user"></i> ${escapeHtml(item.assignee || 'Team')}</span>
              <span class="badge-deadline"><i class="fa-regular fa-calendar-check"></i> ${escapeHtml(item.deadline || 'TBD')}</span>
            </div>
          </div>
        `).join('');
      } else {
        actionsEl.innerHTML = '<p class="placeholder-text">No specific action items identified.</p>';
      }
    }

    if (emailEl) {
      emailEl.textContent = meeting.email_draft || 'No email draft generated.';
    }
  }

  // Copy Email Draft to Clipboard
  function initCopyButtons() {
    const copyBtns = [document.getElementById('copy-email-btn'), document.getElementById('copy-email-sub-btn')];

    copyBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const emailEl = document.getElementById('meeting-email-draft');
        const draftText = emailEl ? emailEl.textContent.trim() : '';

        if (!draftText || draftText.startsWith('Email draft will be')) {
          showToast('No email draft available to copy. Process a meeting first!', 'info');
          return;
        }

        try {
          await navigator.clipboard.writeText(draftText);
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
          btn.classList.add('copied');
          showToast('Email draft copied to clipboard! Ready to paste into Gmail or Outlook.', 'success');

          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
          }, 2500);
        } catch (e) {
          showToast('Failed to copy to clipboard.', 'error');
        }
      });
    });
  }

  async function loadMeetings() {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      appState.meetings = data.meetings || [];

      const countEl = document.getElementById('meetings-history-count');
      if (countEl) countEl.textContent = `${appState.meetings.length} Saved`;

      const grid = document.getElementById('past-meetings-list');
      if (!grid) return;

      if (!appState.meetings.length) {
        grid.innerHTML = `<p class="placeholder-text" style="grid-column: 1/-1;">No saved meetings yet. Record or upload an audio clip above to start.</p>`;
        return;
      }

      grid.innerHTML = appState.meetings.map(m => `
        <div class="past-meeting-card" onclick="window.viewPastMeeting(${m.id})">
          <div class="past-meeting-title">${escapeHtml(m.title)}</div>
          <div class="past-meeting-date"><i class="fa-regular fa-clock"></i> ${m.created_at} • ${m.action_items ? m.action_items.length : 0} action items</div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading meetings:', e);
    }
  }

  window.viewPastMeeting = function (id) {
    const meeting = appState.meetings.find(m => m.id === id);
    if (meeting) {
      displayMeetingResults(meeting);
      showToast(`Loaded: ${meeting.title}`, 'info');
      // Scroll up to results
      document.getElementById('meeting-results-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ============================================================
  // MODULE 3: CAMPUS ASSISTANT
  // ============================================================
  async function loadTimetable(day = '') {
    try {
      const url = day ? `/api/campus/timetable?day=${encodeURIComponent(day)}` : '/api/campus/timetable';
      const res = await fetch(url);
      const data = await res.json();
      appState.timetable = data.classes || [];
      renderTimetableTable(appState.timetable);
    } catch (e) {
      console.error('Error loading timetable:', e);
    }
  }

  function renderTimetableTable(classes) {
    const tbody = document.getElementById('timetable-table-body');
    if (!tbody) return;

    if (!classes.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-dim); padding: 2rem;">No classes found for this query.</td></tr>`;
      return;
    }

    tbody.innerHTML = classes.map(c => `
      <tr>
        <td style="font-weight: 700; color: var(--accent-purple);">${c.day_of_week}</td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-muted);">${c.start_time} - ${c.end_time}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(c.course_name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${c.course_code}</div>
        </td>
        <td style="color: var(--text-main);">${escapeHtml(c.professor)}</td>
        <td><span class="badge badge-neutral"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(c.location)}</span></td>
      </tr>
    `).join('');
  }

  async function loadEvents(keyword = '') {
    try {
      const url = keyword ? `/api/campus/events?keyword=${encodeURIComponent(keyword)}` : '/api/campus/events';
      const res = await fetch(url);
      const data = await res.json();
      appState.events = data.events || [];
      renderEventsGrid(appState.events);
    } catch (e) {
      console.error('Error loading events:', e);
    }
  }

  function renderEventsGrid(events) {
    const grid = document.getElementById('events-card-grid');
    if (!grid) return;

    if (!events.length) {
      grid.innerHTML = `<p class="placeholder-text" style="grid-column: 1/-1; padding: 2rem; text-align: center;">No campus events found matching your search.</p>`;
      return;
    }

    grid.innerHTML = events.map(e => `
      <div class="event-card">
        <div>
          <span class="event-category-badge">${escapeHtml(e.category)}</span>
          <h4 class="event-title">${escapeHtml(e.title)}</h4>
          <p class="event-desc">${escapeHtml(e.description)}</p>
        </div>
        <div class="event-footer">
          <span><i class="fa-regular fa-calendar"></i> ${e.date} (${e.time})</span>
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(e.location)}</span>
        </div>
      </div>
    `).join('');
  }

  async function loadLibrary(query = '') {
    try {
      const url = query ? `/api/campus/library?query=${encodeURIComponent(query)}` : '/api/campus/library';
      const res = await fetch(url);
      const data = await res.json();
      appState.library = data.books || [];
      renderLibraryTable(appState.library);
    } catch (e) {
      console.error('Error loading library:', e);
    }
  }

  function renderLibraryTable(books) {
    const tbody = document.getElementById('library-table-body');
    if (!tbody) return;

    if (!books.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-dim); padding: 2rem;">No library books found in the directory.</td></tr>`;
      return;
    }

    tbody.innerHTML = books.map(b => {
      const isAvail = b.available === 1;
      return `
        <tr>
          <td style="font-weight: 600; color: #fff;">${escapeHtml(b.title)}</td>
          <td style="color: var(--text-muted);">${escapeHtml(b.author)}</td>
          <td><span class="badge badge-neutral">${escapeHtml(b.category)}</span></td>
          <td><code style="font-family: var(--font-mono); color: var(--accent-cyan);">${escapeHtml(b.rack)}</code></td>
          <td>
            ${isAvail 
              ? `<span class="badge-available"><i class="fa-solid fa-circle-check"></i> Available (${b.copies} copies)</span>` 
              : `<span class="badge-unavailable"><i class="fa-solid fa-circle-xmark"></i> Checked Out</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  function initCampusFilters() {
    // Day filter pills
    const dayPills = document.querySelectorAll('.filter-pill');
    dayPills.forEach(pill => {
      pill.addEventListener('click', () => {
        dayPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const day = pill.getAttribute('data-day');
        loadTimetable(day);
      });
    });

    // Events search input
    const eventsSearch = document.getElementById('events-search-input');
    if (eventsSearch) {
      eventsSearch.addEventListener('input', debounce((e) => {
        loadEvents(e.target.value);
      }, 300));
    }

    // Library search input
    const librarySearch = document.getElementById('library-search-input');
    if (librarySearch) {
      librarySearch.addEventListener('input', debounce((e) => {
        loadLibrary(e.target.value);
      }, 300));
    }
  }

  // ============================================================
  // ACTIVITY LOG
  // ============================================================
  function addActivityItem(item) {
    appState.activityLog.unshift(item);
    if (appState.activityLog.length > 20) appState.activityLog.pop();
    renderActivityFeed();
    try {
      sessionStorage.setItem('univoice_activity', JSON.stringify(appState.activityLog));
    } catch (e) {}
  }

  function renderActivityFeed() {
    const feed = document.getElementById('activity-log-list');
    if (!feed) return;

    if (!appState.activityLog.length) {
      feed.innerHTML = `
        <div class="activity-empty">
          <i class="fa-solid fa-ghost"></i>
          <p>No voice actions recorded yet. Speak or type a command to start!</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = appState.activityLog.map(item => `
      <div class="activity-item">
        <div class="activity-top">
          <span class="activity-intent-tag badge-primary">${escapeHtml(item.intent || 'COMMAND')}</span>
          <span class="activity-time">${item.time}</span>
        </div>
        <div class="activity-command">"${escapeHtml(item.command)}"</div>
        <div class="activity-response">${escapeHtml(item.response)}</div>
      </div>
    `).join('');
  }

  function loadCachedActivity() {
    try {
      const cached = sessionStorage.getItem('univoice_activity');
      if (cached) {
        appState.activityLog = JSON.parse(cached);
        renderActivityFeed();
      }
    } catch (e) {}

    const clearBtn = document.getElementById('clear-activity-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        appState.activityLog = [];
        sessionStorage.removeItem('univoice_activity');
        renderActivityFeed();
      });
    }
  }

  // ============================================================
  // MODALS (MANUAL ADD EXPENSE & TASK)
  // ============================================================
  function initModals() {
    // Open modal buttons
    const openExpenseBtn = document.getElementById('quick-add-expense-modal-btn');
    const openTaskBtn = document.getElementById('quick-add-task-modal-btn');
    const expenseModal = document.getElementById('expense-modal');
    const taskModal = document.getElementById('task-modal');

    if (openExpenseBtn && expenseModal) {
      openExpenseBtn.addEventListener('click', () => expenseModal.classList.remove('hidden'));
    }

    if (openTaskBtn && taskModal) {
      openTaskBtn.addEventListener('click', () => taskModal.classList.remove('hidden'));
    }

    // Close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
      });
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });

    // Handle Manual Expense Submit
    const expForm = document.getElementById('manual-expense-form');
    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('exp-desc').value.trim();
        const amt = parseFloat(document.getElementById('exp-amount').value);
        const cat = document.getElementById('exp-cat').value;

        if (!desc || isNaN(amt) || amt <= 0) {
          showToast('Please provide a valid description and positive amount.', 'error');
          return;
        }

        try {
          const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc, amount: amt, category: cat })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Expense added successfully!', 'success');
            expenseModal.classList.add('hidden');
            expForm.reset();
            loadExpenses();
            loadSystemStatus();
          }
        } catch (err) {
          showToast('Failed to save expense.', 'error');
        }
      });
    }

    // Handle Manual Task Submit
    const taskForm = document.getElementById('manual-task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('task-desc').value.trim();
        const due = document.getElementById('task-due').value.trim() || 'Today';
        const priority = document.getElementById('task-priority').value;

        if (!desc) {
          showToast('Please provide a task description.', 'error');
          return;
        }

        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: desc, due_date: due, priority: priority })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Task reminder created!', 'success');
            taskModal.classList.add('hidden');
            taskForm.reset();
            loadTasks();
            loadSystemStatus();
          }
        } catch (err) {
          showToast('Failed to save task.', 'error');
        }
      });
    }
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  window.showToast = showToast;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

})();

