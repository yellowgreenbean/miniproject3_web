-- 화면 3 :: 공부 선배 챗봇용 테이블
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.

-- 1. 현재 목표 (온보딩으로 수집: 시험/목표 -> 마감일 -> 부담스러운 영역 -> 하루 투자 시간)
--    사용자당 1행만 유지하므로 user_id 를 PK 로 두고 upsert 로 갱신합니다.
create table if not exists public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subject text,
  deadline date,
  hard_area text,
  daily_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "goals are private to owner" on public.goals;
create policy "goals are private to owner"
  on public.goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. 대화 기록 (멀티턴 문맥 유지용)
--    설계 문서의 question/answer 대신 role/content 한 행 = 한 턴 구조를 사용합니다.
--    Gemini 의 contents 배열에 그대로 매핑되고, 턴 수가 홀수여도 깨지지 않습니다.
--    mode 는 챗봇 옵션('공부 선배' / '밀린 할 일 정리')입니다. 두 대화를 한 스레드에
--    섞으면 문맥이 무너지므로 같은 테이블에 넣되 모드로 갈라 읽습니다.
create table if not exists public.study_chat_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  mode text not null default 'coach' check (mode in ('coach', 'catchup')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 이미 테이블이 있는 프로젝트를 위한 추가 (기존 기록은 전부 'coach' 로 남습니다)
alter table public.study_chat_logs
  add column if not exists mode text not null default 'coach'
  check (mode in ('coach', 'catchup'));

-- 조회는 항상 "내 기록 중 이 모드의 최근 N턴" 이라 세 컬럼을 함께 태웁니다.
-- (기존 프로젝트에 남아 있는 study_chat_logs_user_id_idx 는 그대로 두어도 무방합니다)
create index if not exists study_chat_logs_user_mode_idx
  on public.study_chat_logs (user_id, mode, id desc);

alter table public.study_chat_logs enable row level security;

drop policy if exists "chat logs are private to owner" on public.study_chat_logs;
create policy "chat logs are private to owner"
  on public.study_chat_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
