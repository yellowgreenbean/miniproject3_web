"use client";

import { useState, useTransition } from "react";
import { toggleTodo, reorderTodos } from "@/app/actions";
import TodoIcon from "@/app/components/TodoIcon";

export default function TodoGrid({ initialTodos }) {
  const [items, setItems] = useState(initialTodos);
  const [dragId, setDragId] = useState(null);
  const [, startTransition] = useTransition();

  function handleToggle(id, isDone) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, is_done: isDone } : t)));
    startTransition(() => {
      toggleTodo(id, isDone);
    });
  }

  function handleDrop(targetId) {
    if (dragId === null || dragId === targetId) {
      setDragId(null);
      return;
    }

    const fromIndex = items.findIndex((t) => t.id === dragId);
    const toIndex = items.findIndex((t) => t.id === targetId);
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
    return <p className="todoEmpty">아직 할 일이 없습니다. 위에서 추가해보세요.</p>;
  }

  return (
    <ul className="todoGrid">
      {items.map((todo, index) => (
        <li
          key={todo.id}
          className={`todoCard todoCard-c${index % 5}${todo.is_done ? " todoCardDone" : ""}${
            dragId === todo.id ? " todoCardDragging" : ""
          }`}
          draggable
          onDragStart={() => setDragId(todo.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(todo.id)}
          onDragEnd={() => setDragId(null)}
        >
          <button
            type="button"
            className="checkmarkPopup"
            aria-label="완료 표시"
            onClick={() => handleToggle(todo.id, !todo.is_done)}
          >
            {todo.is_done ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className="checkmarkEmpty" />
            )}
          </button>

          <TodoIcon content={todo.content} className="todoIcon" />

          <p className="todoText">{todo.content}</p>

          <span className="dragHandle" aria-hidden="true">
            ⠿
          </span>
        </li>
      ))}
    </ul>
  );
}
