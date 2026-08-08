import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="authPage">
        <h1>오늘의 하루</h1>
        <p className="authSubtitle">
          할 일을 우선순위와 함께 관리하고, 하루를 일기로 기록하는 서비스입니다.
        </p>
        <div className="homeLinks">
          <Link href="/login">로그인</Link>
          <Link href="/signup">회원가입</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="authPage">
      <h1>오늘의 하루</h1>
      <p className="authSubtitle">{user.email}님, 환영합니다.</p>
      <p>(다음 단계에서 오늘의 할 일 화면을 이 자리에 구현합니다)</p>
      <form action={logout}>
        <button type="submit">로그아웃</button>
      </form>
    </main>
  );
}
