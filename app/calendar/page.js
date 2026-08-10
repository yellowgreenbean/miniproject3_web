import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addTodos, addFriend, removeFriend, saveDiary, unlinkGoogle, linkGoogle } from "@/app/actions";
import { getGoogleEvents, isGoogleLinked } from "@/lib/googleCalendar";
import GoogleButton from "@/app/components/GoogleButton";
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
  const googleError = params?.googleError;

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

  // 구글 일정은 내 달력에서만 불러온다. 친구 달력에는 친구의 구글 토큰이 없고,
  // 있더라도 남의 일정을 보여주면 안 된다.
  const [
    { data: monthTodos },
    { data: dayTodos, error },
    { data: diaryRow },
    googleEvents,
    googleTokenSaved,
  ] = await Promise.all([
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
    isOwnCalendar
      ? getGoogleEvents(supabase, user.id, gridStart, gridEnd)
      : Promise.resolve(null),
    // 토큰 행이 있는지만 따로 본다. 이게 있어야 "아직 연동 안 함"과
    // "연동은 했는데 토큰이 만료됨"을 구분해 다른 안내를 띄울 수 있다.
    isOwnCalendar ? isGoogleLinked(supabase, user.id) : Promise.resolve(false),
  ]);

  const datesWithTodos = new Set((monthTodos ?? []).map((t) => t.date));
  const list = dayTodos ?? [];

  // null 이면 조회 실패, 빈 배열이면 연동됐지만 이달 일정이 없음
  const googleLinked = googleEvents !== null;
  // 토큰은 남아 있는데 조회가 실패했다면 만료됐거나 구글이 응답하지 않은 것이다.
  const googleStale = googleTokenSaved && !googleLinked;
  const datesWithGoogle = new Set((googleEvents ?? []).map((e) => e.date));
  const dayGoogleEvents = (googleEvents ?? []).filter((e) => e.date === selectedDate);

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
                <span className="monthDots">
                  {datesWithTodos.has(day.iso) && <span className="monthDot" />}
                  {datesWithGoogle.has(day.iso) && <span className="monthDot monthDotGoogle" />}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mainContent">
        {/* 로그인/회원가입 화면과 같은 기준. 구글 설정 전에는 연동 버튼이 눌러도
            실패하므로 구글 관련 UI 를 통째로 감춘다. */}
        {isOwnCalendar && (process.env.GOOGLE_CLIENT_ID || googleTokenSaved) && (
          <section className="googleSection">
            <div className="googleSectionHead">
              <h2>구글 캘린더</h2>
              {/* 토큰이 남아 있을 때만 해제할 것이 있다 */}
              {googleTokenSaved && (
                <form action={unlinkGoogle}>
                  <button type="submit" className="ghostButton">연동 해제</button>
                </form>
              )}
            </div>

            {googleError && <p className="authError">{googleError}</p>}

            {!googleLinked ? (
              <div className="googleLinkPrompt">
                <p className="googleEmpty">
                  {googleStale
                    ? "구글 일정을 불러오지 못했습니다. 연동이 만료되었을 수 있어요. 다시 연동해주세요."
                    : "구글 캘린더를 연동하면 이 달력에서 구글 일정도 함께 볼 수 있습니다."}
                </p>
                <GoogleButton
                  action={linkGoogle}
                  label={googleStale ? "구글 캘린더 다시 연동하기" : "구글 캘린더 연동하기"}
                  divider={false}
                  hint={null}
                />
              </div>
            ) : dayGoogleEvents.length === 0 ? (
              <p className="googleEmpty">이 날은 구글 일정이 없습니다.</p>
            ) : (
              <ul className="googleEventList">
                {dayGoogleEvents.map((event) => (
                  <li key={event.id} className="googleEvent">
                    <span className="googleEventBadge" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="4" y="5" width="16" height="15" rx="3" />
                        <path d="M4 10h16M8 3v4M16 3v4" />
                      </svg>
                    </span>
                    <span className="googleEventBody">
                      <span className="googleEventTitle">{event.title}</span>
                      <span className="googleEventTime">{event.allDay ? "종일" : event.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && (
          <p className="authError">할 일을 불러오지 못했습니다: {error.message}</p>
        )}

        <div className="emptyStateWrap">
          <TodoGrid key={`${viewingUserId}-${selectedDate}`} initialTodos={list} readOnly={!isOwnCalendar} />
        </div>

        {isOwnCalendar && (
          <form action={addTodos} className="todoForm">
            <input type="hidden" name="date" value={selectedDate} />
            <label>
              <span className="todoFormTitle">
                {formatDisplayDate(selectedDate)} 할 일 추가 (쉼표 또는 줄바꿈으로 구분)
              </span>
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
