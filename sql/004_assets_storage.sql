drop table if exists public.assets cascade;

create table public.assets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    nome text not null,
    conteudo_texto text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assets disable row level security;

notify pgrst, 'reload schema';
