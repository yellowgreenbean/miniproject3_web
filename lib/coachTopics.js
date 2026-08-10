// 코치 대화의 카테고리는 코드에서 고정한다. 모델은 이 목록 중 하나를 고르기만 하고,
// 질문과 선택지 문구는 그때그때 생성한다. 서버가 목록에 없는 값을 걸러내므로
// UI 는 항상 아래 다섯 가지 중 하나만 만나게 된다.
export const COACH_CATEGORIES = ["목표설정", "컨디션", "시간관리", "복습전략", "슬럼프"];

// 밀린 할 일 정리 모드는 목표를 새로 세우는 자리가 아니라 이미 쌓인 일을
// 언제 어떻게 나눠 할지 정하는 자리라 카테고리 목록이 다르다.
export const CATCHUP_CATEGORIES = ["우선순위", "시간관리", "컨디션", "슬럼프"];

// 서버가 선택지를 거를 때 쓰는 전체 목록. 두 모드의 합집합이라 색 정의(globals.css)도
// 이 목록만 채우면 된다.
export const CHOICE_CATEGORIES = [...new Set([...COACH_CATEGORIES, ...CATCHUP_CATEGORIES])];

export const MAX_CHOICE_OPTIONS = 4;

// 사용자가 먼저 말을 걸 때 쓰는 주제 버튼. category 는 위 목록과 같은 값을 써서
// 칩과 주제 버튼이 같은 색 체계를 공유하게 한다.
export const COACH_TOPICS = [
  {
    category: "목표설정",
    label: "계획 짜줘",
    message: "지금 내 목표에 맞춰서 날짜별 공부 계획을 짜줘.",
  },
  {
    category: "컨디션",
    label: "요즘 힘들어",
    message: "요즘 컨디션이 좋지 않아. 분량을 어떻게 조절하면 좋을까?",
  },
  {
    category: "시간관리",
    label: "시간이 부족해",
    message: "공부할 시간이 부족한데 하루를 어떻게 쪼개 쓰면 좋을까?",
  },
  {
    category: "복습전략",
    label: "복습법 알려줘",
    message: "배운 걸 잘 잊어버려. 복습은 어떤 식으로 하는 게 좋을까?",
  },
  {
    category: "슬럼프",
    label: "의욕이 없어",
    message: "요즘 의욕이 안 생겨서 손이 안 잡혀. 어떻게 다시 시작하면 좋을까?",
  },
];

// 밀린 할 일 정리 모드의 주제 버튼. 이미 모아둔 목록을 어떻게 다룰지 묻는 말들이라
// 기간을 고르고 한 번 모은 뒤에 눌러야 자연스럽다.
export const CATCHUP_TOPICS = [
  {
    category: "우선순위",
    label: "뭐부터 할까",
    message: "밀린 할 일 중에서 뭐부터 해야 할지 순서를 정해줘.",
  },
  {
    category: "시간관리",
    label: "주말에 몰아서",
    message: "평일에는 시간이 거의 없어. 주말에 몰아서 하도록 다시 나눠줄 수 있어?",
  },
  {
    category: "컨디션",
    label: "양이 너무 많아",
    message: "밀린 게 너무 많아서 엄두가 안 나. 하루 분량을 더 줄여서 잡아줘.",
  },
  {
    category: "슬럼프",
    label: "버릴 건 버리기",
    message: "지금 와서 해도 의미 없는 건 과감히 버리고 싶어. 어떤 걸 놓아주면 좋을까?",
  },
];
