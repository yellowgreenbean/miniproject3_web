"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/googleCalendar";

export async function login(formData) {
  const supabase = await createClient();
  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData) {
  const supabase = await createClient();
  const email = formData.get("email");
  const password = formData.get("password");

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect(`/signup?message=${encodeURIComponent("가입 확인 이메일을 보냈어요. 메일함을 확인해주세요.")}`);
}

// 로그인 화면의 "구글로 계속하기"와 달력 화면의 "연동하기"는 같은 동의 절차를
// 쓴다. 실패했을 때 돌아갈 화면만 달라서 그 부분만 인자로 받는다.
async function startGoogleOAuth(errorUrl) {
  const supabase = await createClient();
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${proto}://${host}/auth/callback`,
      scopes: GOOGLE_CALENDAR_SCOPE,
      // offline + consent 를 함께 줘야 refresh token 이 내려온다.
      // 이게 없으면 로그인 후 1시간만 캘린더가 보인다.
      // 재연동에서도 필수다. 이미 승인한 앱이면 구글이 동의 화면을 건너뛰면서
      // refresh token 을 다시 주지 않기 때문이다.
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data?.url) {
    redirect(errorUrl);
  }

  redirect(data.url);
}

export async function loginWithGoogle() {
  await startGoogleOAuth(
    `/login?error=${encodeURIComponent("구글 로그인을 시작하지 못했습니다.")}`
  );
}

// 달력 화면에서 구글 캘린더만 다시 붙일 때. 이미 로그인한 상태에서 눌러도
// 같은 구글 계정을 고르면 세션이 그대로 이어지고 토큰만 새로 받는다.
export async function linkGoogle() {
  await startGoogleOAuth(
    `/calendar?googleError=${encodeURIComponent("구글 연동을 시작하지 못했습니다.")}`
  );
}

export async function unlinkGoogle() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("google_tokens").delete().eq("user_id", user.id);
  revalidatePath("/calendar");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function addTodos(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = formData.get("content") || "";
  const items = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const date = formData.get("date") || todayISO();

  if (items.length === 0) {
    revalidatePath("/");
    return;
  }

  const { data: existing } = await supabase
    .from("todos")
    .select("priority")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("priority", { ascending: false })
    .limit(1);

  let nextPriority = (existing?.[0]?.priority ?? 0) + 1;

  const rows = items.map((content) => ({
    user_id: user.id,
    date,
    content,
    priority: nextPriority++,
    is_done: false,
  }));

  await supabase.from("todos").insert(rows);
  revalidatePath("/");
}

export async function toggleTodo(id, isDone) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("todos").update({ is_done: isDone }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/");
}

export async function reorderTodos(orderedIds) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("todos").update({ priority: index + 1 }).eq("id", id).eq("user_id", user.id)
    )
  );
  revalidatePath("/");
}

export async function addFriend(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = (formData.get("email") || "").trim();

  if (!email) {
    redirect("/calendar?friendError=이메일을 입력해주세요.");
  }

  if (email.toLowerCase() === user.email.toLowerCase()) {
    redirect(`/calendar?friendError=${encodeURIComponent("본인은 추가할 수 없습니다.")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    redirect(`/calendar?friendError=${encodeURIComponent("가입된 이메일을 찾을 수 없습니다.")}`);
  }

  const { error } = await supabase
    .from("friends")
    .insert({ owner_id: user.id, friend_id: profile.id });

  if (error && error.code !== "23505") {
    redirect(`/calendar?friendError=${encodeURIComponent("친구 추가에 실패했습니다.")}`);
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function removeFriend(friendRowId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("friends").delete().eq("id", friendRowId).eq("owner_id", user.id);
  revalidatePath("/calendar");
}

export async function saveDiary(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const date = formData.get("date") || todayISO();
  const content = (formData.get("content") || "").trim();

  const { data: existing } = await supabase
    .from("diaries")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (!content) {
    if (existing) {
      await supabase.from("diaries").delete().eq("id", existing.id);
    }
    revalidatePath("/calendar");
    return;
  }

  if (existing) {
    await supabase.from("diaries").update({ content }).eq("id", existing.id);
  } else {
    await supabase.from("diaries").insert({ user_id: user.id, date, content });
  }

  revalidatePath("/calendar");
}

export async function addStudyPlanTodo(date, content) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("todos")
    .select("priority")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("priority", { ascending: false })
    .limit(1);

  const nextPriority = (existing?.[0]?.priority ?? 0) + 1;

  await supabase.from("todos").insert({
    user_id: user.id,
    date,
    content,
    priority: nextPriority,
    is_done: false,
  });

  revalidatePath("/");
  revalidatePath("/calendar");
}
