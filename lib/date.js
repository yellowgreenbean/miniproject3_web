const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

// 모델이 만들어낸 날짜를 DB(todos.date, goals.deadline)에 넣기 전에 거르는 데 쓴다.
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getWeekDates(dateStr) {
  const date = parseISODate(dateStr);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, iso: formatISODate(d), label: WEEKDAY_LABELS[i] };
  });
}

export function formatDisplayDate(dateStr) {
  const date = parseISODate(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

export function getMonthMatrix(dateStr) {
  const date = parseISODate(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const mondayOffset = firstWeekday === 0 ? -6 : 1 - firstWeekday;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() + mondayOffset);

  const weeks = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: new Date(cursor),
        iso: formatISODate(cursor),
        day: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function getMonthLabel(dateStr) {
  const date = parseISODate(dateStr);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function addMonths(dateStr, delta) {
  const date = parseISODate(dateStr);
  const d = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return formatISODate(d);
}

export function daysBetween(fromISO, toISO) {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86400000);
}

export function addDays(dateStr, delta) {
  const date = parseISODate(dateStr);
  date.setDate(date.getDate() + delta);
  return formatISODate(date);
}
