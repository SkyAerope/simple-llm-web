const STORAGE_KEY = "chat_history";

const messagesEl = document.getElementById("messages");
const chatFormEl = document.getElementById("chatForm");
const questionInputEl = document.getElementById("questionInput");
const sendBtnEl = document.getElementById("sendBtn");
const clearBtnEl = document.getElementById("clearBtn");

let history = loadHistory();

renderHistory();

chatFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = questionInputEl.value.trim();
  if (!message) {
    return;
  }

  appendMessage({ role: "user", content: message });
  history.push({ role: "user", content: message });
  persistHistory();

  questionInputEl.value = "";
  setLoading(true);

  const loadingNode = appendMessage({ role: "system", content: "模型思考中..." });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history: history.slice(0, -1) }),
    });

    const payload = await response.json();
    loadingNode.remove();

    if (!response.ok) {
      const detail = payload?.detail || "请求失败";
      appendMessage({ role: "system", content: `请求失败：${detail}` });
      return;
    }

    const answer = payload.reply || "(empty)";
    appendMessage({ role: "assistant", content: answer });
    history.push({ role: "assistant", content: answer });
    persistHistory();
  } catch (error) {
    loadingNode.remove();
    appendMessage({ role: "system", content: `网络异常：${error}` });
  } finally {
    setLoading(false);
    questionInputEl.focus();
  }
});

clearBtnEl.addEventListener("click", () => {
  history = [];
  persistHistory();
  messagesEl.innerHTML = "";
  appendMessage({ role: "system", content: "历史已清空" });
});

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && item.role && item.content);
  } catch {
    return [];
  }
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderHistory() {
  messagesEl.innerHTML = "";
  if (!history.length) {
    appendMessage({ role: "system", content: "开始提问吧。" });
    return;
  }

  for (const item of history) {
    appendMessage(item);
  }
}

function appendMessage({ role, content }) {
  const node = document.createElement("article");
  node.className = `message ${role}`;
  node.textContent = content;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

function setLoading(isLoading) {
  sendBtnEl.disabled = isLoading;
  questionInputEl.disabled = isLoading;
}
