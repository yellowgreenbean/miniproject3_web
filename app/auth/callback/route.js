import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveGoogleTokens } from "@/lib/googleCalendar";

// 구글 동의 화면에서 돌아오는 지점. 인증 코드를 세션으로 바꾸고, 이때만
// 딱 한 번 내려오는 구글 토큰을 저장해 둔다.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  let target = "/calendar";

  if (oauthError) {
    target = `/login?error=${encodeURIComponent("구글 로그인이 취소되었습니다.")}`;
  } else if (!code) {
    target = `/login?error=${encodeURIComponent("구글 로그인에 실패했습니다.")}`;
  } else {
    const supabase = await createClient();

    // 달력에서 "연동하기"로 들어온 경우엔 이미 로그인한 사용자가 있다.
    // 여기서 다른 구글 계정을 고르면 세션이 통째로 그 계정으로 바뀌어,
    // 사용자 눈에는 내 할 일이 전부 사라진 것처럼 보인다. 그래서 미리 기억해 둔다.
    const { data: { user: previousUser } } = await supabase.auth.getUser();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session) {
      target = `/login?error=${encodeURIComponent("구글 로그인에 실패했습니다.")}`;
    } else {
      if (data.session.provider_token) {
        await saveGoogleTokens(supabase, data.session.user.id, {
          accessToken: data.session.provider_token,
          refreshToken: data.session.provider_refresh_token,
          // 구글 액세스 토큰은 보통 1시간이지만 세션에는 만료 시각이 없다.
          expiresIn: 3600,
        });
      }

      if (previousUser && previousUser.id !== data.session.user.id) {
        target = `/calendar?googleError=${encodeURIComponent(
          "이전과 다른 구글 계정으로 연동해서 그 계정으로 전환되었습니다. 원래 계정의 할 일을 보려면 로그아웃 후 다시 로그인해주세요."
        )}`;
      }
    }
  }

  // redirect 는 예외를 던지므로 위 분기 밖에서 호출한다.
  redirect(target);
}
