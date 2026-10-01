create extension if not exists pgcrypto;
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 120), category text not null default 'Lainnya', kind text not null check (kind in ('income','expense')),
 amount numeric(14,0) not null check (amount > 0), occurred_on date not null default current_date, created_at timestamptz not null default now()
);
create table if not exists public.monthly_budgets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'), category text not null, limit_amount numeric(14,0) not null check (limit_amount > 0), color text not null default '#78907b', unique(user_id,period_key,category)
);
create table if not exists public.savings_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 100), target_amount numeric(14,0) not null check (target_amount > 0), target_date date, created_at timestamptz not null default now(), unique(id,user_id)
);
create table if not exists public.savings_contributions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 goal_id uuid not null, amount numeric(14,0) not null check (amount > 0), created_at timestamptz not null default now(),
 foreign key(goal_id,user_id) references public.savings_goals(id,user_id) on delete cascade
);
revoke all on public.transactions, public.monthly_budgets, public.savings_goals, public.savings_contributions from anon;
grant select,insert,update,delete on public.transactions, public.monthly_budgets, public.savings_goals, public.savings_contributions to authenticated;
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
drop policy if exists "own_transactions" on public.transactions;
create policy "own_transactions" on public.transactions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "own_budgets" on public.monthly_budgets;
create policy "own_budgets" on public.monthly_budgets for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "own_goals" on public.savings_goals;
create policy "own_goals" on public.savings_goals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "own_contributions" on public.savings_contributions;
create policy "own_contributions" on public.savings_contributions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());


