"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";

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
