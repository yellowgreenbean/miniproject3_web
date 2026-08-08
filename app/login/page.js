import Link from "next/link";
import { login } from "@/app/actions";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="authPage">
      <h1>로그인</h1>
      <p className="authSubtitle">오늘의 할 일과 일기를 기록해보세요.</p>

      {error && <p className="authError">{error}</p>}

      <form action={login} className="authForm">
        <label>
          이메일
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          비밀번호
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </label>
        <button type="submit">로그인</button>
      </form>

      <p className="authFooter">
        아직 계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </main>
  );
}
