
-- Script de configuração para a Urna Eletrônica CIPA 2026

-- 1. Tabela de Candidatos
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_number TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Políticas de Segurança (Simplificado para Urna Local/Interna)
-- Desabilita RLS para permitir que a aplicação web gerencie os dados diretamente
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes DISABLE ROW LEVEL SECURITY;
