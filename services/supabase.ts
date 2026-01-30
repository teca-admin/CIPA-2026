
import { createClient } from '@supabase/supabase-js';
import { Candidate, Vote } from '../types.ts';

const SUPABASE_URL = 'https://hxwiuxpqvowahmcfnreg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4d2l1eHBxdm93YWhtY2ZucmVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDg0MDMsImV4cCI6MjA4NDQ4NDQwM30.Z3l4vSAhLHmyZE-ZUfBZ69Qh-agfiu7ePjjzziw_36Y';

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
