"use client";

import { useState, useTransition } from "react";
import { toggleTodo, reorderTodos } from "@/app/actions";
import TodoIcon, { getCategoryMeta } from "@/app/components/TodoIcon";

export default function TodoGrid({ initialTodos, readOnly = false }) {
  const [items, setItems] = useState(initialTodos);
  const [dragId, setDragId] = useState(null);
  const [, startTransition] = useTransition();

  function handleToggle(id, isDone) {
    if (readOnly) return;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, is_done: isDone } : t)));
    startTransition(() => {
      toggleTodo(id, isDone);
    });
  }

  function handleDrop(targetId, sourceId) {
    if (readOnly) return;
    // dragId is the normal path; sourceId is what the drag itself carried, which
    // survives even if the dragstart state update never landed.
    const from = dragId ?? sourceId;
    if (from == null || String(from) === String(targetId)) {
      setDragId(null);
      return;
    }

    const fromIndex = items.findIndex((t) => String(t.id) === String(from));
    const toIndex = items.findIndex((t) => String(t.id) === String(targetId));
    if (fromIndex === -1 || toIndex === -1) {
      setDragId(null);
      return;
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setItems(next);
    setDragId(null);

    startTransition(() => {
      reorderTodos(next.map((t) => t.id));
    });
  }

  if (items.length === 0) {
    return <p className="todoEmpty">아직 할 일이 없습니다.{!readOnly && " 위에서 추가해보세요."}</p>;
  }

  return (
    <ul className="todoGrid">
      {items.map((todo) => {
        const meta = getCategoryMeta(todo.content);
        return (
          <li
            key={todo.id}
            className={`todoCard${todo.is_done ? " todoCardDone" : ""}${
              dragId === todo.id ? " todoCardDragging" : ""
            }`}
            style={{ "--card-accent": meta.color }}
            draggable={!readOnly}
            onDragStart={
              readOnly
                ? undefined
                : (e) => {
                    // Firefox will not begin a drag unless dataTransfer carries something.
                    e.dataTransfer.setData("text/plain", String(todo.id));
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(todo.id);
                  }
            }
            onDragOver={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
            }
            onDrop={
              readOnly
                ? undefined
                : (e) => {
                    e.preventDefault();
                    handleDrop(todo.id, e.dataTransfer.getData("text/plain"));
                  }
            }
            onDragEnd={readOnly ? undefined : () => setDragId(null)}
          >
            <button
              type="button"
              className="checkmarkPopup"
              aria-label="완료 표시"
              disabled={readOnly}
              onClick={() => handleToggle(todo.id, !todo.is_done)}
            >
              {todo.is_done ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="checkmarkEmpty" />
              )}
            </button>

            <div className="todoIconBadge">
              <TodoIcon content={todo.content} />
            </div>

            <p className="todoText">{todo.content}</p>
            <p className="todoCategoryLabel">{meta.label}</p>

            {!readOnly && (
              <span className="dragHandle" aria-hidden="true">
                ⠿
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
