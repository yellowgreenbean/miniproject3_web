import { createClient } from "@/lib/supabase/server";
import { getCoachReply } from "@/lib/gemini";
import { todayISO, addDays } from "@/lib/date";

// Gemini 응답이 길어질 수 있어 Vercel 기본 실행 시간(10초)보다 넉넉히 잡는다
export const maxDuration = 60;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_TURNS = 12;

function daysBetween(fromISO, toISO) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message = (body?.message || "").trim();

  if (!message) {
    return Response.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const today = todayISO();
  const diaryStart = addDays(today, -2);
  const todosStart = addDays(today, -6);

  // 시스템이 주입할 실시간 컨텍스트를 한 번에 조회
  const [{ data: diaryRows }, { data: todoRows }, { data: goalRow }, { data: historyRows }] =
    await Promise.all([
      supabase
        .from("diaries")
        .select("date, content")
        .eq("user_id", user.id)
        .gte("date", diaryStart)
        .lte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("todos")
        .select("is_done")
        .eq("user_id", user.id)
        .gte("date", todosStart)
        .lte("date", today),
      supabase
        .from("goals")
        .select("subject, deadline, hard_area, daily_time")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("study_chat_logs")
        .select("role, content")
        .eq("user_id", user.id)
        .order("id", { ascending: false })
        .limit(HISTORY_TURNS),
    ]);

  const total = todoRows?.length ?? 0;
  const done = (todoRows ?? []).filter((t) => t.is_done).length;
  const completionRate = total === 0 ? null : Math.round((done / total) * 100);

  const currentGoal = goalRow
    ? {
        subject: goalRow.subject,
        deadline: goalRow.deadline,
        hardArea: goalRow.hard_area,
        dailyTime: goalRow.daily_time,
        dDay: goalRow.deadline ? daysBetween(today, goalRow.deadline) : null,
      }
    : null;

  const history = (historyRows ?? []).slice().reverse();

  let result;
  try {
    result = await getCoachReply({
      history,
      message,
      context: { today, recentDiary: diaryRows ?? [], completionRate, currentGoal },
    });
  } catch {
    // 실패한 턴은 기록하지 않아 다음 대화의 문맥이 어긋나지 않게 한다
    return Response.json({ error: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  if (result.goalUpdate) {
    const deadline =
      result.goalUpdate.deadline && ISO_DATE_RE.test(result.goalUpdate.deadline)
        ? result.goalUpdate.deadline
        : goalRow?.deadline ?? null;

    await supabase.from("goals").upsert(
      {
        user_id: user.id,
        subject: result.goalUpdate.subject ?? goalRow?.subject ?? null,
        deadline,
        hard_area: result.goalUpdate.hardArea ?? goalRow?.hard_area ?? null,
        daily_time: result.goalUpdate.dailyTime ?? goalRow?.daily_time ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  // 한 번의 insert 로 두 턴을 넣어 id 순서(=대화 순서)가 보장되게 한다
  await supabase.from("study_chat_logs").insert([
    { user_id: user.id, role: "user", content: message },
    { user_id: user.id, role: "assistant", content: result.reply },
  ]);

  return Response.json({ reply: result.reply, planItems: result.planItems });
}
