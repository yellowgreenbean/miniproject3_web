import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { logout, addTodos } from "@/app/actions";
import { todayISO, getWeekDates, formatDisplayDate } from "@/lib/date";
import BottomNav from "@/app/components/BottomNav";
import TodoGrid from "@/app/components/TodoGrid";
import GrassHill from "@/app/components/GrassHill";

export default async function HomePage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="landingPage">
        <div className="landingHero">
          <Image
            src="/sheep.jpeg"
            alt="풀밭 위를 뛰어오르는 양"
            fill
            priority
            className="landingHeroImage landingHeroImage-cover"
          />
        </div>
        <div className="landingContent">
          <h1>오늘의 하루</h1>
          <p className="authSubtitle">
            할 일을 우선순위와 함께 관리하고, 하루를 일기로 기록하는 서비스입니다.
          </p>
          <div className="homeLinks">
            <Link href="/login">로그인</Link>
            <Link href="/signup">회원가입</Link>
          </div>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const today = todayISO();
  const selectedDate = params?.date || today;
  const week = getWeekDates(selectedDate);

  const { data: todos, error } = await supabase
    .from("todos")
    .select("id, content, priority, is_done")
    .eq("user_id", user.id)
    .eq("date", selectedDate)
    .order("priority", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const list = todos ?? [];

  return (
    <div className="appShell todayShell">
      <header className="mainHeader todayHeader">
        <p className="headerDate">{formatDisplayDate(selectedDate)}</p>
        <h1 className="todayTitle">오늘의 하루</h1>
        <form action={logout}>
          <button type="submit" className="logoutLink">
            로그아웃
          </button>
        </form>
      </header>

      <nav className="calendarNav todayWeekNav">
        <ul className="calendarGrid">
          {week.map((day) => {
            const isToday = day.iso === today;
            const isSelected = day.iso === selectedDate;
            const className = [
              "dayCircle",
              isToday ? "dayCircleToday" : "",
              isSelected ? "dayCircleSelected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={day.iso}>
                <Link href={`/?date=${day.iso}`} className={className}>
                  <span className="dayLabel">{day.label}</span>
                  <span className="dayNumber">{day.date.getDate()}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="mainContent todayContent">
        <form action={addTodos} className="todoForm todayAddForm">
          <input type="hidden" name="date" value={selectedDate} />
          <label>
            {formatDisplayDate(selectedDate)} 할 일 추가 (쉼표 또는 줄바꿈으로 구분)
            <textarea
              name="content"
              rows={3}
              placeholder="예) 수학 숙제 30분, 영어 단어 외우기, 운동"
            />
          </label>
          <button type="submit" className="todayAddButton">추가하기</button>
        </form>

        {error && (
          <p className="authError">할 일을 불러오지 못했습니다: {error.message}</p>
        )}

        <div className="todayTodoWrap">
          <TodoGrid key={selectedDate} initialTodos={list} />
        </div>

        <GrassHill />
      </main>

      <BottomNav />
    </div>
  );
}
