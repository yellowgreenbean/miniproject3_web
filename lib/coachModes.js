import { COACH_TOPICS, CATCHUP_TOPICS } from "@/lib/coachTopics";

// 화면 3의 챗봇 옵션. 모드마다 대화 기록이 따로 쌓이고(study_chat_logs.mode),
// 주제 버튼과 첫 인사도 다르다. 한 스레드에 섞으면 "밀린 일 정리하자"와
// "목표가 뭐야?"가 번갈아 나와 문맥이 무너지기 때문에 갈라 둔다.
export const COACH_MODES = [
  {
    id: "coach",
    label: "공부 선배",
    topics: COACH_TOPICS,
    opening: "안녕! 나는 너의 공부 선배야 :) 요즘 어떤 시험이나 목표를 준비하고 있어?",
  },
  {
    id: "catchup",
    label: "밀린 할 일",
    topics: CATCHUP_TOPICS,
    opening:
      "못 끝낸 할 일을 같이 정리해보자! 며칠 전까지 거슬러 올라갈지 기간을 고르고 '밀린 할 일 모으기'를 눌러줘.",
  },
];

export const DEFAULT_MODE = "coach";
export const MODE_IDS = COACH_MODES.map((m) => m.id);

export function getMode(id) {
  return COACH_MODES.find((m) => m.id === id) ?? COACH_MODES[0];
}

// 밀린 할 일을 얼마나 거슬러 올라가 모을지. 오늘 것은 아직 밀린 게 아니므로
// 범위는 항상 어제까지로 끊는다.
export const RANGE_PRESETS = [3, 7, 14, 30];
export const DEFAULT_RANGE_DAYS = 7;
export const MIN_RANGE_DAYS = 1;
export const MAX_RANGE_DAYS = 90;

export function normalizeRangeDays(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_RANGE_DAYS;
  return Math.min(MAX_RANGE_DAYS, Math.max(MIN_RANGE_DAYS, n));
}
