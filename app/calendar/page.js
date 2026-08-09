import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addTodos, addFriend, removeFriend, saveDiary } from "@/app/actions";
import {
  todayISO,
  getMonthMatrix,
  getMonthLabel,
  addMonths,
  formatDisplayDate,
} from "@/lib/date";
import BottomNav from "@/app/components/BottomNav";
import TodoGrid from "@/app/components/TodoGrid";
import GrassHill from "@/app/components/GrassHill";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export default async function CalendarPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const today = todayISO();
  const selectedDate = params?.date || today;
  const friendError = params?.friendError;

  const { data: friendRows } = await supabase
    .from("friends")
    .select("id, friend_id")
    .eq("owner_id", user.id);

  const friendIds = (friendRows ?? []).map((f) => f.friend_id);
  let friendProfiles = [];
  if (friendIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, email").in("id", friendIds);
    friendProfiles = data ?? [];
  }
  const friends = (friendRows ?? []).map((row) => ({
    rowId: row.id,
    id: row.friend_id,
    email: friendProfiles.find((p) => p.id === row.friend_id)?.email ?? "(알 수 없음)",
  }));

  const viewingFriend = friends.find((f) => f.id === params?.friend);
  const viewingUserId = viewingFriend ? viewingFriend.id : user.id;
  const isOwnCalendar = !viewingFriend;

  const weeks = getMonthMatrix(selectedDate);
  const days = weeks.flat();
  const gridStart = days[0].iso;
  const gridEnd = days[days.length - 1].iso;

  const [{ data: monthTodos }, { data: dayTodos, error }, { data: diaryRow }] = await Promise.all([
    supabase
      .from("todos")
      .select("date")
      .eq("user_id", viewingUserId)
      .gte("date", gridStart)
      .lte("date", gridEnd),
    supabase
      .from("todos")
      .select("id, content, priority, is_done")
      .eq("user_id", viewingUserId)
      .eq("date", selectedDate)
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("diaries")
      .select("content")
      .eq("user_id", viewingUserId)
      .eq("date", selectedDate)
      .maybeSingle(),
  ]);

  const datesWithTodos = new Set((monthTodos ?? []).map((t) => t.date));
  const list = dayTodos ?? [];

  const prevMonth = addMonths(selectedDate, -1);
  const nextMonth = addMonths(selectedDate, 1);
  const friendQuery = viewingFriend ? `&friend=${viewingFriend.id}` : "";

  return (
    <div className="appShell bandShell">
      <header className="mainHeader bandHeader">
        <p className="headerDate">
          {isOwnCalendar ? "내 달력" : `${viewingFriend.email}님의 달력 (읽기 전용)`}
        </p>
        <h1 className="bandTitle">{getMonthLabel(selectedDate)}</h1>
        <div className="monthNav">
          <Link href={`/calendar?date=${prevMonth}${friendQuery}`} aria-label="이전 달">
            ◀
          </Link>
          <Link href={`/calendar?date=${today}${friendQuery}`}>
            오늘
          </Link>
          <Link href={`/calendar?date=${nextMonth}${friendQuery}`} aria-label="다음 달">
            ▶
          </Link>
        </div>
      </header>

      <section className="friendPanel">
        <div className="friendSwitcher">
          <Link
            href={`/calendar?date=${selectedDate}`}
            className={`friendPill${isOwnCalendar ? " friendPillActive" : ""}`}
          >
            내 달력
          </Link>
          {friends.map((f) => (
            <Link
              key={f.id}
              href={`/calendar?date=${selectedDate}&friend=${f.id}`}
              className={`friendPill${viewingFriend?.id === f.id ? " friendPillActive" : ""}`}
            >
              {f.email}
            </Link>
          ))}
        </div>

        <form action={addFriend} className="friendAddForm">
          <input type="email" name="email" placeholder="친구 이메일로 추가" required />
          <button type="submit" className="ghostButton">추가</button>
        </form>

        {friendError && <p className="authError">{friendError}</p>}

        {friends.length > 0 && (
          <ul className="friendList">
            {friends.map((f) => (
              <li key={f.id}>
                <span>{f.email}</span>
                <form action={removeFriend.bind(null, f.rowId)}>
                  <button type="submit" className="ghostButton">삭제</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="monthNavGrid">
        <div className="monthWeekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="monthGrid">
          {days.map((day) => {
            const isToday = day.iso === today;
            const isSelected = day.iso === selectedDate;
            const className = [
              "monthDay",
              !day.inCurrentMonth ? "monthDayMuted" : "",
              isToday ? "monthDayToday" : "",
              isSelected ? "monthDaySelected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Link
                key={day.iso}
                href={`/calendar?date=${day.iso}${friendQuery}`}
                className={className}
              >
                <span className="monthDayNumber">{day.day}</span>
                {datesWithTodos.has(day.iso) && <span className="monthDot" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mainContent">
        {isOwnCalendar && (
          <form action={addTodos} className="todoForm">
            <input type="hidden" name="date" value={selectedDate} />
            <label>
              {formatDisplayDate(selectedDate)} 할 일 추가 (쉼표 또는 줄바꿈으로 구분)
              <div className="fuzzyTextareaWrap">
                <textarea
                  name="content"
                  rows={3}
                  placeholder="예) 수학 숙제 30분, 영어 단어 외우기, 운동"
                />
              </div>
            </label>
            <button type="submit" className="pillButton">추가하기</button>
          </form>
        )}

        {error && (
          <p className="authError">할 일을 불러오지 못했습니다: {error.message}</p>
        )}

        <div className="emptyStateWrap">
          <TodoGrid key={`${viewingUserId}-${selectedDate}`} initialTodos={list} readOnly={!isOwnCalendar} />
        </div>

        {isOwnCalendar && (
          <section className="diarySection">
            <h2>{formatDisplayDate(selectedDate)} 일기</h2>
            <form action={saveDiary} className="diaryForm" key={`${selectedDate}-${diaryRow?.content ?? ""}`}>
              <input type="hidden" name="date" value={selectedDate} />
              <div className="fuzzyTextareaWrap">
                <textarea
                  name="content"
                  rows={5}
                  defaultValue={diaryRow?.content ?? ""}
                  placeholder="오늘 하루는 어땠나요?"
                />
              </div>
              <button type="submit" className="pillButton">저장</button>
            </form>
          </section>
        )}

        <GrassHill />
      </main>

      <BottomNav />
    </div>
  );
}
