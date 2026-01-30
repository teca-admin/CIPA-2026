
-- Script de configuração atualizado para a Urna Eletrônica CIPA 2026

-- 1. Tabela de Candidatos
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos
-- CORREÇÃO: timestamp AT TIME ZONE 'America/Manaus' converte o UTC para o horário local (subtraindo 4h)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_number TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    -- Coluna gerada que agora subtrai corretamente as horas para o fuso de Manaus
    timestamp_manaus TIMESTAMP GENERATED ALWAYS AS (timestamp AT TIME ZONE 'America/Manaus') STORED
);

-- 3. Políticas de Segurança
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes DISABLE ROW LEVEL SECURITY;
