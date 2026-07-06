
import { createClient } from '@supabase/supabase-js';
import { Candidate, Vote, Voter } from '../types.ts';

const SUPABASE_URL = 'https://uvsmybibogezodlnazrp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c215Ymlib2dlem9kbG5henJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwODE2NDIsImV4cCI6MjA5ODY1NzY0Mn0.TZtgmjqTDbV4TRfeLujgIp11Z5pvDFw6bMqLbrQie-U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getCandidates = async (): Promise<Candidate[]> => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      number: item.number,
      photoUrl: item.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    }));
  } catch (error: any) {
    console.error('Erro ao buscar candidatos:', error);
    throw new Error(`Erro de Banco: ${error.message}`);
  }
};

export const saveCandidate = async (candidate: Omit<Candidate, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .insert([{ 
        name: candidate.name, 
        number: candidate.number, 
        photo_url: candidate.photoUrl 
      }])
      .select();
    
    if (error) throw error;
    return data ? data[0] : null;
  } catch (error: any) {
    console.error('Erro ao salvar candidato:', error);
    throw new Error(`Erro ao salvar: ${error.message}`);
  }
};

export const removeCandidate = async (id: string) => {
  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
};

export const getVotes = async (): Promise<Vote[]> => {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('id, candidate_number, timestamp, timestamp_manaus');
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      candidateNumber: item.candidate_number,
      timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
      timestampManaus: item.timestamp_manaus
    }));
  } catch (error: any) {
    console.error('Erro ao buscar votos:', error);
    throw new Error(`Erro de Banco: ${error.message}`);
  }
};

export const saveVote = async (candidateNumber: string) => {
  const { error } = await supabase
    .from('votes')
    .insert([{ candidate_number: candidateNumber }]);
  
  if (error) {
    console.error('Erro ao votar:', error);
    throw new Error(error.message);
  }
};

export const clearAllVotes = async () => {
  const { error } = await supabase
    .from('votes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Erro ao resetar votos:', error);
    throw new Error(error.message);
  }
};

// --- Lista de Presença (Check-in) ---
// Fica em tabela própria, sem nenhum vínculo com votes: garante que sabemos quem
// compareceu sem nunca sabermos em quem essa pessoa votou.

export const getVoters = async (): Promise<Voter[]> => {
  try {
    const { data, error } = await supabase
      .from('voters')
      .select('id, matricula, name, has_voted, signed_at')
      .order('name');

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      matricula: item.matricula,
      name: item.name,
      hasVoted: item.has_voted,
      signedAt: item.signed_at ? new Date(item.signed_at).getTime() : null
    }));
  } catch (error: any) {
    console.error('Erro ao buscar lista de presença:', error);
    throw new Error(`Erro de Banco: ${error.message}`);
  }
};

// Busca a lista completa (assinado ou não) com a imagem da assinatura, só sob
// demanda (gerar o relatório em PDF), não no carregamento normal do painel:
// com milhares de colaboradores, as imagens em base64 deixariam a lista lenta
// pra carregar à toa.
export const getVotersWithSignatures = async (): Promise<Voter[]> => {
  try {
    const { data, error } = await supabase
      .from('voters')
      .select('id, matricula, name, has_voted, signed_at, signature')
      .order('name');

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      matricula: item.matricula,
      name: item.name,
      hasVoted: item.has_voted,
      signedAt: item.signed_at ? new Date(item.signed_at).getTime() : null,
      signature: item.signature
    }));
  } catch (error: any) {
    console.error('Erro ao buscar assinaturas:', error);
    throw new Error(`Erro de Banco: ${error.message}`);
  }
};

export const importVoters = async (rows: { matricula: string; name: string }[]) => {
  const { error } = await supabase
    .from('voters')
    .upsert(rows, { onConflict: 'matricula' });

  if (error) {
    console.error('Erro ao importar lista de presença:', error);
    throw new Error(error.message);
  }
};

// Confirma o check-in de forma atômica: só marca has_voted se ainda não tiver assinado.
// Se outra estação já tiver confirmado essa matrícula um instante antes, retorna 0 linhas
// e tratamos como "já assinou" em vez de deixar assinar duas vezes.
export const confirmCheckin = async (matricula: string, signature: string) => {
  const { data, error } = await supabase
    .from('voters')
    .update({ has_voted: true, signature, signed_at: new Date().toISOString() })
    .eq('matricula', matricula)
    .eq('has_voted', false)
    .select('id, matricula, name');

  if (error) {
    console.error('Erro ao confirmar presença:', error);
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Esta matrícula já assinou a lista de presença.');
  }
  return data[0];
};
