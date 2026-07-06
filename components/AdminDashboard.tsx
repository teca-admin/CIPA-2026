
import React, { useState, useRef, useEffect } from 'react';
import { Candidate, Vote, Voter } from '../types.ts';
import { Trash2, Plus, Users, Vote as VoteIcon, LayoutDashboard, Settings, Image as ImageIcon, Upload, X, CheckCircle2, AlertTriangle, FileText, BarChart3, TrendingUp, History, Clock, FileSpreadsheet, Download, Ban, LogOut, ClipboardPaste, UserCheck, Link2, Copy, Check } from 'lucide-react';
import { sanitizeImageUrl } from '../utils/urlHelper.ts';
import * as db from '../services/supabase.ts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface AdminDashboardProps {
  candidates: Candidate[];
  votes: Vote[];
  onAddCandidate: (c: Omit<Candidate, 'id'>) => void;
  onDeleteCandidate: (id: string) => void;
  onResetVotes: () => void;
  onLogout: () => void;
}

const FALLBACK_PHOTO = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  candidates,
  votes,
  onAddCandidate,
  onDeleteCandidate,
  onResetVotes,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'register' | 'logs' | 'attendance'>('results');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPhotoBase64, setNewPhotoBase64] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<{ matricula: string; name: string }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin`;

  const handleCopyCheckinUrl = () => {
    navigator.clipboard.writeText(checkinUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const loadVoters = async () => {
    try {
      setIsLoadingVoters(true);
      setVoters(await db.getVoters());
    } catch (err: any) {
      console.error('Erro ao buscar lista de presença:', err);
    } finally {
      setIsLoadingVoters(false);
    }
  };

  useEffect(() => {
    loadVoters();
  }, []);

  // Aceita colar direto do Excel (colunas separadas por tab, vírgula ou ponto-e-vírgula).
  // Detecta automaticamente qual coluna é a matrícula (numérica) e qual é o nome.
  const handleParsePaste = () => {
    setParseError(null);
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
    const rows: { matricula: string; name: string }[] = [];

    for (const line of lines) {
      const parts = line.split(/\t|,|;/).map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      const [first, second] = parts;
      const firstIsNumeric = /^\d+$/.test(first.replace(/\D/g, '')) && /\d/.test(first);
      const matricula = firstIsNumeric ? first : second;
      const name = firstIsNumeric ? second : first;
      if (matricula && name) rows.push({ matricula, name });
    }

    if (rows.length === 0) {
      setParseError('Não consegui identificar linhas válidas. Cada linha precisa ter matrícula e nome separados por tab, vírgula ou ponto-e-vírgula.');
      setParsedRows([]);
      return;
    }
    setParsedRows(rows);
  };

  const handleImportVoters = async () => {
    if (parsedRows.length === 0) return;
    try {
      setIsImporting(true);
      setParseError(null);
      await db.importVoters(parsedRows);
      setImportSuccess(`${parsedRows.length} colaborador(es) importado(s) com sucesso.`);
      setPasteText('');
      setParsedRows([]);
      loadVoters();
    } catch (err: any) {
      setParseError(err.message || 'Falha ao importar a lista.');
    } finally {
      setIsImporting(false);
    }
  };

  const totalVoters = voters.length;
  const signedVoters = voters.filter(v => v.hasVoted);

  // Função para formatar a exibição do horário na tela
  const displayTime = (v: Vote) => {
    // Prioriza o valor calculado pelo banco de dados (automático)
    if (v.timestampManaus) {
      // O formato vindo do PG costuma ser "YYYY-MM-DD HH:mm:ss"
      const datePart = v.timestampManaus.split('T')[0] || v.timestampManaus;
      const timePart = v.timestampManaus.split('T')[1] || '';
      return `${datePart.split('-').reverse().join('/')} ${timePart.split('.')[0]}`;
    }
    
    // Fallback caso a coluna ainda não tenha sido populada por algum motivo
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Manaus',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(v.timestamp));
    } catch (e) {
      return '--:--';
    }
  };

  const totalVotesCount = votes.length;
  const nullVotesCount = votes.filter(v => v.candidateNumber === 'NULO').length;

  const stats = candidates.map(c => {
    const candidateVotes = votes.filter(v => v.candidateNumber === c.number).length;
    return {
      name: c.name,
      number: c.number,
      photoUrl: c.photoUrl,
      votes: candidateVotes,
      percentage: totalVotesCount > 0 ? ((candidateVotes / totalVotesCount) * 100).toFixed(1) : "0",
      color: '#6366f1'
    };
  }).sort((a, b) => b.votes - a.votes);

  const exportToExcel = () => {
    // Agora exporta os LOGS (Auditória) em vez dos resultados resumidos
    const auditData = [...votes]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(v => {
        const cand = candidates.find(c => c.number === v.candidateNumber);
        return {
          "Data/Hora (Manaus)": displayTime(v),
          "Nº Candidato": v.candidateNumber,
          "Nome do Candidato": v.candidateNumber === 'NULO' ? 'VOTO NULO' : (cand?.name || 'Não Encontrado'),
          "ID Único do Voto": v.id
        };
      });

    const ws = XLSX.utils.json_to_sheet(auditData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditória de Votos CIPA");
    
    // Ajuste de largura das colunas para melhor visualização
    ws['!cols'] = [
      { wch: 25 }, // Data/Hora
      { wch: 15 }, // Nº
      { wch: 40 }, // Nome
      { wch: 40 }  // ID
    ];

    XLSX.writeFile(wb, `auditoria_cipa_manaus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAttendanceToExcel = () => {
    const attendanceData = [...voters]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(v => ({
        "Nome": v.name,
        "Matrícula": v.matricula,
        "Assinou": v.hasVoted ? 'Sim' : 'Não',
        "Data/Hora (Manaus)": v.signedAt
          ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v.signedAt))
          : ''
      }));

    const ws = XLSX.utils.json_to_sheet(attendanceData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Presença CIPA");

    ws['!cols'] = [
      { wch: 40 }, // Nome
      { wch: 15 }, // Matrícula
      { wch: 12 }, // Assinou
      { wch: 25 }  // Data/Hora
    ];

    XLSX.writeFile(wb, `lista_presenca_cipa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatSignedAt = (signedAt: number | null) => {
    if (!signedAt) return '';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(signedAt));
  };

  // Exporta em PDF (não Excel) porque a assinatura é uma imagem, e o xlsx
  // (versão gratuita) não sabe embutir imagens dentro de uma planilha.
  // Traz TODOS os colaboradores da lista, assinado ou não (data e assinatura ficam
  // em branco pra quem ainda não compareceu).
  const exportSignaturesToPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfError(null);
      const allVoters = await db.getVotersWithSignatures();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const rowHeight = 34;
      let y = 20;

      doc.setFontSize(14);
      doc.text('Lista de Presença CIPA', 14, y);
      y += 10;

      for (let i = 0; i < allVoters.length; i++) {
        const v = allVoters[i];

        if (y + rowHeight > pageHeight - 10) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(10);
        const dateLabel = v.signedAt ? formatSignedAt(v.signedAt) : 'Pendente';
        doc.text(`${v.name}  •  Matrícula ${v.matricula}  •  ${dateLabel}`, 14, y, { maxWidth: pageWidth - 28 });

        if (v.signature) {
          try {
            doc.addImage(v.signature, 'PNG', 14, y + 3, 60, 22);
          } catch {
            // Assinatura corrompida ou em formato inesperado: segue sem travar o relatório inteiro.
          }
        } else {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text('(sem assinatura)', 14, y + 12);
          doc.setTextColor(0);
        }

        y += rowHeight;

        // Cede o event loop a cada 20 linhas pra não travar a aba com listas grandes.
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      doc.save(`lista_presenca_cipa_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      setPdfError(err.message || 'Falha ao gerar o PDF da lista.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Imagem muito pesada. Limite: 1.5MB.");
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhotoBase64(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newNumber && newPhotoBase64) {
      onAddCandidate({ name: newName, number: newNumber, photoUrl: newPhotoBase64 });
      setNewName(''); setNewNumber(''); setNewPhotoBase64('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('candidates'); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2 rounded-md text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Console de Administração</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Gestão Eleitoral CIPA • Unidade Corporativa</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors shadow-sm"
            title="Exportar Auditória para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (Auditória)
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-red-50 transition-colors shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" /> Zerar Urna
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border-t-8 border-red-500 p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Alerta Crítico</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Você está prestes a apagar todos os votos desta eleição. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-lg hover:bg-slate-200 transition-colors text-sm uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onResetVotes(); setShowResetConfirm(false); }}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors text-sm uppercase"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-8 shrink-0 flex gap-8">
        {[
          { id: 'results', label: 'Apuração', icon: BarChart3 },
          { id: 'logs', label: 'Histórico (Manaus)', icon: History },
          { id: 'attendance', label: 'Lista de Presença', icon: UserCheck },
          { id: 'candidates', label: 'Candidatos', icon: Users },
          { id: 'register', label: 'Cadastro', icon: Plus },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab.id 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1200px] mx-auto">
          
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-lg">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Votos Válidos</p>
                    <h3 className="text-4xl font-black font-mono">{votes.length - nullVotesCount}</h3>
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl text-white shadow-lg">
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Votos Nulos</p>
                    <h3 className="text-4xl font-black font-mono">{nullVotesCount}</h3>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Geral</p>
                    <h3 className="text-4xl font-black font-mono text-slate-900">{votes.length}</h3>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Parcial da Eleição
                  </h2>
                </div>
                
                <div className="p-8">
                  {votes.length > 0 ? (
                    <div className="space-y-4">
                      {stats.map((item, index) => (
                        <div key={item.number} className="flex items-center gap-6 p-2 rounded-lg">
                          <div className="flex items-center gap-4 w-[280px] shrink-0">
                            <img 
                              src={sanitizeImageUrl(item.photoUrl)} 
                              className="w-12 h-14 object-cover rounded border border-slate-200"
                              alt={item.name}
                              onError={(e) => e.currentTarget.src = FALLBACK_PHOTO}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 uppercase truncate leading-tight">{item.name}</p>
                              <p className="text-[10px] font-bold text-slate-400">Nº {item.number}</p>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                             <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-slate-500 uppercase">
                                   {item.votes} votos
                                </span>
                                <span className="text-xs font-mono font-black text-indigo-600">
                                   {item.percentage}%
                                </span>
                             </div>
                             <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-600 transition-all duration-1000"
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                             </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex items-center gap-6 p-2 rounded-lg mt-6 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-4 w-[280px] shrink-0">
                          <div className="w-12 h-14 bg-slate-200 rounded flex items-center justify-center text-slate-400">
                            <Ban className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-400 uppercase leading-tight">Votos Nulos</p>
                            <p className="text-[10px] font-bold text-slate-400">Número Inválido</p>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-slate-500 uppercase">{nullVotesCount} votos</span>
                              <span className="text-xs font-mono font-black text-slate-400">
                                {totalVotesCount > 0 ? ((nullVotesCount / totalVotesCount) * 100).toFixed(1) : "0"}%
                              </span>
                           </div>
                           <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-slate-400"
                                style={{ width: totalVotesCount > 0 ? `${(nullVotesCount / totalVotesCount) * 100}%` : '0%' }}
                              ></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                      <p className="text-sm font-medium">Nenhum voto registrado ainda.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-700">Auditória de Votos (Automação Manaus)</h2>
                <div className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-black">DATABASE GENERATED</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-4">Data/Hora (Banco de Dados)</th>
                      <th className="px-6 py-4">Nº Candidato</th>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">ID Único do Voto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...votes].sort((a,b) => (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())).map(v => {
                      const cand = candidates.find(c => c.number === v.candidateNumber);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs font-bold text-indigo-600">
                             <div className="flex items-center gap-2">
                               <Clock className="w-3 h-3" />
                               {displayTime(v)}
                             </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.candidateNumber === 'NULO' ? 'bg-red-100 text-red-700' : 'bg-slate-800 text-white'}`}>
                              {v.candidateNumber}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-600 uppercase">
                            {v.candidateNumber === 'NULO' ? 'VOTO NULO' : (cand?.name || 'Candidato Desconhecido')}
                          </td>
                          <td className="px-6 py-3 font-mono text-[9px] text-slate-400">
                            {v.id}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Link do Tablet de Check-in
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Abra este link no tablet ao lado da urna. Não precisa de senha de admin.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={checkinUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-600"
                  />
                  <button
                    onClick={handleCopyCheckinUrl}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase flex items-center gap-2 hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-lg">
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Colaboradores na Lista</p>
                  <h3 className="text-4xl font-black font-mono">{totalVoters}</h3>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl text-white shadow-lg">
                  <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Já Assinaram</p>
                  <h3 className="text-4xl font-black font-mono">{signedVoters.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Comparecimento</p>
                  <h3 className="text-4xl font-black font-mono text-slate-900">
                    {totalVoters > 0 ? ((signedVoters.length / totalVoters) * 100).toFixed(1) : '0'}%
                  </h3>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-indigo-500" />
                    Importar Colaboradores (colar da planilha)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Cole as linhas copiadas do Excel (matrícula e nome, em qualquer ordem, separados por tab ou vírgula). Importar de novo não apaga quem já assinou.
                  </p>
                </div>
                <div className="p-6 space-y-3">
                  <textarea
                    value={pasteText}
                    onChange={(e) => { setPasteText(e.target.value); setImportSuccess(null); }}
                    placeholder={"1001\tJoão da Silva\n1002\tMaria Souza"}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs outline-none focus:border-indigo-500 transition-all"
                  />
                  {parseError && (
                    <p className="text-red-600 text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {parseError}
                    </p>
                  )}
                  {importSuccess && (
                    <p className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {importSuccess}
                    </p>
                  )}
                  <button
                    onClick={handleParsePaste}
                    disabled={!pasteText.trim()}
                    className="px-4 py-2 bg-slate-800 text-white rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-slate-700 transition-colors disabled:opacity-40"
                  >
                    Processar Texto
                  </button>

                  {parsedRows.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden mt-4">
                      <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-600">
                        Pré-visualização: {parsedRows.length} linha(s) reconhecida(s)
                      </div>
                      <div className="max-h-48 overflow-auto">
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-slate-50">
                            {parsedRows.slice(0, 20).map((row, i) => (
                              <tr key={i}>
                                <td className="px-4 py-1.5 font-mono text-indigo-600 font-bold">{row.matricula}</td>
                                <td className="px-4 py-1.5 text-slate-600">{row.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedRows.length > 20 && (
                          <div className="px-4 py-1.5 text-[10px] text-slate-400">
                            + {parsedRows.length - 20} linha(s) não mostradas na pré-visualização
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <button
                          onClick={handleImportVoters}
                          disabled={isImporting}
                          className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-md text-xs uppercase disabled:opacity-50"
                        >
                          {isImporting ? 'Importando...' : `Confirmar Importação (${parsedRows.length})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3 flex-wrap">
                  <h2 className="text-sm font-bold text-slate-700">Colaboradores que já assinaram</h2>
                  <div className="flex items-center gap-2">
                    {pdfError && <span className="text-red-600 text-[10px] font-bold">{pdfError}</span>}
                    <button
                      onClick={exportSignaturesToPdf}
                      disabled={totalVoters === 0 || isGeneratingPdf}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-40"
                      title="Exportar todos os colaboradores em PDF, com nome, data e imagem da assinatura"
                    >
                      <FileText className="w-4 h-4" /> {isGeneratingPdf ? 'Gerando...' : 'PDF (Lista Completa)'}
                    </button>
                    <button
                      onClick={exportAttendanceToExcel}
                      disabled={totalVoters === 0}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-40"
                      title="Exportar lista completa (incluindo quem ainda não assinou)"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel (Lista Completa)
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Matrícula</th>
                        <th className="px-6 py-4">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {isLoadingVoters ? (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">Carregando...</td></tr>
                      ) : signedVoters.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">Ninguém assinou a lista ainda.</td></tr>
                      ) : (
                        signedVoters
                          .sort((a, b) => (b.signedAt || 0) - (a.signedAt || 0))
                          .map(v => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3 text-xs font-bold text-slate-600 uppercase">{v.name}</td>
                              <td className="px-6 py-3 font-mono text-xs font-bold text-indigo-600">{v.matricula}</td>
                              <td className="px-6 py-3 font-mono text-xs text-slate-400">
                                {v.signedAt ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v.signedAt)) : '--'}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-700">Gestão de Candidatos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-4">Foto</th>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Número</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(c => (
                      <tr key={c.id} className="border-b border-slate-50">
                        <td className="px-6 py-3">
                          <img src={sanitizeImageUrl(c.photoUrl)} className="w-10 h-12 rounded object-cover" onError={(e) => e.currentTarget.src = FALLBACK_PHOTO} />
                        </td>
                        <td className="px-6 py-3 font-bold text-slate-700 text-sm">{c.name}</td>
                        <td className="px-6 py-3 font-mono font-bold text-indigo-600">{c.number}</td>
                        <td className="px-6 py-3 text-right">
                          <button onClick={() => onDeleteCandidate(c.id)} className="text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Novo Cadastro</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded text-sm" placeholder="Nome do Candidato" required />
                <input type="text" maxLength={2} value={newNumber} onChange={e => setNewNumber(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-2 bg-slate-50 border rounded font-mono font-bold" placeholder="Número (2 dígitos)" required />
                <div className="aspect-[3/4] border-2 border-dashed border-slate-200 rounded flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden relative">
                  {newPhotoBase64 ? <img src={newPhotoBase64} className="w-full h-full object-cover" /> : <Upload className="w-8 h-8 text-slate-300" />}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded text-xs font-bold uppercase">Salvar Candidato</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
