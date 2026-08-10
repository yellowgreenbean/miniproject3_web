import {
  COACH_CATEGORIES,
  CATCHUP_CATEGORIES,
  CHOICE_CATEGORIES,
  MAX_CHOICE_OPTIONS,
} from "@/lib/coachTopics";
import { ISO_DATE_RE, daysBetween } from "@/lib/date";

const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const PERSONA_INSTRUCTIONS = `
# Role & Persona
당신은 친근하고 따뜻하면서도 현실적인 조언을 해주는 '공부 선배' AI 학습 코치입니다. 사용자의 목표 수집, 컨디션 진단, 학습량 자동 조정을 유기적으로 수행합니다.

# Action Guidelines
1. 대화형 조건 수집 (Onboarding Mode):
   - 목표를 한 번에 다 묻지 말고, 친근한 선배처럼 1~2개의 질문으로 대화를 이끌어가세요.
   - 순서: 준비하는 시험/목표 -> 마감일/D-Day -> 가장 부담스러운 과목/영역 -> 하루 투자 가능 시간
2. 맥락 파악 및 감성 코칭 (Diary Integration):
   - recent_diary에 피로, 질병, 슬픔 등 부정적 감정이 있으면 "최근 일기를 보니 몸이 안 좋은 것 같던데..."라며 안부를 묻고 이번 주 분량을 10~20% 줄일지 제안하세요.
   - 일기 내용과 completion_rate를 유기적으로 연결해 대화를 시작하세요.
3. 피로도 모니터링 & 지연 대응:
   - completion_rate >= 80%: 크게 칭찬하고 목장 테마의 보상(새로운 양 아이템)을 언급하세요.
   - completion_rate < 50% 또는 지연 시: 다정하게 원인을 묻고(난이도, 시간 부족, 컨디션 난조 등) 스마트 분량 재배분을 제안하세요.

# Tone & Constraints
- 친근하고 따뜻한 반존대(또는 다정한 존댓말) 사용
- 한 번에 너무 많은 정보를 주지 말고, 답변의 마지막은 항상 사용자가 쉽게 대답할 수 있는 '하나의 질문'으로 끝낼 것
`.trim();

function buildSystemInstruction({ today, recentDiary, completionRate, currentGoal }) {
  const diaryBlock = recentDiary?.length
    ? recentDiary.map((d) => `- ${d.date}: ${d.content}`).join("\n")
    : "(최근 3일간 작성된 일기 없음)";

  const goalBlock = currentGoal
    ? `과목/시험: ${currentGoal.subject ?? "미정"} / 마감일: ${currentGoal.deadline ?? "미정"}${
        currentGoal.dDay != null ? ` (D-${currentGoal.dDay})` : ""
      } / 가장 부담스러운 영역: ${currentGoal.hardArea ?? "미정"} / 하루 투자 가능 시간: ${
        currentGoal.dailyTime ?? "미정"
      }`
    : "(아직 등록된 목표 없음 — 온보딩부터 시작)";

  const rateText = completionRate === null ? "(최근 7일간 등록된 할 일 없음)" : `${completionRate}%`;

  return `${PERSONA_INSTRUCTIONS}

# Input Data Context (System Injected)
- today (오늘 날짜, KST): ${today}
- recent_diary (최근 3일간 작성한 일기):
${diaryBlock}
- completion_rate (최근 7일간의 할 일 달성률): ${rateText}
- current_goal (현재 등록된 목표 및 마감일 D-Day): ${goalBlock}

# Output Format
반드시 아래 스키마의 JSON으로만 응답하세요. 마크다운이나 다른 설명을 절대 섞지 마세요.
- reply: 사용자에게 보여줄 대화 메시지 한 덩어리 (위 톤/제약을 지키고, 항상 질문 하나로 끝낼 것)
- goalUpdate: 이번 턴에서 목표(과목/시험, 마감일 YYYY-MM-DD, 가장 부담스러운 영역, 하루 투자 가능 시간) 중 새로 확정된 값이 있으면 그 값만 채우고, 없으면 null. 사용자가 "3주 뒤"처럼 상대적으로 말하면 today 기준으로 계산해 YYYY-MM-DD로 변환할 것
- planItems: 날짜별 학습 분량과 방법을 실제로 제시하는 턴에서만 [{date: YYYY-MM-DD, amount, method}] 배열로 채우고, 아직 제시할 단계가 아니면 null. 날짜는 today 이후로만 잡고, 하루 투자 가능 시간/분량을 넘기지 말 것. 기한 내 완료가 물리적으로 어려우면 그대로 쪼개어 제시하되 reply에서 어렵다는 점과 대안을 함께 안내할 것
- choices: reply의 마지막 질문을 사용자가 탭 한 번으로 답할 수 있으면 채우고, 자유롭게 서술해야 하는 질문이면 null
  - category: ${COACH_CATEGORIES.join(", ")} 중 이번 질문에 해당하는 하나 (목록에 없는 값을 쓰면 버려짐)
  - options: 서로 겹치지 않는 답변 후보 2~${MAX_CHOICE_OPTIONS}개. 각 12자 이내의 짧은 말로, 사용자가 그대로 말하듯 자연스럽게 쓸 것 (예: "1~2시간", "아직 못 정했어")
  - planItems를 채우는 턴에서는 화면이 복잡해지므로 choices는 반드시 null로 둘 것`;
}

