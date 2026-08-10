"use client";

import { useState, useTransition } from "react";
import { addStudyPlanTodo } from "@/app/actions";
import { formatDisplayDate } from "@/lib/date";
import { COACH_TOPICS } from "@/lib/coachTopics";

let nextId = 1;

const OPENING_LINE = "안녕! 나는 너의 공부 선배야 :) 요즘 어떤 시험이나 목표를 준비하고 있어?";

export default function StudyChat({ initialMessages = [] }) {
  const [messages, setMessages] = useState(() =>
    initialMessages.length === 0
      ? [{ id: nextId++, role: "assistant", text: OPENING_LINE, days: null, choices: null }]
      : initialMessages.map((m) => ({
          id: nextId++,
          role: m.role,
          text: m.content,
          days: null,
          choices: null,
        }))
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  // 지난 턴의 칩은 남기지 않는다. 이미 답한 질문의 선택지가 계속 떠 있으면
  // 어느 질문에 대한 답인지 헷갈리기 때문이다.
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null;

  async function send(text) {
    if (!text || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: "user", text, days: null, choices: null },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/study-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId++,
            role: "error",
            text: data?.error || "잠시 후 다시 시도해주세요.",
            days: null,
            choices: null,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId++,
          role: "assistant",
          text: data.reply,
          days: Array.isArray(data.planItems) ? data.planItems.map((d) => ({ ...d, added: false })) : null,
          choices: data.choices ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: "error", text: "잠시 후 다시 시도해주세요.", days: null, choices: null },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input.trim());
  }

  function handleAddTodo(messageId, dayIndex) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.days) return m;
        const days = m.days.map((d, i) => (i === dayIndex ? { ...d, added: true } : d));
        return { ...m, days };
      })
    );

    const message = messages.find((m) => m.id === messageId);
    const day = message?.days?.[dayIndex];
    if (!day) return;

    startTransition(() => {
      addStudyPlanTodo(day.date, `${day.amount}, ${day.method}`);
    });
  }

  return (
    <div className="studyChat">
      <div className="studyChatThread">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="chatBubbleRow chatBubbleRow-user">
                <p className="chatBubble chatBubble-user">{m.text}</p>
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div key={m.id} className="chatBubbleRow chatBubbleRow-assistant">
                <p className="chatBubble chatBubble-error">{m.text}</p>
              </div>
            );
          }

          const showChoices = m.choices && m.id === lastAssistantId && !isLoading;

          return (
            <div key={m.id} className="chatBubbleRow chatBubbleRow-assistant">
              <div className="chatBubbleStack">
                <div className="chatBubble chatBubble-assistant">
                  <p>{m.text}</p>
                  {m.days && m.days.length > 0 && (
                    <ul className="planList">
                      {m.days.map((day, i) => (
                        <li key={`${day.date}-${i}`} className="planDay">
                          <div className="planDayInfo">
                            <span className="planDayDate">{formatDisplayDate(day.date)}</span>
                            <span className="planDayAmount">{day.amount}</span>
                            <span className="planDayMethod">{day.method}</span>
                          </div>
                          <button
                            type="button"
                            className="planAddButton"
                            disabled={day.added}
                            onClick={() => handleAddTodo(m.id, i)}
                          >
                            {day.added ? "추가됨" : "to-do 추가"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {showChoices && (
                  <div className="coachChoices" data-category={m.choices.category}>
                    <span className="coachChoiceCategory">{m.choices.category}</span>
                    <div className="coachChoiceChips">
                      {m.choices.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="coachChoiceChip"
                          onClick={() => send(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="chatBubbleRow chatBubbleRow-assistant">
            <p className="chatBubble chatBubble-assistant">생각하는 중...</p>
          </div>
        )}
      </div>

      <div className="coachTopicRow" aria-label="주제 골라 물어보기">
        {COACH_TOPICS.map((topic) => (
          <button
            key={topic.category}
            type="button"
            className="coachTopicButton"
            data-category={topic.category}
            disabled={isLoading}
            onClick={() => send(topic.message)}
          >
            {topic.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="studyChatInputRow">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="선배에게 메시지 보내기"
          disabled={isLoading}
        />
        <button type="submit" className="pillButton" disabled={isLoading || !input.trim()}>
          전송
        </button>
      </form>
    </div>
  );
}
