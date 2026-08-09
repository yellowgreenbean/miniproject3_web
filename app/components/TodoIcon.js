const ICONS = {
  exercise: (
    <>
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <rect x="5" y="7" width="2" height="10" rx="1" />
      <rect x="17" y="7" width="2" height="10" rx="1" />
    </>
  ),
  study: (
    <>
      <path d="M12 6c-2-2-5-2-7-1v12c2-1 5-1 7 1" />
      <path d="M12 6c2-2 5-2 7-1v12c-2-1-5-1-7 1" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </>
  ),
  meal: (
    <>
      <path d="M7 3v6a2 2 0 0 0 4 0V3" />
      <line x1="9" y1="9" x2="9" y2="21" />
      <path d="M16 3c2 2 2 5 0 7l-1 1v10" />
    </>
  ),
  sleep: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  water: <path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12Z" />,
  clean: (
    <>
      <line x1="15" y1="3" x2="9" y2="9" />
      <path d="M9 9 4 20l8-3 3-4Z" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </>
  ),
  shopping: (
    <>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  default: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
};

const CATEGORY_KEYWORDS = [
  ["exercise", ["운동", "헬스", "요가", "스트레칭", "산책", "조깅", "러닝", "수영", "필라테스"]],
  ["study", ["공부", "숙제", "과제", "시험", "독서", "강의", "수업", "복습", "예습", "책"]],
  ["meal", ["식사", "점심", "저녁", "아침", "요리", "식단", "밥"]],
  ["sleep", ["잠", "수면", "낮잠", "취침"]],
  ["water", ["물", "수분"]],
  ["clean", ["청소", "정리", "빨래", "설거지"]],
  ["work", ["회의", "업무", "미팅", "보고서", "발표", "프로젝트"]],
  ["shopping", ["쇼핑", "장보기", "구매"]],
];

export function matchTodoIcon(content) {
  const text = content || "";
  for (const [key, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => text.includes(kw))) return key;
  }
  return "default";
}

export default function TodoIcon({ content, className }) {
  const key = matchTodoIcon(content);
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONS[key]}
    </svg>
  );
}
