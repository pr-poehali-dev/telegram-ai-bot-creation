import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "ai-chat-conversations";

function generateSmartResponse(userText: string): string {
  const text = userText.toLowerCase();

  if (/привет|здравствуй|добрый|хай|hi\b|hello/.test(text)) {
    return "👋 Привет! Рад вас видеть. Чем могу помочь сегодня?";
  }
  if (/как дела|как ты|как у тебя|как поживаешь/.test(text)) {
    return "😊 Отлично, спасибо что спросили! Готов помогать на полную. А у вас как дела?";
  }
  if (/что ты умеешь|что можешь|твои возможности|чем помогаешь|кто ты/.test(text)) {
    return "🚀 Я умею многое! Вот что могу:\n\n• ✍️ Писать и редактировать тексты\n• 💡 Объяснять сложные темы простым языком\n• 🧮 Считать и решать задачи\n• 💻 Помогать с кодом\n• 🎯 Давать советы и рекомендации\n• 🌍 Переводить тексты\n\nПросто напишите ваш вопрос!";
  }
  if (/напиши|составь|помоги написать|создай текст|сочини/.test(text)) {
    const topic = userText.replace(/напиши|составь|помоги написать|создай текст|сочини/gi, "").trim();
    return `✍️ Конечно! Вот набросок на тему «${topic || "вашу"}»:\n\nЭто важная и интересная тема. Главное — чётко обозначить цель, выстроить логику изложения и говорить с читателем на одном языке. Хотите, чтобы я раскрыл тему подробнее или изменил стиль?`;
  }
  if (/переведи|перевод|translate|на английский|на русский|на немецкий|на французский/.test(text)) {
    return "🌍 Пришлите текст для перевода — переведу быстро и точно!";
  }
  if (/код|программ|функци|скрипт|python|javascript|typescript|html|css/.test(text)) {
    return "💻 С удовольствием помогу с кодом! Опишите задачу подробнее: что нужно сделать и на каком языке?";
  }
  if (/объясни|что такое|расскажи про|как работает|в чём разница/.test(text)) {
    const topic = userText.replace(/объясни|что такое|расскажи про|как работает|в чём разница/gi, "").trim();
    return `🧠 Хороший вопрос про «${topic || "это"}»!\n\nПростыми словами: в основе лежит понятный принцип — разбить сложное на части и рассмотреть каждую отдельно. Так становится намного понятнее. Хотите подробное объяснение с примерами?`;
  }
  if (/совет|рекоменд|что лучше|как поступить|подскажи|помоги выбрать/.test(text)) {
    return "🎯 Чтобы дать точный совет, расскажите немного подробнее о ситуации — и я предложу конкретные шаги!";
  }
  if (/спасибо|благодарю|thanks|thank you|отлично|супер|классно/.test(text)) {
    return "😊 Пожалуйста! Всегда рад помочь. Если появятся ещё вопросы — пишите!";
  }
  if (/пока|до свидания|прощай|bye|до встречи/.test(text)) {
    return "👋 До свидания! Было приятно пообщаться. Возвращайтесь — всегда рад помочь!";
  }
  if (/\d+\s*[+\-*/]\s*\d+/.test(text)) {
    const expr = text.match(/[\d\s+\-*/.()?]+/)?.[0]?.trim();
    try {
      if (expr && /^[\d\s+\-*/.()]+$/.test(expr)) {
        const result = Function(`"use strict"; return (${expr})`)();
        return `🧮 Результат: ${expr.trim()} = **${result}**\n\nЕсли нужны другие вычисления — просто напишите!`;
      }
    } catch (e) {
      return "🧮 Не смог распознать выражение. Напишите, например: 25 * 4 + 100";
    }
  }
  if (/погода|температура|дождь|снег/.test(text)) {
    return "🌤️ Для актуальной погоды лучше заглянуть на weather.com или Яндекс.Погоду — там всегда свежие данные. Могу помочь с чем-то ещё?";
  }
  if (/время|дата|сегодня|сейчас/.test(text)) {
    const now = new Date();
    return `🕐 Сейчас ${now.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}, ${now.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}.`;
  }

  const short = userText.slice(0, 40) + (userText.length > 40 ? "…" : "");
  const fallbacks = [
    `💡 Понял! По теме «${short}» — это интересный вопрос. Ключевое здесь: разобраться в сути и действовать последовательно. Хотите разберём подробнее?`,
    `🎯 По поводу «${short}» — лучший подход: чётко обозначить цель и двигаться к ней шаг за шагом. С чего начнём?`,
    `🚀 «${short}» — хорошая тема! Здесь важно учесть контекст и выбрать подходящий метод. Рассказать подробнее?`,
    `🧠 Насчёт «${short}»: системный подход обычно даёт лучший результат. Хотите, разберём по шагам?`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("ru", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  return new Intl.DateTimeFormat("ru", { day: "numeric", month: "short" }).format(date);
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm flex-shrink-0">
        🤖
      </div>
      <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-400 animate-pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 animate-message-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-purple-700"
            : "bg-gradient-to-br from-violet-500 to-blue-500"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-tr-sm"
              : "glass text-foreground rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>
        <span className="text-xs text-muted-foreground px-1">{formatTime(new Date(message.timestamp))}</span>
      </div>
    </div>
  );
}

export default function Index() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      return JSON.parse(saved).map((c: Conversation) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })),
      }));
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isTyping]);

  const createConversation = useCallback(() => {
    const id = generateId();
    const conv: Conversation = {
      id,
      title: "Новый диалог",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const deleteConversation = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    let convId = activeId;
    let isNew = false;
    if (!convId) {
      convId = generateId();
      isNew = true;
    }
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    const title = input.trim().length > 40 ? input.trim().slice(0, 40) + "…" : input.trim();
    setConversations((prev) => {
      if (isNew) {
        return [
          { id: convId!, title, messages: [userMessage], createdAt: new Date(), updatedAt: new Date() },
          ...prev,
        ];
      }
      return prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: c.messages.length === 0 ? title : c.title,
              messages: [...c.messages, userMessage],
              updatedAt: new Date(),
            }
          : c
      );
    });
    if (isNew) setActiveId(convId);
    setInput("");
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    const aiMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: generateSmartResponse(input.trim()),
      timestamp: new Date(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, aiMessage], updatedAt: new Date() } : c
      )
    );
    setIsTyping(false);
  }, [input, isTyping, activeId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const exportTxt = useCallback((conv: Conversation) => {
    const lines = conv.messages.map(
      (m) => `[${formatTime(new Date(m.timestamp))}] ${m.role === "user" ? "Вы" : "ИИ"}: ${m.content}`
    );
    const text = `💬 Диалог: ${conv.title}\n📅 ${formatDate(new Date(conv.createdAt))}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${conv.title.slice(0, 20)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuId(null);
  }, []);

  const exportPdf = useCallback((conv: Conversation) => {
    const lines = conv.messages
      .map(
        (m) =>
          `<div style="margin-bottom:16px;display:flex;flex-direction:column;align-items:${m.role === "user" ? "flex-end" : "flex-start"}">
            <div style="background:${m.role === "user" ? "#7c3aed" : "#1e1b4b"};color:white;padding:12px 16px;border-radius:16px;max-width:70%;font-size:14px;line-height:1.6">
              <strong>${m.role === "user" ? "👤 Вы" : "🤖 ИИ"}</strong><br/>${m.content}
            </div>
            <span style="font-size:11px;color:#888;margin-top:4px">${formatTime(new Date(m.timestamp))}</span>
          </div>`
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${conv.title}</title>
    <style>body{font-family:sans-serif;background:#0f0f1a;color:white;padding:32px;max-width:700px;margin:0 auto}</style>
    </head><body>
    <h2 style="color:#a78bfa;margin-bottom:4px">💬 ${conv.title}</h2>
    <p style="color:#888;margin-bottom:24px">📅 ${formatDate(new Date(conv.createdAt))}</p>
    ${lines}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) win.addEventListener("load", () => win.print());
    setExportMenuId(null);
  }, []);

  return (
    <div className="flex h-screen bg-background bg-mesh font-golos overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="font-caveat text-xl font-semibold gradient-text">АИ Чат</span>
          </div>
          <button
            onClick={createConversation}
            className="w-8 h-8 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors"
            title="Новый диалог"
          >
            <Icon name="Plus" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <div className="text-3xl mb-2">💬</div>
              <p>Нет диалогов</p>
              <p className="text-xs mt-1">Начните новый чат</p>
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`group relative flex items-start gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                activeId === conv.id
                  ? "bg-primary/15 border border-primary/20"
                  : "hover:bg-sidebar-accent border border-transparent"
              }`}
            >
              <span className="text-base mt-0.5 flex-shrink-0">💬</span>
              <div className="flex-1 min-w-0 pr-12">
                <p className={`text-sm font-medium truncate ${activeId === conv.id ? "text-foreground" : "text-sidebar-foreground"}`}>
                  {conv.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(new Date(conv.updatedAt))} · {conv.messages.length} сообщ.
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExportMenuId(exportMenuId === conv.id ? null : conv.id); }}
                    className="w-6 h-6 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Экспорт"
                  >
                    <Icon name="Download" size={12} />
                  </button>
                  {exportMenuId === conv.id && (
                    <div className="absolute right-0 top-7 z-50 bg-popover border border-border rounded-xl shadow-xl p-1 min-w-[130px] animate-scale-in">
                      <button onClick={() => exportTxt(conv)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors">
                        📄 Текст (.txt)
                      </button>
                      <button onClick={() => exportPdf(conv)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors">
                        🖨️ PDF (печать)
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="w-6 h-6 rounded-md hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  title="Удалить"
                >
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>🗂️</span>
            <span>{conversations.length} диалогов сохранено</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <Icon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={18} />
          </button>
          <div className="flex-1 min-w-0">
            {activeConversation ? (
              <div>
                <h1 className="text-sm font-semibold truncate">{activeConversation.title}</h1>
                <p className="text-xs text-muted-foreground">{activeConversation.messages.length} сообщений</p>
              </div>
            ) : (
              <div>
                <h1 className="text-sm font-semibold gradient-text">✨ АИ Чат</h1>
                <p className="text-xs text-muted-foreground">Начните новый диалог</p>
              </div>
            )}
          </div>
          {activeConversation && activeConversation.messages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setExportMenuId(exportMenuId === "main" ? null : "main")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs transition-colors"
              >
                <Icon name="Download" size={13} />
                Сохранить
              </button>
              {exportMenuId === "main" && (
                <div className="absolute right-0 top-10 z-50 bg-popover border border-border rounded-xl shadow-xl p-1 min-w-[140px] animate-scale-in">
                  <button onClick={() => exportTxt(activeConversation)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors">
                    📄 Текст (.txt)
                  </button>
                  <button onClick={() => exportPdf(activeConversation)} className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors">
                    🖨️ PDF (печать)
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeConversation && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-semibold gradient-text mb-2">Привет! Я ваш ИИ-помощник</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Начните новый диалог или выберите существующий из списка слева
              </p>
              <button
                onClick={createConversation}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium text-sm glow-purple hover:scale-105 active:scale-95"
              >
                <Icon name="Plus" size={16} />
                Новый диалог
              </button>
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg w-full">
                {["💡 Объясни концепцию", "✍️ Помоги с текстом", "🧠 Проанализируй данные"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => { setInput(hint.slice(3)); createConversation(); }}
                    className="glass p-3 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-left"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeConversation?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-muted-foreground text-sm">Напишите первое сообщение</p>
            </div>
          )}

          {activeConversation?.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 flex-shrink-0">
          <div className="glass rounded-2xl p-1 flex items-end gap-2 focus-within:border-primary/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение... (Enter для отправки)"
              rows={1}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground max-h-32"
              style={{ minHeight: "40px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="mb-1 mr-1 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              <Icon name="Send" size={16} />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Shift+Enter — новая строка · Enter — отправить
          </p>
        </div>
      </div>

      {exportMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setExportMenuId(null)} />
      )}
    </div>
  );
}