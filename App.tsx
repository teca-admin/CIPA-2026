
import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, Candidate, Vote } from './types.ts';
import VotingScreen from './components/VotingScreen.tsx';
import Keypad from './components/Keypad.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { audioService } from './services/audioService.ts';
import * as db from './services/supabase.ts';
import { ShieldCheck, LogOut, Lock, LogIn, AlertCircle, RefreshCw, Settings as SettingsIcon, Ban, Clock } from 'lucide-react';

const ADMIN_PASSWORD = 'wfsteca1';

/** 
 * CONFIGURAÇÃO DE ENCERRAMENTO (MANAUS UTC-4)
 * TESTE: '2026-01-30T16:00:00-04:00' (Hoje às 16h)
 * OFICIAL: '2026-01-31T00:00:00-04:00' (Hoje às 00h / Início de amanhã)
 */
const ELECTION_DEADLINE = new Date('2026-01-30T16:00:00-04:00').getTime();

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.VOTING);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [currentNumber, setCurrentNumber] = useState('');
  const [isBranco, setIsBranco] = useState(false);
  const [isVoted, setIsVoted] = useState(false);
  const [isElectionClosed, setIsElectionClosed] = useState(Date.now() >= ELECTION_DEADLINE);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const [fetchedCandidates, fetchedVotes] = await Promise.all([
        db.getCandidates(),
        db.getVotes()
      ]);
      setCandidates(fetchedCandidates);
      setVotes(fetchedVotes);
    } catch (err: any) {
      console.error('Erro na carga:', err);
      setErrorMessage(err.message || 'Falha na conexão com o banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Intervalo de verificação em tempo real
    const interval = setInterval(() => {
      // 1. Atualiza dados se estiver no admin
      if (viewMode === ViewMode.ADMIN) loadData();
      
      // 2. VERIFICAÇÃO AUTOMÁTICA DA TRAVA (SEM REFRESH)
      const now = Date.now();
      if (now >= ELECTION_DEADLINE && !isElectionClosed) {
        setIsElectionClosed(true);
        // Se estiver votando, limpa os campos para segurança
        if (viewMode === ViewMode.VOTING) {
           setCurrentNumber('');
           setIsBranco(false);
        }
      }
    }, 1000); // Checa a cada 1 segundo para ser exato

    return () => clearInterval(interval);
  }, [viewMode, isElectionClosed]);

  const handleNumberClick = useCallback((num: string) => {
    if (isElectionClosed || isVoted || isBranco || currentNumber.length >= 2) return;
    audioService.playBeep();
    setCurrentNumber(prev => prev + num);
  }, [isVoted, isBranco, currentNumber.length, isElectionClosed]);

  const handleCorrige = useCallback(() => {
    if (isVoted || isElectionClosed) return;
    audioService.playBeep();
    setCurrentNumber('');
    setIsBranco(false);
  }, [isVoted, isElectionClosed]);

  const handleConfirma = useCallback(async () => {
    if (isVoted || isElectionClosed) return;
    const foundCandidate = candidates.find(c => c.number === currentNumber);
    if (!foundCandidate) {
      audioService.playBeep();
      return;
    }
    try {
      audioService.playConfirm();
      setIsVoted(true);
      await db.saveVote(foundCandidate.number);
      loadData();
      
      setTimeout(() => {
        setIsVoted(false);
        setCurrentNumber('');
        setIsBranco(false);
      }, 1000);
    } catch (err: any) {
      alert('Erro ao registrar voto: ' + (err.message || 'Falha na conexão'));
      setIsVoted(false);
    }
  }, [isVoted, candidates, currentNumber, isElectionClosed]);

  // Listener para teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== ViewMode.VOTING || showLogin || isLoading || !!errorMessage || isVoted || isElectionClosed) return;

      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        handleNumberClick(key);
      } else if (key === 'Enter') {
        handleConfirma();
      } else if (key === 'Backspace' || key === 'Delete' || key === 'Escape') {
        handleCorrige();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, showLogin, isLoading, errorMessage, isVoted, handleNumberClick, handleConfirma, handleCorrige, isElectionClosed]);

  const addCandidate = async (c: Omit<Candidate, 'id'>) => {
    try {
      await db.saveCandidate(c);
      loadData();
    } catch (err: any) {
      alert('Erro ao adicionar: ' + err.message);
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      await db.removeCandidate(id);
      loadData();
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  const resetVotes = async () => {
    try {
      await db.clearAllVotes();
      loadData();
    } catch (err: any) {
      alert('Erro ao zerar: ' + err.message);
    }
  };

  const handleAdminToggle = () => {
    if (viewMode === ViewMode.ADMIN) {
      setViewMode(ViewMode.VOTING);
      setIsAdminAuthenticated(false);
      setShowLogin(false);
    } else {
      if (isAdminAuthenticated) {
        setViewMode(ViewMode.ADMIN);
      } else {
        setShowLogin(true);
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setShowLogin(false);
      setViewMode(ViewMode.ADMIN);
      setPasswordInput('');
      setLoginError(false);
      loadData();
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const selectedCandidate = candidates.find(c => c.number === currentNumber) || null;
  const isNulo = currentNumber.length === 2 && !selectedCandidate;

  // TELA DE TRAVA (ELEIÇÃO ENCERRADA)
  if (isElectionClosed && !isAdminAuthenticated && !showLogin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-12 rounded-xl shadow-2xl max-w-lg w-full text-center border-t-8 border-red-600 animate-in fade-in zoom-in duration-500">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Eleição Finalizada</h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            O período oficial de votação da CIPA 2026 chegou ao fim.<br/>
            <strong>Nenhum novo voto poderá ser computado.</strong>
          </p>
          
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 mb-8">
            <div className="flex items-center gap-3 text-slate-400 mb-4 justify-center">
               <Lock className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Painel de Auditoria Restrito</span>
            </div>
            <button 
              onClick={() => setShowLogin(true)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <LogIn className="w-5 h-5" /> ACESSAR APURAÇÃO
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Fuso Horário: Manaus (UTC-4)</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded border border-slate-200 shadow-xl max-w-md w-full border-t-4 border-red-500">
          <div className="flex items-center gap-3 text-red-600 mb-4 font-black">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-xl uppercase">Falha do Sistema</h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm font-mono">{errorMessage}</p>
          <button onClick={loadData} className="w-full bg-slate-900 text-white font-bold py-3 rounded flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> REINICIAR URNA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans ${viewMode === ViewMode.ADMIN ? 'bg-[#f8fafc]' : 'bg-[#d1d5db]'}`}>
      {/* Botão invisível/discreto para admin */}
      <button 
        onClick={handleAdminToggle}
        className="fixed top-4 right-4 z-50 p-3 bg-slate-400/10 hover:bg-slate-400/30 rounded-full transition-all text-slate-600/50"
        title="Portal Admin"
      >
        {viewMode === ViewMode.VOTING ? <SettingsIcon className="w-4 h-4" /> : <LogOut className="w-5 h-5 text-red-600" />}
      </button>

      <main className={`flex-1 flex ${viewMode === ViewMode.ADMIN ? 'block' : 'items-center justify-center p-4'}`}>
        {showLogin ? (
          <div className="bg-white p-10 rounded border border-slate-200 shadow-2xl w-full max-w-sm border-t-8 border-slate-900 animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-8">
              <Lock className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tighter">Portal do Mesário</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="SENHA"
                autoFocus
                className={`w-full px-4 py-4 bg-slate-50 border-2 ${loginError ? 'border-red-500' : 'border-slate-100'} rounded font-mono text-center text-2xl outline-none focus:border-slate-900 transition-all`}
              />
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded hover:bg-slate-800 transition-colors uppercase text-sm">Validar Acesso</button>
              <button type="button" onClick={() => setShowLogin(false)} className="w-full text-slate-400 font-bold py-2 text-xs uppercase">Cancelar</button>
            </form>
          </div>
        ) : viewMode === ViewMode.VOTING ? (
          <div className="urna-plastic p-8 lg:p-12 rounded flex flex-col items-center max-w-6xl w-full border-b-[6px] border-r-[4px] border-gray-400">
            <div className="w-full flex flex-col lg:flex-row gap-12 items-center lg:items-start">
              <div className="flex-1 w-full h-[480px] lg:h-[500px]">
                <VotingScreen number={currentNumber} candidate={selectedCandidate} isBranco={isBranco} isNulo={isNulo} isVoted={isVoted} />
              </div>
              <div className="flex flex-col items-center lg:pt-8">
                <div className="mb-8 text-center border-2 border-gray-400 p-[22px] bg-gray-200/50 rounded-sm">
                   <div className="text-gray-500 text-[13px] font-bold uppercase tracking-[0.2em]">CIPA 2026</div>
                </div>
                <Keypad onNumberClick={handleNumberClick} onBranco={() => {}} onCorrige={handleCorrige} onConfirma={handleConfirma} />
                <div className="mt-8 flex gap-4 opacity-30 grayscale">
                    <ShieldCheck className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full animate-in fade-in duration-300">
            <AdminDashboard 
              candidates={candidates} 
              votes={votes} 
              onAddCandidate={addCandidate} 
              onDeleteCandidate={deleteCandidate} 
              onResetVotes={resetVotes}
            />
          </div>
        )}
      </main>
      
      {viewMode === ViewMode.VOTING && (
        <footer className="p-2 text-center text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">
          Ambiente de Votação Seguro • CIPA
        </footer>
      )}
    </div>
  );
};

export default App;
