/**
 * HerHealth AI — Wellness, Breathing & Web Audio Synthesizer Controller
 */

let breathingInterval = null;
let breathingPhase = 'idle'; // 'inhale', 'hold', 'exhale', 'idle', 'paused'
let breathingSecondsLeft = 0;
let completedBreathingCycles = 0;

// Web Audio API Context for synthesizer & soundscapes
let audioCtx = null;
let activeSoundscapeNode = null;
let activeSoundscapeTrackId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupBreathingEngine();
  await loadWellnessActivities();
  await loadWellnessHistory();
});

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Gentle pleasant soft chime on phase transitions
function playSoftChime(freq = 432) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (e) {
    // Audio context may require initial user click
  }
}

// ==========================================
// 1. Animated Breathing Engine (4-7-8)
// ==========================================
function setupBreathingEngine() {
  const startBtn = document.getElementById('start-breath-btn');
  const pauseBtn = document.getElementById('pause-breath-btn');
  const stopBtn = document.getElementById('stop-breath-btn');
  const logBtn = document.getElementById('log-breath-completed-btn');
  const orb = document.getElementById('breathing-orb');
  const phaseLabel = document.getElementById('breathing-phase-label');
  const counterEl = document.getElementById('breathing-counter');
  const cycleCountEl = document.getElementById('breathing-cycles-completed');

  startBtn?.addEventListener('click', () => {
    getAudioContext();
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'inline-flex';
    logBtn.style.display = 'inline-flex';
    startInhale();
  });

  pauseBtn?.addEventListener('click', () => {
    if (breathingPhase === 'paused') {
      // Resume
      pauseBtn.textContent = '⏸ Pause';
      resumePhase();
    } else {
      // Pause
      clearInterval(breathingInterval);
      breathingPhase = 'paused';
      pauseBtn.textContent = '▶ Resume';
      phaseLabel.textContent = 'Paused';
    }
  });

  stopBtn?.addEventListener('click', () => {
    resetBreathing();
  });

  logBtn?.addEventListener('click', async () => {
    try {
      await apiFetch('/api/wellness/activities', {
        method: 'POST',
        body: {
          activityType: 'breathing',
          activityName: '4-7-8 Calming Breathwork',
          duration: 5,
          notes: `Completed ${completedBreathingCycles} guided breathing cycles.`
        }
      });

      // Sync to Cloud Firestore
      if (window.HerHealthFirebaseService) {
        window.HerHealthFirebaseService.firestoreSaveWellness({
          activityType: 'breathing',
          activityName: '4-7-8 Calming Breathwork',
          duration: 5,
          notes: `Completed ${completedBreathingCycles} guided breathing cycles.`
        });
      }

      showToast('Breathing session recorded in your history! 🌸', 'success');
      await loadWellnessHistory();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  function startInhale() {
    breathingPhase = 'inhale';
    breathingSecondsLeft = 4;
    phaseLabel.textContent = 'Inhale';
    counterEl.textContent = breathingSecondsLeft;
    orb.style.transform = 'scale(1.4)';
    orb.style.background = 'linear-gradient(135deg, var(--primary-500), var(--primary-400))';
    playSoftChime(432);

    breathingInterval = setInterval(() => {
      breathingSecondsLeft--;
      counterEl.textContent = breathingSecondsLeft;
      if (breathingSecondsLeft <= 0) {
        clearInterval(breathingInterval);
        startHold();
      }
    }, 1000);
  }

  function startHold() {
    breathingPhase = 'hold';
    breathingSecondsLeft = 7;
    phaseLabel.textContent = 'Hold';
    counterEl.textContent = breathingSecondsLeft;
    orb.style.transform = 'scale(1.4)';
    orb.style.background = 'linear-gradient(135deg, var(--primary-600), #8e24aa)';
    playSoftChime(528);

    breathingInterval = setInterval(() => {
      breathingSecondsLeft--;
      counterEl.textContent = breathingSecondsLeft;
      if (breathingSecondsLeft <= 0) {
        clearInterval(breathingInterval);
        startExhale();
      }
    }, 1000);
  }

  function startExhale() {
    breathingPhase = 'exhale';
    breathingSecondsLeft = 8;
    phaseLabel.textContent = 'Exhale';
    counterEl.textContent = breathingSecondsLeft;
    orb.style.transform = 'scale(0.95)';
    orb.style.background = 'linear-gradient(135deg, var(--blush-500), var(--blush-400))';
    playSoftChime(396);

    breathingInterval = setInterval(() => {
      breathingSecondsLeft--;
      counterEl.textContent = breathingSecondsLeft;
      if (breathingSecondsLeft <= 0) {
        clearInterval(breathingInterval);
        completedBreathingCycles++;
        cycleCountEl.textContent = `Cycles completed this session: ${completedBreathingCycles}`;
        startInhale();
      }
    }, 1000);
  }

  function resumePhase() {
    // continue remaining seconds of current phase
    if (breathingSecondsLeft <= 0) {
      startInhale();
      return;
    }
    phaseLabel.textContent = breathingPhase.toUpperCase();
    breathingInterval = setInterval(() => {
      breathingSecondsLeft--;
      counterEl.textContent = breathingSecondsLeft;
      if (breathingSecondsLeft <= 0) {
        clearInterval(breathingInterval);
        if (breathingPhase === 'inhale') startHold();
        else if (breathingPhase === 'hold') startExhale();
        else startInhale();
      }
    }, 1000);
  }

  function resetBreathing() {
    clearInterval(breathingInterval);
    breathingPhase = 'idle';
    breathingSecondsLeft = 0;
    startBtn.style.display = 'inline-flex';
    pauseBtn.style.display = 'none';
    pauseBtn.textContent = '⏸ Pause';
    stopBtn.style.display = 'none';
    orb.style.transform = 'scale(1)';
    orb.style.background = 'linear-gradient(135deg, var(--primary-400), var(--blush-400))';
    phaseLabel.textContent = 'Ready';
    counterEl.textContent = '0';
  }
}

// ==========================================
// 2. Soundscape Synthesizer
// ==========================================
function toggleSoundscape(trackId, title) {
  const ctx = getAudioContext();

  // If already playing this track, stop it
  if (activeSoundscapeTrackId === trackId) {
    stopSoundscape();
    return;
  }

  // Stop any currently playing track
  stopSoundscape();

  activeSoundscapeTrackId = trackId;

  // Synthesize relaxing soundscape based on track
  let node;
  if (trackId === 'track-calm-theta') {
    // 432Hz deep resonant harmonic frequency with gentle tremolo
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, ctx.currentTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.2, ctx.currentTime); // 0.2Hz slow soothing pulse
    lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);

    masterGain.gain.setValueAtTime(0.06, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    osc.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start();
    lfo.start();

    node = {
      stop: () => {
        try {
          osc.stop();
          lfo.stop();
        } catch (e) {}
      }
    };
  } else {
    // White/Pink filtered noise simulating gentle rain or ocean waves
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise filter
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();

    node = {
      stop: () => {
        try { whiteNoise.stop(); } catch (e) {}
      }
    };
  }

  activeSoundscapeNode = node;
  showToast(`Now playing: ${title} 🎧`, 'info');
  updateSoundscapeCardStates();
}

function stopSoundscape() {
  if (activeSoundscapeNode) {
    try {
      activeSoundscapeNode.stop();
    } catch (e) {}
    activeSoundscapeNode = null;
  }
  activeSoundscapeTrackId = null;
  updateSoundscapeCardStates();
}

function updateSoundscapeCardStates() {
  document.querySelectorAll('.sound-track-card').forEach(card => {
    const id = card.getAttribute('data-track-id');
    const playBtn = card.querySelector('.sound-toggle-btn');
    if (id === activeSoundscapeTrackId) {
      card.classList.add('playing');
      if (playBtn) playBtn.innerHTML = '⏸ Stop Sound';
    } else {
      card.classList.remove('playing');
      if (playBtn) playBtn.innerHTML = '▶ Play Track';
    }
  });
}

// ==========================================
// 3. Load Guided Activities Catalog & History
// ==========================================
async function loadWellnessActivities() {
  try {
    const data = await apiFetch('/api/wellness/activities');

    // Render Soundscapes
    const soundscapesContainer = document.getElementById('soundscapes-container');
    if (soundscapesContainer && data.soundscapes) {
      soundscapesContainer.innerHTML = '';
      data.soundscapes.forEach(t => {
        const card = document.createElement('div');
        card.className = 'sound-track-card';
        card.setAttribute('data-track-id', t.id);
        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <span style="font-size:1.6rem;">🎧</span>
              <span class="badge badge-lavender">${t.mood}</span>
            </div>
            <h3 style="font-size:1.1rem; margin-bottom:4px;">${escapeHtml(t.title)}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${escapeHtml(t.description)}</p>
            <div style="font-size:0.75rem; color:var(--text-light); margin-bottom:16px;">
              Format: ${escapeHtml(t.audioFreq)}
            </div>
          </div>
          <button class="btn btn-secondary btn-sm sound-toggle-btn" style="width:100%;">▶ Play Track</button>
        `;

        card.querySelector('.sound-toggle-btn').addEventListener('click', () => {
          toggleSoundscape(t.id, t.title);
        });

        soundscapesContainer.appendChild(card);
      });
    }

    // Render Yoga Poses
    const yogaContainer = document.getElementById('yoga-poses-container');
    if (yogaContainer && data.activities) {
      yogaContainer.innerHTML = '';
      data.activities.forEach(act => {
        const card = document.createElement('div');
        card.className = 'yoga-pose-card';

        const instructionsHtml = act.instructions
          .map(step => `<li>${escapeHtml(step)}</li>`)
          .join('');

        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <span style="font-size:2rem;">🧘</span>
              <span class="badge badge-lavender">${act.difficulty}</span>
            </div>
            <h3 style="font-size:1.15rem; margin-bottom:4px;">${escapeHtml(act.name)}</h3>
            <div style="font-size:0.8rem; color:var(--primary-600); font-weight:700; margin-bottom:10px;">
              Target: ${escapeHtml(act.target)}
            </div>
            <div style="font-size:0.82rem; font-weight:700; color:var(--text-main);">Step-by-step guidance:</div>
            <ol class="pose-instructions-list">
              ${instructionsHtml}
            </ol>
            <div style="padding:10px; background:#fff8e1; border-radius:var(--radius-sm); font-size:0.75rem; color:#f57f17; margin-bottom:18px;">
              <strong>⚠️ Caution:</strong> ${escapeHtml(act.safetyNote)}
            </div>
          </div>
          <button class="btn btn-primary btn-sm mark-pose-complete-btn" style="width:100%;">
            ✓ Mark ${act.durationMinutes} Min Completed
          </button>
        `;

        card.querySelector('.mark-pose-complete-btn').addEventListener('click', async () => {
          try {
            await apiFetch('/api/wellness/activities', {
              method: 'POST',
              body: {
                activityType: act.type,
                activityName: act.name,
                duration: act.durationMinutes,
                notes: 'Completed guided routine.'
              }
            });
            showToast(`Logged: ${act.name}! Wonderful care for your body 🌸`, 'success');
            await loadWellnessHistory();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });

        yogaContainer.appendChild(card);
      });
    }
  } catch (err) {
    showToast('Failed to load wellness catalog: ' + err.message, 'error');
  }
}

async function loadWellnessHistory() {
  try {
    const data = await apiFetch('/api/wellness/history');
    const container = document.getElementById('wellness-history-list');
    const badge = document.getElementById('total-wellness-minutes');
    if (!container) return;

    badge.textContent = `${data.totalMinutes || 0} Minutes Logged`;

    if (!data.history || data.history.length === 0) return;

    container.innerHTML = '';
    data.history.forEach(item => {
      const dStr = new Date(item.completedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const row = document.createElement('div');
      row.className = 'history-list-item';
      row.innerHTML = `
        <div class="history-item-left">
          <span style="font-size:1.3rem;">${item.activityType === 'breathing' ? '🫁' : item.activityType === 'yoga' ? '🧘' : '🎧'}</span>
          <div>
            <div class="history-item-date">${escapeHtml(item.activityName)}</div>
            <div class="history-item-meta">${dStr} • ${item.duration} minutes ${item.notes ? `• ${escapeHtml(item.notes)}` : ''}</div>
          </div>
        </div>
        <span class="badge badge-low">Completed</span>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading wellness history:', err);
  }
}
