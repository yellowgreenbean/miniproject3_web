const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// 읽기 전용. 쓰기까지 하려면 calendar.events 로 올려야 하고 구글 심사 조건도 달라진다.
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

// 앱 전체가 KST 날짜 문자열(YYYY-MM-DD)로 돌아가므로 구글 시각도 KST 로 맞춘다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKST(value) {
  return new Date(new Date(value).getTime() + KST_OFFSET_MS);
}

function kstDateString(value) {
  return toKST(value).toISOString().slice(0, 10);
}

function kstTimeLabel(value) {
  return toKST(value).toISOString().slice(11, 16);
}

export async function saveGoogleTokens(supabase, userId, { accessToken, refreshToken, expiresIn }) {
  if (!accessToken) return;

  const expiresAt = new Date(Date.now() + (Number(expiresIn) || 3600) * 1000).toISOString();

  // 구글이 refresh token 을 다시 안 줄 때가 있어서, 새 값이 없으면 기존 값을 지우지 않는다.
  const row = {
    user_id: userId,
    access_token: accessToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (refreshToken) row.refresh_token = refreshToken;

  await supabase.from("google_tokens").upsert(row, { onConflict: "user_id" });
}

export async function isGoogleLinked(supabase, userId) {
  const { data } = await supabase
    .from("google_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function refreshAccessToken(supabase, userId, refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.access_token) return null;

  await saveGoogleTokens(supabase, userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });

  return data.access_token;
}

/**
 * 지정한 날짜 범위(KST)의 구글 캘린더 일정을 가져온다.
 * 연동하지 않았거나 토큰이 만료돼 갱신도 못 하면 null 을 돌려주고,
 * 호출한 화면은 구글 관련 UI 를 감춘다.
 */
export async function getGoogleEvents(supabase, userId, startDate, endDate) {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  let accessToken = tokenRow.access_token;

  // 요청 도중 만료되는 일이 없도록 1분 여유를 두고 미리 갱신한다.
  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt - Date.now() < 60_000) {
    accessToken = await refreshAccessToken(supabase, userId, tokenRow.refresh_token);
    if (!accessToken) return null;
  }

  const params = new URLSearchParams({
    timeMin: `${startDate}T00:00:00+09:00`,
    timeMax: `${endDate}T23:59:59+09:00`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(`${EVENTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = await res.json();

  return (data.items ?? [])
    .map((item) => {
      // 종일 일정은 start.date(YYYY-MM-DD), 시간 일정은 start.dateTime 으로 온다.
      const allDay = Boolean(item.start?.date);
      const startValue = item.start?.date ?? item.start?.dateTime;
      if (!startValue) return null;

      return {
        id: item.id,
        date: allDay ? startValue : kstDateString(startValue),
        title: item.summary || "(제목 없음)",
        allDay,
        time: allDay ? null : kstTimeLabel(startValue),
      };
    })
    .filter(Boolean);
}
