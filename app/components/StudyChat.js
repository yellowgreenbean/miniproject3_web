"use client";

import { useState, useTransition } from "react";
import { addStudyPlanTodo } from "@/app/actions";
import { formatDisplayDate, addDays } from "@/lib/date";
import {
  COACH_MODES,
  DEFAULT_MODE,
  DEFAULT_RANGE_DAYS,
  RANGE_PRESETS,
  MIN_RANGE_DAYS,
  MAX_RANGE_DAYS,
  getMode,
  normalizeRangeDays,
} from "@/lib/coachModes";

let nextId = 1;

function newMessage(fields) {
  return { id: nextId++, days: null, choices: null, overdue: null, ...fields };
}

function toThread(rows, opening) {
  if (!rows || rows.length === 0) {
    return [newMessage({ role: "assistant", text: opening })];
  }
  return rows.map((m) => newMessage({ role: m.role, text: m.content }));
}

export default function StudyChat({ initialThreads = {}, today }) {
  const [modeId, setModeId] = useState(DEFAULT_MODE);
  const [threads, setThreads] = useState(() =>
    Object.fromEntries(COACH_MODES.map((m) => [m.id, toThread(initialThreads[m.id], m.opening)]))
  );
  const [input, setInput] = useState("");
  // 어느 모드에서 보낸 요청인지 들고 있어야, 기다리는 동안 탭을 옮겨도
  // 답이 원래 있던 대화에 붙는다.
  const [loadingMode, setLoadingMode] = useState(null);
  const [rangeDays, setRangeDays] = useState(DEFAULT_RANGE_DAYS);
  const [, startTransition] = useTransition();

  const mode = getMode(modeId);
  const messages = threads[modeId];
  const isLoading = loadingMode !== null;

  // 직접 입력 칸은 타이핑 중 빈 문자열이 될 수 있으므로, 날짜 계산에는 항상
  // 보정한 값을 쓴다. 입력 칸에는 사용자가 친 그대로를 남겨 둔다.
  const days = normalizeRangeDays(rangeDays);
  const rangeFrom = addDays(today, -days);
  const rangeTo = addDays(today, -1);

  // 지난 턴의 칩은 남기지 않는다. 이미 답한 질문의 선택지가 계속 떠 있으면
  // 어느 질문에 대한 답인지 헷갈리기 때문이다.
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id ?? null;

  function appendTo(targetMode, message) {
    setThreads((prev) => ({ ...prev, [targetMode]: [...prev[targetMode], message] }));
  }

  async function send(text, { collect = false } = {}) {
    if (!text || isLoading) return;

    const sentMode = modeId;
    appendTo(sentMode, newMessage({ role: "user", text }));
    setInput("");
    setLoadingMode(sentMode);

    try {
      const res = await fetch("/api/study-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode: sentMode, days }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        appendTo(
          sentMode,
          newMessage({ role: "error", text: data?.error || "잠시 후 다시 시도해주세요." })
        );
        return;
      }

      appendTo(
        sentMode,
        newMessage({
          role: "assistant",
          text: data.reply,
          days: Array.isArray(data.planItems)
            ? data.planItems.map((d) => ({ ...d, added: false }))
            : null,
          choices: data.choices ?? null,
          // 모아온 목록은 '모으기' 턴에서만 보여준다. 이어지는 대화마다 다시 깔면
          // 같은 목록이 계속 쌓여 화면이 지저분해진다.
          overdue: collect && Array.isArray(data.overdue) ? data.overdue : null,
        })
      );
    } catch {
      appendTo(sentMode, newMessage({ role: "error", text: "잠시 후 다시 시도해주세요." }));
    } finally {
      setLoadingMode(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input.trim());
  }

  function handleCollect() {
    send(
      `최근 ${days}일(${formatDisplayDate(rangeFrom)} ~ ${formatDisplayDate(
        rangeTo
      )}) 동안 못 끝낸 할 일을 모아서, 앞으로 며칠에 어떻게 나눠 하면 좋을지 정해줘.`,
      { collect: true }
    );
  }

  function markAdded(messageId, indexes) {
    setThreads((prev) => ({
      ...prev,
      [modeId]: prev[modeId].map((m) => {
        if (m.id !== messageId || !m.days) return m;
        return { ...m, days: m.days.map((d, i) => (indexes.includes(i) ? { ...d, added: true } : d)) };
      }),
    }));
  }

  function handleAddTodo(messageId, dayIndex) {
    const day = messages.find((m) => m.id === messageId)?.days?.[dayIndex];
    if (!day || day.added) return;

    markAdded(messageId, [dayIndex]);
    startTransition(() => {
      addStudyPlanTodo(day.date, `${day.amount}, ${day.method}`);
    });
  }

  function handleAddAll(messageId) {
    const message = messages.find((m) => m.id === messageId);
    const pending = (message?.days ?? [])
      .map((day, i) => ({ day, i }))
      .filter(({ day }) => !day.added);
    if (pending.length === 0) return;

    markAdded(messageId, pending.map(({ i }) => i));
    startTransition(() => {
      pending.forEach(({ day }) => addStudyPlanTodo(day.date, `${day.amount}, ${day.method}`));
    });
  }

  return (
    <div className="studyChat">
      <div className="coachModeRow" role="tablist" aria-label="챗봇 옵션">
        {COACH_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === modeId}
            className="coachModeButton"
            onClick={() => setModeId(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

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
          const pendingCount = (m.days ?? []).filter((d) => !d.added).length;

          return (
            <div key={m.id} className="chatBubbleRow chatBubbleRow-assistant">
              <div className="chatBubbleStack">
                <div className="chatBubble chatBubble-assistant">
                  <p>{m.text}</p>

                  {m.overdue && m.overdue.length > 0 && (
                    <div className="overdueBlock">
                      <span className="overdueCount">못 끝낸 할 일 {m.overdue.length}개</span>
                      <ul className="overdueList">
                        {m.overdue.map((todo) => (
                          <li key={todo.id} className="overdueItem">
                            <span className="overdueDate">{formatDisplayDate(todo.date)}</span>
                            <span className="overdueContent">{todo.content}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.days && m.days.length > 0 && (
                    <>
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
                      {m.days.length > 1 && (
                        <button
                          type="button"
                          className="planAddAllButton"
                          disabled={pendingCount === 0}
                          onClick={() => handleAddAll(m.id)}
                        >
                          {pendingCount === 0
                            ? "달력에 모두 넣었어요"
                            : `${pendingCount}개 한 번에 달력에 넣기`}
                        </button>
                      )}
                    </>
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

      {modeId === "catchup" && (
        <div className="catchupRange">
          <div className="catchupRangeChips" role="group" aria-label="며칠 전부터 모을지">
            <span className="catchupRangeLabel">며칠 전부터</span>
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="catchupRangeChip"
                aria-pressed={days === preset}
                disabled={isLoading}
                onClick={() => setRangeDays(preset)}
              >
                {preset}일
              </button>
            ))}
            <label className="catchupRangeCustom">
              <input
                type="number"
                min={MIN_RANGE_DAYS}
                max={MAX_RANGE_DAYS}
                value={rangeDays}
                disabled={isLoading}
                aria-label="기간 직접 입력(일)"
                onChange={(e) => setRangeDays(e.target.value)}
                onBlur={(e) => setRangeDays(normalizeRangeDays(e.target.value))}
              />
              <span>일</span>
            </label>
          </div>
          <p className="catchupRangeHint">
            {formatDisplayDate(rangeFrom)} ~ {formatDisplayDate(rangeTo)} 중 체크하지 않은 할 일을
            모아요.
          </p>
          <button
            type="button"
            className="pillButton"
            disabled={isLoading}
            onClick={handleCollect}
          >
            밀린 할 일 모으기
          </button>
        </div>
      )}

      <div className="coachTopicRow" aria-label="주제 골라 물어보기">
        {mode.topics.map((topic) => (
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
