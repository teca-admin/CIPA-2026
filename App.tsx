
import React, { useState, useEffect } from 'react';
import { ViewMode, Candidate, Vote } from './types';
import VotingScreen from './components/VotingScreen';
import Keypad from './components/Keypad';
import AdminDashboard from './components/AdminDashboard';
import { audioService } from './services/audioService';
import * as db from './services/supabase';
import { ShieldCheck, LogOut, Lock, LogIn, AlertCircle, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

const ADMIN_PASSWORD = 'wfsteca1';

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
  }, []);

  const handleNumberClick = (num: string) => {
    if (isVoted || isBranco || currentNumber.length >= 2) return;
    setCurrentNumber(prev => prev + num);
  };

  const handleCorrige = () => {
    if (isVoted) return;
    setCurrentNumber('');
    setIsBranco(false);
  };

  const handleConfirma = async () => {
    if (isVoted) return;
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
      }, 4000);
    } catch (err: any) {
      alert('Erro ao registrar voto: ' + (err.message || 'Falha na conexão'));
      setIsVoted(false);
    }
  };

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
      <button 
        onClick={handleAdminToggle}
        className="fixed top-4 right-4 z-50 p-3 bg-slate-400/20 hover:bg-slate-400/40 rounded-full transition-all text-slate-600"
        title="Portal Admin"
      >
        {viewMode === ViewMode.VOTING ? <SettingsIcon className="w-5 h-5" /> : <LogOut className="w-5 h-5 text-red-600" />}
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
                {/* Caixa de identificação aumentada em 40% (p-4 -> p-[22px], text-[9px] -> text-[13px]) e ano atualizado para 2026 */}
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
