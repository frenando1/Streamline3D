-- Migration 005: Coleções de Assets (grupos de assets)
-- Adiciona suporte para agrupar assets em coleções personalizadas

create table if not exists public.colecoes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    nome text not null,
    descricao text default '',
    cor text default '#6C5CE7',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.colecao_assets (
    id uuid primary key default gen_random_uuid(),
    colecao_id uuid not null references public.colecoes(id) on delete cascade,
    asset_id uuid not null references public.assets(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(colecao_id, asset_id)
);

-- RLS: usuários só veem e manipulam suas próprias coleções
alter table public.colecoes enable row level security;
alter table public.colecao_assets enable row level security;

create policy "Usuários veem suas próprias coleções"
    on public.colecoes for select
    using (auth.uid() = user_id);

create policy "Usuários criam suas próprias coleções"
    on public.colecoes for insert
    with check (auth.uid() = user_id);

create policy "Usuários editam suas próprias coleções"
    on public.colecoes for update
    using (auth.uid() = user_id);

create policy "Usuários deletam suas próprias coleções"
    on public.colecoes for delete
    using (auth.uid() = user_id);

create policy "Usuários veem associações de suas coleções"
    on public.colecao_assets for select
    using (
        exists (
            select 1 from public.colecoes
            where id = colecao_id and user_id = auth.uid()
        )
    );

create policy "Usuários criam associações em suas coleções"
    on public.colecao_assets for insert
    with check (
        exists (
            select 1 from public.colecoes
            where id = colecao_id and user_id = auth.uid()
        )
    );

create policy "Usuários deletam associações de suas coleções"
    on public.colecao_assets for delete
    using (
        exists (
            select 1 from public.colecoes
            where id = colecao_id and user_id = auth.uid()
        )
    );

notify pgrst, 'reload schema';
