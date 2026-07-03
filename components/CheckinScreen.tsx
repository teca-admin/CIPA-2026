
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Voter } from '../types.ts';
import * as db from '../services/supabase.ts';
import { Search, ShieldCheck, AlertCircle, RotateCcw, CheckCircle2, RefreshCw, ListChecks, X } from 'lucide-react';

type Step = 'search' | 'confirm' | 'signature' | 'success';

const CheckinScreen: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [matriculaInput, setMatriculaInput] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  const loadVoters = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await db.getVoters();
      setVoters(data);
    } catch (err: any) {
      setLoadError(err.message || 'Falha ao carregar a lista de presença.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVoters();
  }, [loadVoters]);

  const resetFlow = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    (screen.orientation as any)?.unlock?.();
    setStep('search');
    setQuery('');
    setSelectedVoter(null);
    setMatriculaInput('');
    setConfirmError(null);
    setSubmitError(null);
    loadVoters();
  }, [loadVoters]);

  const filteredVoters = query.trim().length >= 2
    ? voters.filter(v => v.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const handleSelectVoter = (voter: Voter) => {
    setSelectedVoter(voter);
    setMatriculaInput('');
    setConfirmError(null);
    setStep('confirm');
  };

  // Chamado a partir de um clique do usuário (form submit), por isso o navegador
  // ainda permite pedir tela cheia / travar orientação aqui.
  const enterSignatureFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    (screen.orientation as any)?.lock?.('landscape').catch(() => {});
  };

  const exitSignatureFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    (screen.orientation as any)?.unlock?.();
  };

  const handleConfirmMatricula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoter) return;

    if (selectedVoter.hasVoted) {
      setConfirmError('Esta matrícula já assinou a lista de presença.');
      return;
    }
    if (matriculaInput.trim() !== selectedVoter.matricula.trim()) {
      setConfirmError('Matrícula não confere. Tente novamente.');
      return;
    }
    setConfirmError(null);
    enterSignatureFullscreen();
    setStep('signature');
  };

  const handleCancelSignature = () => {
    exitSignatureFullscreen();
    setStep('confirm');
  };

  // --- Assinatura em canvas ---
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    hasSignatureRef.current = true;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
  };

  useEffect(() => {
    if (step !== 'signature') return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx?.scale(ratio, ratio);
      hasSignatureRef.current = false;
    };

    // Roda no próximo frame: entrar em fullscreen/travar orientação muda o
    // tamanho da tela um instante depois de renderizar o canvas.
    requestAnimationFrame(resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, [step]);

  const handleSubmitSignature = async () => {
    if (!selectedVoter || !hasSignatureRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const signatureBase64 = canvas.toDataURL('image/png');
      await db.confirmCheckin(selectedVoter.matricula, signatureBase64);
      setStep('success');
      setTimeout(resetFlow, 4000);
    } catch (err: any) {
      setSubmitError(err.message || 'Falha ao registrar presença.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xl max-w-md w-full border-t-4 border-red-500 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 mb-6 text-sm">{loadError}</p>
          <button onClick={loadVoters} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 uppercase text-sm">
            <RefreshCw className="w-4 h-4" /> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (step === 'signature' && selectedVoter) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col font-sans z-50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Assine Aqui</h1>
            <p className="text-slate-400 text-xs">{selectedVoter.name} • Matrícula {selectedVoter.matricula}</p>
          </div>
          <button onClick={handleCancelSignature} className="p-2 text-slate-400 hover:text-slate-700" title="Cancelar">
            <X className="w-6 h-6" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="flex-1 w-full bg-slate-50 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {submitError && (
          <p className="text-red-600 text-xs font-bold text-center flex items-center justify-center gap-1 py-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" /> {submitError}
          </p>
        )}

        <div className="flex gap-3 p-4 shrink-0 border-t border-slate-100">
          <button
            onClick={clearSignature}
            className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-lg hover:bg-slate-200 transition-colors text-sm uppercase flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Limpar
          </button>
          <button
            onClick={handleSubmitSignature}
            disabled={isSubmitting}
            className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm uppercase disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar Assinatura'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-8 text-center border-2 border-slate-300 p-[18px] bg-white/60 rounded-sm">
        <div className="text-slate-500 text-[13px] font-bold uppercase tracking-[0.2em]">Lista de Presença • CIPA Digital</div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-lg w-full border-t-8 border-indigo-600">
        {step === 'search' && (
          <>
            <div className="text-center mb-6">
              <ListChecks className="w-10 h-10 mx-auto text-indigo-600 mb-2" />
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Confirmar Presença</h1>
              <p className="text-slate-400 text-xs mt-1">Digite seu nome para localizar seu cadastro</p>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome completo"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-lg outline-none focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            {query.trim().length >= 2 && (
              <div className="space-y-2 max-h-64 overflow-auto">
                {filteredVoters.length > 0 ? filteredVoters.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVoter(v)}
                    className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-700 text-sm">{v.name}</span>
                    {v.hasVoted && <span className="text-[9px] font-black text-emerald-600 uppercase">Já Assinou</span>}
                  </button>
                )) : (
                  <p className="text-center text-slate-400 text-xs py-4">Nenhum nome encontrado.</p>
                )}
              </div>
            )}
          </>
        )}

        {step === 'confirm' && selectedVoter && (
          <>
            <div className="text-center mb-6">
              <ShieldCheck className="w-10 h-10 mx-auto text-indigo-600 mb-2" />
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{selectedVoter.name}</h1>
              <p className="text-slate-400 text-xs mt-1">Digite sua matrícula para confirmar que é você</p>
            </div>
            <form onSubmit={handleConfirmMatricula} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={matriculaInput}
                onChange={(e) => setMatriculaInput(e.target.value)}
                placeholder="MATRÍCULA"
                className={`w-full px-4 py-4 bg-slate-50 border-2 ${confirmError ? 'border-red-400' : 'border-slate-100'} rounded-lg font-mono text-center text-xl outline-none focus:border-indigo-500 transition-all`}
              />
              {confirmError && (
                <p className="text-red-600 text-xs font-bold text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {confirmError}
                </p>
              )}
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-lg hover:bg-indigo-700 transition-colors uppercase text-sm">
                Confirmar
              </button>
              <button type="button" onClick={resetFlow} className="w-full text-slate-400 font-bold py-2 text-xs uppercase">
                Não sou eu, voltar
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Presença Confirmada</h1>
            <p className="text-slate-500 text-sm">Dirija-se ao computador de votação para registrar seu voto.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinScreen;
