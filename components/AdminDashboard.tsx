
import React, { useState, useRef } from 'react';
import { Candidate, Vote } from '../types.ts';
import { Trash2, Plus, Users, Vote as VoteIcon, LayoutDashboard, Settings, Image as ImageIcon, Upload, X, CheckCircle2, AlertTriangle, FileText, BarChart3, TrendingUp, History, Clock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'results' | 'candidates' | 'register' | 'logs'>('results');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPhotoBase64, setNewPhotoBase64] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para formatar o horário de Manaus sem mexer no banco
  const formatManausTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    try {
      // Converte para o fuso de Manaus (America/Manaus)
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Manaus',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(timestamp));
    } catch (e) {
      return 'Erro fuso';
    }
  };

  const totalVotesCount = votes.length;

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
          <button 
            onClick={() => { if(confirm('⚠️ ALERTA CRÍTICO: Você está prestes a APAGAR TODOS OS VOTOS desta eleição. Esta ação não pode ser desfeita. Confirmar?')) onResetVotes(); }} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md text-xs font-bold hover:bg-red-50 transition-colors shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" /> Zerar Urna
          </button>

          <div className="flex gap-6 pl-2">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Votos Totais</p>
              <p className="text-xl font-mono font-bold text-slate-900 leading-none">{votes.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Candidatos</p>
              <p className="text-xl font-mono font-bold text-slate-900 leading-none">{candidates.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-8 shrink-0 flex gap-8">
        {[
          { id: 'results', label: 'Apuração', icon: BarChart3 },
          { id: 'logs', label: 'Histórico (Manaus)', icon: History },
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

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[1200px] mx-auto">
          
          {/* TAB: RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-6">
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

          {/* TAB: AUDIT LOGS (MANAUS TIME) */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-700">Auditória de Votos (Horário Manaus)</h2>
                <div className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-black">UTC-4</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="px-6 py-4">Data/Hora (Manaus)</th>
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
                               {formatManausTime(v.timestamp)}
                             </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-bold">{v.candidateNumber}</span>
                          </td>
                          <td className="px-6 py-3 text-xs font-bold text-slate-600 uppercase">
                            {cand?.name || 'Candidato Desconhecido'}
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

          {/* TAB: CANDIDATES */}
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

          {/* TAB: REGISTER */}
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
