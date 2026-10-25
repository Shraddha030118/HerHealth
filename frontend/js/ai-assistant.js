/**
 * HerHealth AI — AI Assistant Frontend Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupChatEngine();
  await checkAIHealth();
  await loadChatHistory();
});

async function checkAIHealth() {
  try {
    const health = await apiFetch('/api/health');
    const badge = document.getElementById('ai-mode-badge');
    if (badge && health.aiProvider === 'active-external-llm') {
      badge.innerHTML = '<span style="color:#00c853;">●</span> Live AI Connected';
      badge.style.background = '#e8f5e9';
      badge.style.color = '#2e7d32';
    }
  } catch (e) {
    // defaults to demo mode
  }
}

async function loadChatHistory() {
  try {
    const data = await apiFetch('/api/ai/conversations');
    const container = document.getElementById('chat-messages-container');
    if (!container || !data.messages || data.messages.length === 0) return;

    // Clear initial greeting if user has real saved messages
    container.innerHTML = '';

    data.messages.forEach(msg => {
      appendMessageBubble(msg.sender, msg.text, msg.timestamp);
    });

    scrollToBottom();
  } catch (err) {
    console.warn('Could not restore chat history:', err);
  }
}

function setupChatEngine() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const clearBtn = document.getElementById('clear-chat-btn');
  const pills = document.querySelectorAll('.suggestion-pill');
  const saveConsentCheckbox = document.getElementById('save-history-toggle');

  // Submit handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    appendMessageBubble('user', query);
    scrollToBottom();

    // Show typing indicator
    const typingId = showTypingIndicator();
    scrollToBottom();

    try {
      const consent = saveConsentCheckbox ? saveConsentCheckbox.checked : true;
      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: { message: query, consentToStoreHistory: consent }
      });

      removeTypingIndicator(typingId);
      appendMessageBubble('assistant', data.reply);
      scrollToBottom();
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessageBubble('assistant', `⚠️ Sorry, I could not complete your request: ${err.message}`);
      scrollToBottom();
    }
  });

  // Suggestion Pills
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const q = pill.getAttribute('data-question');
      if (q && input) {
        input.value = q;
        form.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Clear Chat History
  clearBtn?.addEventListener('click', async () => {
    const confirmed = await confirmAction({
      title: 'Clear Chat History',
      message: 'Are you sure you want to delete all saved conversations? This cannot be undone.',
      confirmText: 'Clear Chat',
      isDanger: true
    });

    if (confirmed) {
      try {
        await apiFetch('/api/ai/conversations', { method: 'DELETE' });
        const container = document.getElementById('chat-messages-container');
        container.innerHTML = `
          <div class="chat-bubble chat-bubble-assistant">
            Conversation cleared. How can I assist your menstrual health today? 🌸
            <div class="chat-timestamp">Now</div>
          </div>
        `;
        showToast('Chat history cleared.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}

function appendMessageBubble(sender, text, timestamp = null) {
  const container = document.getElementById('chat-messages-container');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble-${sender}`;

  const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

  // Format basic markdown (bold, lists, headings)
  let formatted = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/• (.*?)(?:\n|$)/g, '<li>$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');

  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*?<\/li>)/g, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
  }

  bubble.innerHTML = `
    <div>${formatted}</div>
    <div class="chat-timestamp">${timeStr}</div>
  `;

  container.appendChild(bubble);
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages-container');
  const id = 'typing-' + Date.now();
  const indicator = document.createElement('div');
  indicator.id = id;
  indicator.className = 'typing-indicator';
  indicator.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  container.appendChild(indicator);
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}
