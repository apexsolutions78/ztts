var chatBody = document.getElementById('chatBody');
var chatInput = document.getElementById('chatInput');
var sendBtn = document.getElementById('sendBtn');
var btnLabel = document.getElementById('btnLabel');
var btnSpinner = document.getElementById('btnSpinner');
var typingDots = document.getElementById('typingDots');
var quickBar = document.getElementById('quickBar');
var msgHistory = [];
var busy = false;

chatInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); }
});
chatInput.focus();

function addBubble(text, who, meta) {
  var d = document.createElement('div');
  d.className = 'bubble bubble-' + who;
  var safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  safe = safe.replace(/\n/g, '<br>');
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  if (meta) safe += '<div class="bubble-meta">' + meta + '</div>';
  d.innerHTML = safe;
  chatBody.appendChild(d);
  chatBody.scrollTop = chatBody.scrollHeight;
  return d;
}

function setLoading(on) {
  busy = on;
  sendBtn.disabled = on;
  if (on) {
    btnLabel.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    typingDots.style.display = 'block';
    chatBody.scrollTop = chatBody.scrollHeight;
  } else {
    btnLabel.style.display = '';
    btnSpinner.style.display = 'none';
    typingDots.style.display = 'none';
  }
}

function go(text) {
  if (busy) return;
  var msg = text || chatInput.value.trim();
  if (!msg) return;

  quickBar.style.display = 'none';
  addBubble(msg, 'user');
  msgHistory.push({ role: 'user', content: msg });
  chatInput.value = '';
  setLoading(true);

  fetch('/admin/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, history: msgHistory })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    setLoading(false);
    if (data.success) {
      addBubble(data.response, 'bot', 'Intent: ' + data.intent + ' | Model: ' + data.provider);
      msgHistory.push({ role: 'assistant', content: data.response });
    } else {
      addBubble('Sorry, something went wrong. ' + (data.error || ''), 'bot');
    }
    chatInput.focus();
  })
  .catch(function(err) {
    setLoading(false);
    addBubble('Network error. Please check your connection and try again.', 'bot');
    console.error('Chat error:', err);
    chatInput.focus();
  });
}
