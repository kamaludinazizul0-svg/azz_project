(function() {
  // Styles for the AI Widget
  const style = document.createElement('style');
  style.innerHTML = `
    .ai-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Outfit', sans-serif;
    }
    .ai-widget-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--primary, #2e7d32);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
    }
    .ai-widget-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }
    .ai-widget-btn.open {
      background: #e53935;
      transform: rotate(90deg);
    }
    .ai-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transform: scale(0);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    .ai-chat-window.open {
      transform: scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    .ai-chat-header {
      background: var(--primary, #2e7d32);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-chat-header-icon {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .ai-chat-header-title {
      font-weight: 600;
      font-size: 16px;
      margin: 0;
    }
    .ai-chat-header-subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin: 0;
    }
    .ai-chat-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f9f9f9;
    }
    .ai-chat-msg {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
      animation: fadeIn 0.3s ease-out forwards;
    }
    .ai-chat-msg.bot {
      background: white;
      color: #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }
    .ai-chat-msg.user {
      background: var(--primary, #2e7d32);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 5px rgba(46,125,50,0.2);
    }
    .ai-chat-input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    .ai-chat-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 24px;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    .ai-chat-input:focus {
      border-color: var(--primary, #2e7d32);
    }
    .ai-chat-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary, #2e7d32);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }
    .ai-chat-send:hover {
      opacity: 0.9;
    }
    .ai-chat-send:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      align-items: center;
      height: 24px;
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      background: #aaa;
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 480px) {
      .ai-chat-window {
        width: calc(100vw - 40px);
        right: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Widget Container
  const container = document.createElement('div');
  container.className = 'ai-widget-container';

  // Toggle Button
  const btn = document.createElement('button');
  btn.className = 'ai-widget-btn';
  btn.innerHTML = '🤖';
  container.appendChild(btn);

  // Chat Window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'ai-chat-window';
  
  // Header
  const header = document.createElement('div');
  header.className = 'ai-chat-header';
  header.innerHTML = `
    <div class="ai-chat-header-icon">🤖</div>
    <div>
      <h3 class="ai-chat-header-title">Asisten Desa Kauman</h3>
      <p class="ai-chat-header-subtitle">Tanya saya seputar desa!</p>
    </div>
  `;
  chatWindow.appendChild(header);

  // Messages Area
  const messagesArea = document.createElement('div');
  messagesArea.className = 'ai-chat-messages';
  chatWindow.appendChild(messagesArea);

  // Input Area
  const inputContainer = document.createElement('div');
  inputContainer.className = 'ai-chat-input-container';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ai-chat-input';
  input.placeholder = 'Ketik pertanyaan...';
  
  const sendBtn = document.createElement('button');
  sendBtn.className = 'ai-chat-send';
  sendBtn.innerHTML = '➤';
  
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendBtn);
  chatWindow.appendChild(inputContainer);

  container.appendChild(chatWindow);
  document.body.appendChild(container);

  // State
  let isOpen = false;

  // Toggle Logic
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('open');
      btn.classList.add('open');
      btn.innerHTML = '✖';
      if (messagesArea.children.length === 0) {
        addMessage('bot', 'Halo! Saya asisten virtual Desa Kauman. Ada yang bisa saya bantu terkait info desa, layanan, atau kependudukan?');
      }
      setTimeout(() => input.focus(), 300);
    } else {
      chatWindow.classList.remove('open');
      btn.classList.remove('open');
      btn.innerHTML = '🤖';
    }
  });

  function addMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-chat-msg ${sender}`;
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function showTyping() {
    const indicator = document.createElement('div');
    indicator.className = 'ai-chat-msg bot typing-indicator';
    indicator.id = 'aiTyping';
    indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    messagesArea.appendChild(indicator);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function hideTyping() {
    const indicator = document.getElementById('aiTyping');
    if (indicator) indicator.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    sendBtn.disabled = true;
    input.disabled = true;
    
    showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      
      hideTyping();
      
      if (response.ok) {
        const data = await response.json();
        addMessage('bot', data.reply || "Maaf, tidak ada respon.");
      } else {
        addMessage('bot', "Maaf, terjadi kesalahan koneksi.");
      }
    } catch (err) {
      hideTyping();
      addMessage('bot', "Maaf, gagal terhubung ke server.");
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
})();
