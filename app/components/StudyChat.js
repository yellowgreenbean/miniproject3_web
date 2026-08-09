"use client";

import { useRef, useState, useTransition } from "react";
import { requestStudyPlan, addStudyPlanTodo } from "@/app/actions";
import { formatDisplayDate } from "@/lib/date";

let nextId = 1;

export default function StudyChat() {
  const [messages, setMessages] = useState([]);
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const deadline = (formData.get("deadline") || "").trim();
    const totalAmount = (formData.get("totalAmount") || "").trim();
    const dailyAmount = (formData.get("dailyAmount") || "").trim();
    const dailyTime = (formData.get("dailyTime") || "").trim();

    if (!deadline || !totalAmount || !dailyAmount || !dailyTime) {
      setFormError("기한, 전체 분량, 하루 가능 분량, 하루 투자 가능 시간을 모두 입력해주세요.");
      return;
    }
    setFormError("");

    const userMessage = {
      id: nextId++,
      role: "user",
      text: `기한 ${formatDisplayDate(deadline)} · 전체 ${totalAmount} · 하루 최대 ${dailyAmount} · 하루 ${dailyTime}`,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const result = await requestStudyPlan({ deadline, totalAmount, dailyAmount, dailyTime });

    setIsLoading(false);

    if (!result.ok) {
      setMessages((prev) => [...prev, { id: nextId++, role: "error", text: result.error }]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: nextId++,
        role: "assistant",
        feasible: result.plan.feasible,
        warning: result.plan.warning,
        days: result.plan.days.map((d) => ({ ...d, added: false })),
      },
    ]);
  }

  function handleAddTodo(messageId, dayIndex) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const days = m.days.map((d, i) => (i === dayIndex ? { ...d, added: true } : d));
        return { ...m, days };
      })
    );

    const message = messages.find((m) => m.id === messageId);
    const day = message.days[dayIndex];
    startTransition(() => {
      addStudyPlanTodo(day.date, `${day.amount}, ${day.method}`);
    });
  }

  return (
    <div className="studyChat">
      <div className="studyChatThread">
        {messages.length === 0 && !isLoading && (
          <p className="todoEmpty">
            기한, 전체 분량, 하루 가능 분량, 하루 투자 가능 시간을 알려주시면 날짜별 공부 계획을 짜드릴게요.
          </p>
        )}

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
          return (
            <div key={m.id} className="chatBubbleRow chatBubbleRow-assistant">
              <div className="chatBubble chatBubble-assistant">
                {!m.feasible && m.warning && <p className="planWarning">{m.warning}</p>}
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

      <form ref={formRef} onSubmit={handleSubmit} className="studyForm">
        <label>
          기한(마감일)
          <input type="date" name="deadline" required />
        </label>
        <label>
          전체 분량
          <input type="text" name="totalAmount" placeholder="예) 문제집 200페이지" />
        </label>
        <label>
          하루에 할 수 있는 분량
          <input type="text" name="dailyAmount" placeholder="예) 하루 20페이지" />
        </label>
        <label>
          하루 투자 가능한 시간
          <input type="text" name="dailyTime" placeholder="예) 하루 2시간" />
        </label>

        {formError && <p className="authError">{formError}</p>}

        <button type="submit" className="pillButton" disabled={isLoading}>
          선배에게 물어보기
        </button>
      </form>
    </div>
  );
}
