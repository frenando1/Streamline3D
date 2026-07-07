-- =====================================================
-- Fix: profiles schema + seed do usuário existente
-- =====================================================

-- 1. Tornar email e password_hash opcionais (OAuth não os preenche)
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Criar perfil do usuário que já logou via Google
INSERT INTO public.profiles (id, name, email)
VALUES ('76dd8dc6-e1c1-4966-81b2-5166f95d981e', 'John', 'johnmarschallfernandomartins@gmail.com')
ON CONFLICT (id) DO NOTHING;
