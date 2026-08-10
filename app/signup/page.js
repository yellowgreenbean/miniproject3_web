import Link from "next/link";
import { signup, loginWithGoogle } from "@/app/actions";
import GoogleButton from "@/app/components/GoogleButton";

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

        {/* 구글 설정 전에는 버튼이 눌러도 실패하므로 아예 감춘다. */}
        {process.env.GOOGLE_CLIENT_ID && (
          <GoogleButton action={loginWithGoogle} label="Google 계정으로 시작하기" />
        )}

        <p className="authFooter">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </main>
  );
}
