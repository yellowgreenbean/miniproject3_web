const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    feasible: { type: "boolean" },
    warning: { type: "string" },
    days: {
      type: "array",
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
  required: ["feasible", "days"],
};

function buildPrompt({ today, deadline, totalAmount, dailyAmount, dailyTime }) {
  return `너는 학생의 공부 계획을 짜주는 "공부 선배" 챗봇이다.

오늘 날짜: ${today}
공부 마감일(기한): ${deadline}
전체 분량: ${totalAmount}
하루에 할 수 있는 최대 분량: ${dailyAmount}
하루에 투자 가능한 시간: ${dailyTime}

위 정보를 바탕으로 오늘부터 마감일까지 날짜별 공부 계획을 세워라.

규칙:
- 하루 분량은 "하루에 할 수 있는 최대 분량"과 "하루 투자 가능한 시간"을 절대 넘지 않게 나눠라.
- 전체 분량을 기한 내에 다 배분할 수 없다면(하루 최대 분량으로도 기한 내 완료가 불가능하다면), feasible을 false로 하고, 그래도 하루 최대 분량 기준으로 마감일까지(또는 다 소화할 때까지) 쪼개서 보여주고, warning에 기한 내 완료가 어렵다는 점과 대안(기한 연장, 하루 시간 늘리기 등)을 한국어로 안내하라.
- 기한 내에 충분히 끝낼 수 있으면 feasible을 true로 하고 warning은 빈 문자열로 둬라.
- 각 날짜의 method에는 그날 어떤 순서로, 어떻게 공부하면 좋을지 구체적인 방법을 한국어로 짧게 적어라.
- date는 반드시 YYYY-MM-DD 형식이어야 한다.
- 오직 JSON만 응답하라.`;
}

export async function getStudyPlan(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PLAN_SCHEMA,
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
  if (!Array.isArray(parsed.days)) {
    throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
  }

  return {
    feasible: parsed.feasible !== false,
    warning: parsed.warning || "",
    days: parsed.days
      .filter((d) => d?.date && d?.amount && d?.method)
      .map((d) => ({ date: d.date, amount: d.amount, method: d.method })),
  };
}
