// 로그인/회원가입 화면에서는 이메일 폼 아래에 "또는" 구분선과 함께 놓이지만,
// 달력 화면의 재연동 버튼은 그 자리에 있는 게 아니라 divider/hint 를 끌 수 있게 했다.
export default function GoogleButton({
  action,
  label = "Google 계정으로 계속하기",
  divider = true,
  hint = "구글 계정으로 로그인하면 달력에서 구글 캘린더 일정을 볼 수 있습니다.",
}) {
  return (
    <>
      {divider && (
        <div className="authDivider">
          <span>또는</span>
        </div>
      )}
      <form action={action}>
        <button type="submit" className="googleButton">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          {label}
        </button>
      </form>
      {hint && <p className="authHint">{hint}</p>}
    </>
  );
}
