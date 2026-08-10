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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session) {
      target = `/login?error=${encodeURIComponent("구글 로그인에 실패했습니다.")}`;
    } else if (data.session.provider_token) {
      await saveGoogleTokens(supabase, data.session.user.id, {
        accessToken: data.session.provider_token,
        refreshToken: data.session.provider_refresh_token,
        // 구글 액세스 토큰은 보통 1시간이지만 세션에는 만료 시각이 없다.
        expiresIn: 3600,
      });
    }
  }

  // redirect 는 예외를 던지므로 위 분기 밖에서 호출한다.
  redirect(target);
}
