
-- Script de configuração da Urna Eletrônica CIPA 2026
-- Este script configura a automação do fuso horário de Manaus diretamente no banco de dados.

-- 1. Tabela de Candidatos
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Votos com Automação de Fuso Horário
-- O uso de GENERATED ALWAYS AS (...) STORED garante que o cálculo seja automático em cada INSERT.
-- Não é necessário rodar SQL manualmente após a votação; o PostgreSQL faz isso em tempo real.
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_number TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Esta coluna é preenchida AUTOMATICAMENTE pelo banco de dados.
    -- Ela converte o UTC para o horário de Manaus (America/Manaus) no momento da inserção.
    timestamp_manaus TIMESTAMP GENERATED ALWAYS AS (timestamp AT TIME ZONE 'America/Manaus') STORED
);

-- 3. Limpeza de Políticas de Segurança (para ambiente de eleição simplificado)
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes DISABLE ROW LEVEL SECURITY;
