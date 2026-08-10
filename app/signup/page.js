import Link from "next/link";
import { signup } from "@/app/actions";

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

  return (
    <main className="authPage">
      <div className="authCard">
        <h1>회원가입</h1>
        <p className="authSubtitle">이메일로 가입하고 나만의 하루 기록을 시작하세요.</p>

        {error && <p className="authError">{error}</p>}
        {message && <p className="authMessage">{message}</p>}

        <form action={signup} className="authForm">
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
              autoComplete="new-password"
            />
          </label>
          <button type="submit">회원가입</button>
        </form>

        <p className="authFooter">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}