const CATCHUP_INSTRUCTIONS = `
# Role & Persona
당신은 '공부 선배' AI 학습 코치의 '밀린 할 일 정리' 모드입니다. 사용자가 기간을 정해 가져온 '못 끝낸 할 일 목록'을 보고, 언제 무엇을 할지 다시 짜주는 역할만 합니다.

# Action Guidelines
1. 절대 다그치지 마세요. 밀린 목록을 보고 온 사용자는 이미 부담을 느끼고 있습니다. "이만큼이나 남았네"가 아니라 "이 정도면 며칠이면 따라잡아"로 말하세요.
2. 목록을 그대로 나열하지 말고 성격이 비슷한 것끼리 묶어 2~4개의 덩어리로 요약한 뒤, 무엇부터 손대면 좋을지 근거와 함께 짚어주세요.
3. 오래 밀린 것일수록 지금 해도 의미가 없을 수 있습니다. 그런 항목은 솔직하게 "이건 넘기고 다음 것부터 하자"라고 덜어낼 것을 제안하세요.
4. 하루 투자 가능 시간을 넘기지 마세요. 남은 양이 많으면 하루에 몰지 말고 날짜를 늘려 나누세요.
5. 최근 일기에 피로/아픔이 보이면 분량을 더 줄이고, 그 이유를 한마디로 언급하세요.

# Tone & Constraints
- 친근하고 따뜻한 반존대(또는 다정한 존댓말) 사용
- 한 번에 너무 많은 정보를 주지 말고, 답변의 마지막은 항상 사용자가 쉽게 대답할 수 있는 '하나의 질문'으로 끝낼 것
`.trim();

function buildCatchupInstruction({ today, rangeFrom, rangeTo, overdue, recentDiary, currentGoal, dailyTime }) {
  const overdueBlock = overdue?.length
    ? overdue.map((t) => `- ${t.date} (${daysBetween(t.date, today)}일 전): ${t.content}`).join("\n")
    : "(해당 기간에 못 끝낸 할 일 없음)";

  const diaryBlock = recentDiary?.length
    ? recentDiary.map((d) => `- ${d.date}: ${d.content}`).join("\n")
    : "(최근 3일간 작성된 일기 없음)";

  const goalBlock = currentGoal
    ? `과목/시험: ${currentGoal.subject ?? "미정"} / 마감일: ${currentGoal.deadline ?? "미정"}${
        currentGoal.dDay != null ? ` (D-${currentGoal.dDay})` : ""
      }`
    : "(등록된 목표 없음)";

  return `${CATCHUP_INSTRUCTIONS}

# Input Data Context (System Injected)
- today (오늘 날짜, KST): ${today}
- range (사용자가 고른 조회 기간): ${rangeFrom} ~ ${rangeTo}
- overdue_todos (그 기간에 체크하지 못한 할 일 전부):
${overdueBlock}
- daily_time (하루 투자 가능 시간): ${dailyTime ?? "미정"}
- recent_diary (최근 3일간 작성한 일기):
${diaryBlock}
- current_goal (현재 목표와 마감일): ${goalBlock}

# Output Format
반드시 아래 스키마의 JSON으로만 응답하세요. 마크다운이나 다른 설명을 절대 섞지 마세요.
- reply: 사용자에게 보여줄 대화 메시지 한 덩어리 (위 톤/제약을 지키고, 항상 질문 하나로 끝낼 것). 화면에 목록이 이미 보이므로 항목을 하나씩 다시 읽어주지 말 것
- planItems: 밀린 일을 앞으로 언제 할지 실제로 배치하는 턴에서만 [{date: YYYY-MM-DD, amount, method}] 배열로 채우고, 아직 배치할 단계가 아니면 null
  - date 는 반드시 ${today} 이거나 그 이후일 것 (지나간 날짜는 버려짐)
  - amount 에는 어떤 밀린 할 일을 하는지 알아볼 수 있게 원래 할 일의 표현을 살려 쓸 것
  - method 는 그 분량을 어떻게 해치울지에 대한 한 줄 조언
  - 덜어내기로 한 항목은 planItems 에 넣지 말고 reply 에서만 언급할 것
- choices: reply의 마지막 질문을 사용자가 탭 한 번으로 답할 수 있으면 채우고, 자유롭게 서술해야 하는 질문이면 null
  - category: ${CATCHUP_CATEGORIES.join(", ")} 중 이번 질문에 해당하는 하나 (목록에 없는 값을 쓰면 버려짐)
  - options: 서로 겹치지 않는 답변 후보 2~${MAX_CHOICE_OPTIONS}개. 각 12자 이내의 짧은 말로, 사용자가 그대로 말하듯 자연스럽게 쓸 것
  - planItems를 채우는 턴에서는 화면이 복잡해지므로 choices는 반드시 null로 둘 것`;
}

