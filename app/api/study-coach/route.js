import { createClient } from "@/lib/supabase/server";
import { getCoachReply, getCatchupReply } from "@/lib/gemini";
import { todayISO, addDays, daysBetween, ISO_DATE_RE } from "@/lib/date";
import { DEFAULT_MODE, MODE_IDS, normalizeRangeDays } from "@/lib/coachModes";

// Gemini 응답이 길어질 수 있어 Vercel 기본 실행 시간(10초)보다 넉넉히 잡는다
export const maxDuration = 60;

const HISTORY_TURNS = 12;
// 밀린 목록이 아무리 길어도 프롬프트가 감당할 만큼만 넣는다.
const MAX_OVERDUE_ITEMS = 60;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message = (body?.message || "").trim();
  const mode = MODE_IDS.includes(body?.mode) ? body.mode : DEFAULT_MODE;

  if (!message) {
    return Response.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const today = todayISO();
  const diaryStart = addDays(today, -2);

  // 모드가 달라도 최근 일기·목표·대화 기록은 똑같이 필요하다.
  // 대화 기록만 모드별로 갈라 읽어 두 스레드가 서로를 오염시키지 않게 한다.
  const [{ data: diaryRows }, { data: goalRow }, { data: historyRows }] = await Promise.all([
    supabase
      .from("diaries")
      .select("date, content")
      .eq("user_id", user.id)
      .gte("date", diaryStart)
      .lte("date", today)
      .order("date", { ascending: true }),
    supabase
      .from("goals")
      .select("subject, deadline, hard_area, daily_time")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("study_chat_logs")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .order("id", { ascending: false })
      .limit(HISTORY_TURNS),
  ]);

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

  const result =
    mode === "catchup"
      ? await runCatchup({ supabase, user, body, today, history, message, diaryRows, currentGoal })
      : await runCoach({ supabase, user, today, history, message, diaryRows, currentGoal });

  if (result.error) {
    // 실패한 턴은 기록하지 않아 다음 대화의 문맥이 어긋나지 않게 한다
    return Response.json({ error: result.error }, { status: result.status });
  }

  // 한 번의 insert 로 두 턴을 넣어 id 순서(=대화 순서)가 보장되게 한다
  await supabase.from("study_chat_logs").insert([
    { user_id: user.id, role: "user", content: message, mode },
    { user_id: user.id, role: "assistant", content: result.reply, mode },
  ]);

  return Response.json({
    reply: result.reply,
    planItems: result.planItems,
    choices: result.choices,
    overdue: result.overdue ?? null,
  });
}

async function runCoach({ supabase, user, today, history, message, diaryRows, currentGoal }) {
  const todosStart = addDays(today, -6);

  const { data: todoRows } = await supabase
    .from("todos")
    .select("is_done")
    .eq("user_id", user.id)
    .gte("date", todosStart)
    .lte("date", today);

  const total = todoRows?.length ?? 0;
  const done = (todoRows ?? []).filter((t) => t.is_done).length;
  const completionRate = total === 0 ? null : Math.round((done / total) * 100);

  let result;
  try {
    result = await getCoachReply({
      history,
      message,
      context: { today, recentDiary: diaryRows ?? [], completionRate, currentGoal },
    });
  } catch {
    return { error: "잠시 후 다시 시도해주세요.", status: 500 };
  }

  if (result.goalUpdate) {
    const deadline =
      result.goalUpdate.deadline && ISO_DATE_RE.test(result.goalUpdate.deadline)
        ? result.goalUpdate.deadline
        : currentGoal?.deadline ?? null;

    await supabase.from("goals").upsert(
      {
        user_id: user.id,
        subject: result.goalUpdate.subject ?? currentGoal?.subject ?? null,
        deadline,
        hard_area: result.goalUpdate.hardArea ?? currentGoal?.hardArea ?? null,
        daily_time: result.goalUpdate.dailyTime ?? currentGoal?.dailyTime ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return result;
}

async function runCatchup({ supabase, user, body, today, history, message, diaryRows, currentGoal }) {
  const days = normalizeRangeDays(body?.days);
  // 오늘 할 일은 아직 밀린 게 아니므로 범위는 어제까지로 끊는다.
  const rangeFrom = addDays(today, -days);
  const rangeTo = addDays(today, -1);

  const { data: overdueRows } = await supabase
    .from("todos")
    .select("id, date, content")
    .eq("user_id", user.id)
    .eq("is_done", false)
    .gte("date", rangeFrom)
    .lte("date", rangeTo)
    .order("date", { ascending: true })
    .order("priority", { ascending: true })
    .limit(MAX_OVERDUE_ITEMS);

  const overdue = overdueRows ?? [];

  // 밀린 게 없으면 모델을 부를 이유가 없다. 없는 목록을 두고 계획을 지어내는 것도 막는다.
  if (overdue.length === 0) {
    return {
      reply: `${rangeFrom} ~ ${rangeTo} 사이에 못 끝낸 할 일이 하나도 없어! 밀린 것 없이 잘 따라오고 있다는 뜻이야 :) 기간을 더 넓혀서 다시 볼까?`,
      planItems: null,
      choices: null,
      overdue,
    };
  }

  let result;
  try {
    result = await getCatchupReply({
      history,
      message,
      context: {
        today,
        rangeFrom,
        rangeTo,
        overdue,
        recentDiary: diaryRows ?? [],
        currentGoal,
        dailyTime: currentGoal?.dailyTime ?? null,
      },
    });
  } catch {
    return { error: "잠시 후 다시 시도해주세요.", status: 500 };
  }

  return { ...result, overdue };
}
