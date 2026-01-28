
import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Candidate, Vote } from '../types.ts';
import { Trash2, Plus, Users, Vote as VoteIcon, LayoutDashboard, Settings, Image as ImageIcon, Upload, X, CheckCircle2, AlertTriangle, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { sanitizeImageUrl } from '../utils/urlHelper.ts';

interface AdminDashboardProps {
  candidates: Candidate[];
  votes: Vote[];
  onAddCandidate: (c: Omit<Candidate, 'id'>) => void;
  onDeleteCandidate: (id: string) => void;
  onResetVotes: () => void;
}

const FALLBACK_PHOTO = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  candidates, 
  votes, 
  onAddCandidate, 
  onDeleteCandidate, 
  onResetVotes 
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'register'>('results');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPhotoBase64, setNewPhotoBase64] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Total de votos para cálculo de porcentagem
  const totalVotesCount = votes.length;

  // Organiza dados: Do maior para o menor
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
      onAddCandidate({ 
        name: newName, 
        number: newNumber, 
        photoUrl: newPhotoBase64 
      });
      setNewName('');
      setNewNumber('');
      setNewPhotoBase64('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('candidates'); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden">
      {/* Top Header */}
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

        <div className="flex items-center gap-6">
          <div className="flex gap-6 border-r border-slate-200 pr-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Votos Registrados</p>
              <p className="text-xl font-mono font-bold text-slate-900 leading-none">{votes.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Candidatos Ativos</p>
              <p className="text-xl font-mono font-bold text-slate-900 leading-none">{candidates.length}</p>
            </div>
          </div>
          <button 
            onClick={() => { if(confirm('⚠️ Atenção: Todos os votos serão removidos. Confirmar limpeza total?')) onResetVotes(); }} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md text-xs font-bold hover:bg-red-50 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Zerar Urna
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-8 shrink-0 flex gap-8">
        {[
          { id: 'results', label: 'Apuração Parcial', icon: BarChart3 },
          { id: 'candidates', label: 'Candidatos', icon: Users },
          { id: 'register', label: 'Novo Cadastro', icon: Plus },
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* TAB: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Resultados Consolidados
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Tempo Real
                  </div>
                </div>
                
                <div className="p-8">
                  {votes.length > 0 ? (
                    <div className="space-y-4">
                      {stats.map((item, index) => (
                        <div key={item.number} className="flex items-center gap-6 group hover:bg-slate-50 p-2 rounded-lg transition-colors">
                          {/* Candidato Info */}
                          <div className="flex items-center gap-4 w-[280px] shrink-0">
                            <div className="relative">
                               <span className={`absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white z-10 ${index === 0 ? 'bg-amber-400 shadow-amber-200 shadow-lg' : 'bg-slate-400'}`}>
                                 {index + 1}
                               </span>
                               <img 
                                src={sanitizeImageUrl(item.photoUrl)} 
                                className="w-12 h-14 object-cover rounded shadow-sm border border-slate-200 bg-slate-100"
                                alt={item.name}
                                onError={(e) => e.currentTarget.src = FALLBACK_PHOTO}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 uppercase truncate leading-tight">{item.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Nº {item.number}</p>
                            </div>
                          </div>

                          {/* Barra de Progresso */}
                          <div className="flex-1 flex flex-col gap-1.5">
                             <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                   {item.votes} {item.votes === 1 ? 'voto' : 'votos'}
                                </span>
                                <span className="text-xs font-mono font-black text-indigo-600">
                                   {item.percentage}%
                                </span>
                             </div>
                             <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ease-out rounded-full ${index === 0 ? 'bg-indigo-600' : 'bg-indigo-400'}`}
                                  style={{ width: `${item.percentage}%` }}
                                ></div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                      <VoteIcon className="w-16 h-16 mb-4 opacity-10" />
                      <p className="text-sm font-medium">Aguardando computação do primeiro voto.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CANDIDATES LIST */}
          {activeTab === 'candidates' && ( activeTab === 'candidates' && 
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-700">Listagem Geral</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-5">Identificação</th>
                      <th className="px-6 py-5">Nome</th>
                      <th className="px-6 py-5">Número Urna</th>
                      <th className="px-6 py-5">Total Votos</th>
                      <th className="px-6 py-5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm italic">
                          Ainda não há candidatos cadastrados para esta eleição.
                        </td>
                      </tr>
                    ) : candidates.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <img 
                            src={sanitizeImageUrl(c.photoUrl)} 
                            className="w-12 h-15 rounded object-cover border border-slate-200 shadow-sm" 
                            alt=""
                            onError={(e) => e.currentTarget.src = FALLBACK_PHOTO}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{c.name}</td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-900 text-white px-3 py-1 rounded font-mono font-bold text-sm">
                            {c.number}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-lg text-indigo-600">
                          {votes.filter(v => v.candidateNumber === c.number).length}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => onDeleteCandidate(c.id)}
                            className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                            title="Excluir Candidato"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: REGISTER FORM */}
          {activeTab === 'register' && (
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-lg shadow-lg p-10">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Novo Registro</h2>
                <p className="text-sm text-slate-500 mt-1">Preencha os dados do candidato para inclusão na urna</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nome do Candidato</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-sm font-semibold transition-all" 
                    placeholder="Nome completo para exibição" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Número Identificador (2 dígitos)</label>
                  <input 
                    type="text" 
                    maxLength={2} 
                    value={newNumber} 
                    onChange={e => setNewNumber(e.target.value.replace(/\D/g, ''))} 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" 
                    placeholder="00" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-4">Fotografia Oficial</label>
                  
                  {newPhotoBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[3/4] group bg-slate-100 shadow-inner">
                      <img src={newPhotoBase64} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button" 
                          onClick={() => setNewPhotoBase64('')}
                          className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xl"
                        >
                          <X className="w-4 h-4" /> Remover Foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent animate-spin rounded-full mb-3"></div>
                          <p className="text-xs font-bold text-indigo-600">PROCESSANDO IMAGEM...</p>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-4 group-hover:text-indigo-500 group-hover:scale-110 transition-all" />
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Upload da Imagem</p>
                          <p className="text-[10px] text-slate-300">Formatos aceitos: JPG, PNG • Max 1.5MB</p>
                        </div>
                      )}
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </label>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={!newPhotoBase64 || !newName || !newNumber}
                  className={`w-full py-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                    newPhotoBase64 && newName && newNumber
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Gravar Cadastro no Banco
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 px-8 py-3 text-[10px] font-bold text-slate-400 flex justify-between items-center shrink-0">
        <span className="uppercase tracking-widest">Controle de Sistema • Eleições CIPA 2026</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span>CONECTADO</span>
          </div>
          <span className="opacity-40">|</span>
          <span>SERVIDOR: SUPABASE CLOUD</span>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
