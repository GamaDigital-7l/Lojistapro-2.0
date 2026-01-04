import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Plus, X, CheckCircle2, Calendar, Store } from 'lucide-react';
import { OrdemServico, OSStatus, ChecklistItem } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { useAppContext } from '../AppContext';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Aparelho Liga', checked: false },
  { label: 'Touch Screen OK', checked: false },
  { label: 'Carregamento OK', checked: false },
  { label: 'Câmeras OK', checked: false },
  { label: 'Sinal Wi-Fi/Geral', checked: false },
  { label: 'Botões Físicos', checked: false }
];

const TimeCounter: React.FC<{ date: string, status: string }> = ({ date, status }) => {
  const diffTime = Math.abs(new Date().getTime() - new Date(date).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const isPending = status !== 'pago' && status !== 'pronto';
  if (diffDays === 0) return <span className="text-[7px] font-black uppercase text-slate-500">Hoje</span>;
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${isPending && diffDays > 3 ? 'bg-red-600/80 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
      <Calendar size={8} /> {diffDays}d
    </div>
  );
};

const OSBadge: React.FC<{ os: OrdemServico }> = ({ os }) => {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      <div className={`px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase border ${STATUS_COLORS[os.status]}`}>
        {STATUS_LABELS[os.status]}
      </div>
      <div className="px-2 py-0.5 rounded-[4px] text-[7px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
        LOJA
      </div>
    </div>
  );
};

const OSCard: React.FC<{ os: OrdemServico, onSelect: () => void }> = React.memo(({ os, onSelect }) => {
  return (
    <button onClick={onSelect} className="w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-slate-700">
      <div className="flex items-center gap-4 text-left">
        <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border bg-amber-500/5 text-amber-500 border-amber-500/10`}>
          <Store size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xl font-black text-slate-100 tracking-tighter">#{os.id}</h4>
            <TimeCounter date={os.created_at} status={os.status} />
          </div>
          <p className="font-bold text-xs text-slate-400 truncate mt-0.5">{os.modelo}</p>
          <OSBadge os={os} />
        </div>
      </div>
      <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
    </button>
  );
});

export const OSList: React.FC = () => {
  const { orders, tecnicos, setSelectedOSId, handleCreateOS } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [osData, setOsData] = useState<Partial<OrdemServico>>({ checklist: DEFAULT_CHECKLIST });

  const filteredOrders = useMemo(() => orders.filter(os => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = os.modelo.toLowerCase().includes(searchTerm) ||
      os.defeito_reclamado.toLowerCase().includes(searchTerm) ||
      os.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || os.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, search, statusFilter]);

  const handleInputChange = (field: keyof OrdemServico, value: any) => {
    setOsData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osData.id || !osData.modelo || !osData.defeito_reclamado || !osData.tecnico_id) {
        alert("Preencha Nº da OS, Modelo, Defeito e Técnico.");
        return;
    }
    handleCreateOS(osData);
    setShowModal(false);
    setOsData({ checklist: DEFAULT_CHECKLIST });
  };
  
  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="px-6 py-6 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-md z-30">
        <div className="flex justify-between items-center mb-6">
          <div><h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter">OS</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{orders.length} ATIVAS NO SISTEMA</p></div>
          <button aria-label="Adicionar Ordem de Serviço" onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"><Plus size={20} /></button>
        </div>
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por OS ou modelo..." className="w-full bg-slate-900 border border-slate-800 rounded-3xl py-4 pl-12 pr-6 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 shadow-inner" /></div>
      </div>
      <div className="px-6 py-3 border-b border-slate-900 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'novo', 'pronto', 'pago', 'garantia'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap transition-all border ${statusFilter === s ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{s === 'all' ? 'TUDO' : STATUS_LABELS[s]}</button>
        ))}
      </div>
      <div className="p-4 space-y-3 pb-24 no-scrollbar flex-1 overflow-y-auto">
        {filteredOrders.map(os => (
          <OSCard key={os.id} os={os} onSelect={() => setSelectedOSId(os.id)} />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-0 lg:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-950 w-full h-full lg:max-w-xl lg:h-auto lg:rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 shrink-0">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Nova Ordem de Serviço</h3>
              <button aria-label="Fechar modal" onClick={() => setShowModal(false)} className="p-2.5 bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitOS} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nº da Ordem de Serviço (Obrigatório)</label><input type="number" required value={osData.id || ''} onChange={e => handleInputChange('id', Number(e.target.value))} placeholder="Ex: 1290" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm" /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aparelho / Modelo</label><input type="text" required value={osData.modelo || ''} onChange={e => handleInputChange('modelo', e.target.value)} placeholder="iPhone 14 Pro Max" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm" /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Defeito Reclamado</label><textarea value={osData.defeito_reclamado || ''} onChange={e => handleInputChange('defeito_reclamado', e.target.value)} required placeholder="Ex: Não liga, tela quebrada..." className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm h-24 resize-none"></textarea></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Técnico</label><select required value={osData.tecnico_id || ''} onChange={e => handleInputChange('tecnico_id', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm"><option value="">Selecione...</option>{tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-slate-500 uppercase">Valor (R$)</label><input type="number" step="0.01" value={osData.valor_cobrado || ''} onChange={e => handleInputChange('valor_cobrado', Number(e.target.value))} placeholder="0,00" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm" /></div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Criar OS</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};