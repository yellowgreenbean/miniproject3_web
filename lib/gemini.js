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
- planItems: 날짜별 학습 분량과 방법을 실제로 제시하는 턴에서만 [{date: YYYY-MM-DD, amount, method}] 배열로 채우고, 아직 제시할 단계가 아니면 null. 날짜는 today 이후로만 잡고, 하루 투자 가능 시간/분량을 넘기지 말 것. 기한 내 완료가 물리적으로 어려우면 그대로 쪼개어 제시하되 reply에서 어렵다는 점과 대안을 함께 안내할 것`;
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
    planItems: {
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
    },
  },
  required: ["reply"],
};

export async function getCoachReply({ history, message, context }) {
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
        systemInstruction: { parts: [{ text: buildSystemInstruction(context) }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: COACH_SCHEMA,
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

  return {
    reply: parsed.reply,
    goalUpdate: parsed.goalUpdate ?? null,
    planItems: Array.isArray(parsed.planItems)
      ? parsed.planItems.filter((d) => d?.date && d?.amount && d?.method)
      : null,
  };
}
