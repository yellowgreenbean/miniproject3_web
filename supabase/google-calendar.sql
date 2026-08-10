-- 구글 캘린더 연동용 토큰 보관 테이블.
-- Supabase 는 로그인 순간에만 구글 토큰을 세션에 실어줄 뿐 저장하거나 갱신해주지
-- 않는다. 그래서 refresh token 을 직접 보관하고 만료 시 우리가 갱신한다.
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  -- 구글은 access_type=offline + prompt=consent 로 동의를 받은 첫 회에만
  -- refresh token 을 내려준다. 없으면 재로그인이 필요하다.
  refresh_token text,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

-- 토큰은 본인만 읽고 쓸 수 있어야 한다.
drop policy if exists "own google tokens" on public.google_tokens;
create policy "own google tokens"
  on public.google_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
