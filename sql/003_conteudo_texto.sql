-- Remove a tabela antiga e limpa qualquer vestígio para evitar conflito de colunas
DROP TABLE IF EXISTS public.assets CASCADE;

-- Cria a tabela assets com a coluna correta baseada no sistema de texto estruturado
CREATE TABLE public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    conteudo_texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Desativa as restrições do RLS temporariamente para facilitar os testes locais
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;

-- Força o recarregamento total do Schema Cache do PostgREST
NOTIFY pgrst, 'reload schema';
