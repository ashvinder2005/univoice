/**
 * speech.js - Web Speech API & SpeechSynthesis Voice Engine for UniVoice
 * Handles microphone capture, real-time speech-to-text, and browser voice synthesis.
 */

(function (window) {
  'use strict';

  // State
  let recognition = null;
  let isListening = false;
  let isTtsMuted = localStorage.getItem('univoice_tts_muted') === 'true';
  let speechCallback = null;

  // DOM Elements
  const micBtn = document.getElementById('main-mic-btn');
  const micIcon = document.getElementById('mic-icon');
  const micHalo = document.getElementById('mic-halo');
  const micLabel = document.getElementById('mic-status-label');
  const waveBars = document.getElementById('audio-wave-bars');
  const speechOutput = document.getElementById('recognized-speech-text');
  const interimTag = document.getElementById('speech-interim-tag');
  const ttsToggleBtn = document.getElementById('tts-toggle-btn');
  const ttsIcon = document.getElementById('tts-icon');

  // ============================================================
  // 1. SPEECH RECOGNITION (STT)
  // ============================================================

  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[UniVoice] Web Speech API not supported in this browser.');
      if (micLabel) {
        micLabel.textContent = 'Voice input not supported in this browser. Use text input below.';
      }
      return false;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false; // Capture one command per click
      recognition.interimResults = true; // Show live interim transcript
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        setMicUI(true);
        if (micLabel) micLabel.textContent = 'Listening... Speak your command';
        if (interimTag) interimTag.classList.remove('hidden');
        if (speechOutput) {
          speechOutput.textContent = 'Listening to your voice...';
          speechOutput.classList.add('interim');
        }
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }

        if (speechOutput) {
          speechOutput.textContent = `"${finalTranscript || interimTranscript}"`;
        }

        if (finalTranscript) {
          if (interimTag) interimTag.classList.add('hidden');
          stopListening();
          // Dispatch final recognized command
          if (typeof speechCallback === 'function') {
            speechCallback(finalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('[UniVoice Speech Error]:', event.error);
        isListening = false;
        setMicUI(false);
        if (interimTag) interimTag.classList.add('hidden');

        if (event.error === 'not-allowed') {
          if (micLabel) micLabel.textContent = 'Microphone permission blocked. Please allow mic access.';
          window.showToast('Microphone access denied. Please allow microphone permissions in browser settings.', 'error');
        } else if (event.error === 'no-speech') {
          if (micLabel) micLabel.textContent = 'No voice detected. Tap to try again.';
        } else {
          if (micLabel) micLabel.textContent = `Speech error: ${event.error}`;
        }
      };

      recognition.onend = () => {
        isListening = false;
        setMicUI(false);
        if (interimTag) interimTag.classList.add('hidden');
        if (micLabel && micLabel.textContent === 'Listening... Speak your command') {
          micLabel.textContent = 'Tap microphone or type to speak';
        }
      };

      return true;
    } catch (e) {
      console.error('[UniVoice] Failed to create SpeechRecognition:', e);
      return false;
    }
  }

  function startListening() {
    if (!recognition) {
      const ok = initRecognition();
      if (!ok) {
        window.showToast('Speech Recognition not supported in this browser. Please use text input.', 'info');
        return;
      }
    }

    if (isListening) {
      stopListening();
      return;
    }

    // Stop ongoing speech synthesis before listening
    stopSpeaking();

    try {
      recognition.start();
    } catch (e) {
      console.warn('[UniVoice] Recognition start error:', e);
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    isListening = false;
    setMicUI(false);
  }

  function setMicUI(active) {
    if (!micBtn) return;
    if (active) {
      micBtn.classList.add('listening');
      if (waveBars) waveBars.classList.add('active');
      if (micHalo) micHalo.style.opacity = '0.9';
    } else {
      micBtn.classList.remove('listening');
      if (waveBars) waveBars.classList.remove('active');
      if (micHalo) micHalo.style.opacity = '0.4';
    }
  }

  // ============================================================
  // 2. SPEECH SYNTHESIS (VOICE RESPONSE / TTS)
  // ============================================================

  function speak(text) {
    if (isTtsMuted || !text) return;
    if (!('speechSynthesis' in window)) {
      console.warn('[UniVoice] SpeechSynthesis not supported.');
      return;
    }

    // Cancel current utterances
    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner pronunciation
    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/•/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly faster natural tempo
    utterance.pitch = 1.0;

    // Select natural preferred voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Jenny')) &&
      v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      if (micLabel && !isListening) {
        micLabel.textContent = 'UniVoice is speaking...';
      }
    };

    utterance.onend = () => {
      if (micLabel && !isListening) {
        micLabel.textContent = 'Tap microphone or type to speak';
      }
    };

    utterance.onerror = (e) => {
      console.warn('[UniVoice TTS Error]:', e);
      if (micLabel && !isListening) {
        micLabel.textContent = 'Tap microphone or type to speak';
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function toggleMute() {
    isTtsMuted = !isTtsMuted;
    localStorage.setItem('univoice_tts_muted', isTtsMuted);
    updateTtsUI();
    if (isTtsMuted) {
      stopSpeaking();
      window.showToast('Voice responses muted.', 'info');
    } else {
      window.showToast('Voice responses enabled.', 'success');
      speak('Voice responses are now active.');
    }
  }

  function updateTtsUI() {
    if (!ttsToggleBtn || !ttsIcon) return;
    if (isTtsMuted) {
      ttsToggleBtn.classList.add('muted');
      ttsIcon.className = 'fa-solid fa-volume-xmark';
      ttsToggleBtn.title = 'Assistant Voice is Muted (Click to Unmute)';
    } else {
      ttsToggleBtn.classList.remove('muted');
      ttsIcon.className = 'fa-solid fa-volume-high';
      ttsToggleBtn.title = 'Assistant Voice is Active (Click to Mute)';
    }
  }

  // Pre-load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Initialize Speech Engine
  function init(onSpeechRecognized) {
    speechCallback = onSpeechRecognized;
    initRecognition();
    updateTtsUI();

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      });
    }

    if (ttsToggleBtn) {
      ttsToggleBtn.addEventListener('click', toggleMute);
    }
  }

  // Export VoiceEngine API
  window.VoiceEngine = {
    init,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleMute,
    isListening: () => isListening,
    isMuted: () => isTtsMuted
  };

})(window);