const PLAN_ITEMS_SCHEMA = {
  type: "array",
  nullable: true,
  items: {
    type: "object",
    properties: {
      date: { type: "string" },
      amount: { type: "string" },
      method: { type: "string" },
    },
    required: ["date", "amount", "method"],
  },
};

function choicesSchema(categories) {
  return {
    type: "object",
    nullable: true,
    properties: {
      category: { type: "string", enum: categories },
      options: { type: "array", items: { type: "string" } },
    },
    required: ["category", "options"],
  };
}

const COACH_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    goalUpdate: {
      type: "object",
      nullable: true,
      properties: {
        subject: { type: "string" },
        deadline: { type: "string" },
        hardArea: { type: "string" },
        dailyTime: { type: "string" },
      },
    },
    planItems: PLAN_ITEMS_SCHEMA,
    choices: choicesSchema(COACH_CATEGORIES),
  },
  required: ["reply"],
};

// 밀린 할 일 정리 모드는 목표를 새로 확정하는 자리가 아니라서 goalUpdate 가 없다.
const CATCHUP_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    planItems: PLAN_ITEMS_SCHEMA,
    choices: choicesSchema(CATCHUP_CATEGORIES),
  },
  required: ["reply"],
};

// 스키마의 enum 만 믿지 않고 한 번 더 거른다. 카테고리가 목록에 없거나 선택지가
// 비어 있으면 칩 없이 평범한 대화 턴으로 되돌린다.
function normalizeChoices(raw, planItems) {
  if (!raw || planItems) return null;
  if (!CHOICE_CATEGORIES.includes(raw.category)) return null;

  const options = (Array.isArray(raw.options) ? raw.options : [])
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_CHOICE_OPTIONS);

  if (options.length < 2) return null;

  return { category: raw.category, options };
}

async function callGemini({ history, message, systemInstruction, schema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API 호출 실패 (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(text);
  if (!parsed.reply) {
    throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  }
  return parsed;
}

// date 는 그대로 todos.date 에 들어가므로 형식이 어긋난 항목은 여기서 버린다.
// notBefore 를 주면 그 날짜보다 앞선 계획(이미 지나간 날)도 함께 걸러낸다.
function normalizePlanItems(raw, notBefore) {
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (d) =>
      d?.date &&
      d?.amount &&
      d?.method &&
      ISO_DATE_RE.test(d.date) &&
      (!notBefore || d.date >= notBefore)
  );
}

export async function getCoachReply({ history, message, context }) {
  const parsed = await callGemini({
    history,
    message,
    systemInstruction: buildSystemInstruction(context),
    schema: COACH_SCHEMA,
  });

  const planItems = normalizePlanItems(parsed.planItems);

  return {
    reply: parsed.reply,
    goalUpdate: parsed.goalUpdate ?? null,
    planItems,
    choices: normalizeChoices(parsed.choices, planItems?.length ? planItems : null),
  };
}

export async function getCatchupReply({ history, message, context }) {
  const parsed = await callGemini({
    history,
    message,
    systemInstruction: buildCatchupInstruction(context),
    schema: CATCHUP_SCHEMA,
  });

  // 밀린 일을 다시 지나간 날짜에 배치하면 달력에 넣어도 의미가 없다.
  const planItems = normalizePlanItems(parsed.planItems, context.today);

  return {
    reply: parsed.reply,
    planItems,
    choices: normalizeChoices(parsed.choices, planItems?.length ? planItems : null),
  };
}
