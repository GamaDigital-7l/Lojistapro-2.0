import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2, Trash2, AlertOctagon, DollarSign, User, Zap, FileText, Save, ShieldCheck, Store } from 'lucide-react';
import { OrdemServico, Tecnico, ChecklistItem } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { useAppContext } from '../AppContext';

interface OSDetailProps {
  os: OrdemServico;
  tecnico: Tecnico;
}

export const OSDetail: React.FC<OSDetailProps> = ({ os, tecnico }) => {
  const { 
    setSelectedOSId, 
    updateOSFields,
    handleDeleteOS,
    handleOpenWarranty,
    updateOSChecklist
  } = useAppContext();

  const [custoPecas, setCustoPecas] = useState(os.custo_pecas || 0);
  const [custoOutros, setCustoOutros] = useState(os.custo_outros || 0);
  const [valorCobrado, setValorCobrado] = useState(os.valor_cobrado || 0);
  const [laudo, setLaudo] = useState(os.laudo_tecnico || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSavingLaudo, setIsSavingLaudo] = useState(false);

  const toggleChecklist = (index: number) => {
    const newChecklist = [...(os.checklist || [])];
    newChecklist[index].checked = !newChecklist[index].checked;
    updateOSChecklist(os.id, newChecklist);
  };

  const handleSaveCosts = () => {
    updateOSFields(os.id, {
      custo_pecas: Number(custoPecas),
      custo_outros: Number(custoOutros),
      valor_cobrado: Number(valorCobrado)
    });
  };

  const handleSaveLaudo = async () => {
    setIsSavingLaudo(true);
    await updateOSFields(os.id, { laudo_tecnico: laudo });
    setIsSavingLaudo(false);
  };
  
  const onClose = () => setSelectedOSId(null);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-0 lg:p-8 animate-in fade-in duration-300">
      
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-slate-900 border border-red-500/50 p-6 rounded-[2rem] w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <AlertOctagon size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-black uppercase mb-2">Excluir OS?</h3>
            <p className="text-xs text-slate-400 mb-6">Esta ação é irreversível.</p>
            <div className="space-y-2">
              <button onClick={() => { handleDeleteOS(os.id); onClose(); }} className="w-full bg-red-600 text-white font-black uppercase py-4 rounded-xl active:scale-95 transition-all">Excluir Agora</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-800 text-slate-400 font-bold uppercase py-4 rounded-xl">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-950 w-full h-full lg:rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 shrink-0">
          <button aria-label="Voltar para a lista" onClick={onClose} className="p-2 text-slate-400 active:scale-75 transition-all"><ChevronLeft size={28} /></button>
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-tighter">OS #{os.id}</h2>
            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border mt-1 ${STATUS_COLORS[os.status]}`}>{STATUS_LABELS[os.status]}</div>
          </div>
          <button aria-label="Excluir Ordem de Serviço" onClick={() => setShowDeleteConfirm(true)} className="p-3 text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
              <span className="text-[8px] text-slate-500 font-black uppercase block mb-1 flex items-center gap-1.5"><Store size={10} /> Origem</span>
              <p className="text-xs font-bold text-slate-200 truncate">Serviço da Loja</p>
            </div>
            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
              <span className="text-[8px] text-slate-500 font-black uppercase block mb-1 flex items-center gap-1.5"><User size={10} /> Técnico</span>
              <p className="text-xs font-bold text-slate-200 truncate">{tecnico.nome}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-2"><Zap size={14} /> Aparelho e Relato</span>
            </div>
            <p className="text-lg font-black text-white">{os.modelo}</p>
            <p className="text-xs text-slate-400 mt-2 italic">"{os.defeito_reclamado}"</p>
          </div>
          
          {os.checklist && os.checklist.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500" /> Checklist de Entrada</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {(os.checklist).map((item, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer group">
                    <button 
                      onClick={() => toggleChecklist(index)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${item.checked ? 'bg-blue-600 border-blue-600' : 'border-slate-700 bg-slate-950 group-hover:border-slate-600'}`}
                    >
                      {item.checked && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <span className={`text-xs transition-colors ${item.checked ? 'text-slate-300 line-through' : 'text-slate-500 group-hover:text-slate-400'}`}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-blue-500" /> Laudo Técnico / O que foi feito</h3>
              <button 
                onClick={handleSaveLaudo} 
                className={`text-[9px] font-black uppercase flex items-center gap-1 transition-all ${isSavingLaudo ? 'text-slate-500' : 'text-blue-500 hover:text-blue-400'}`}
              >
                <Save size={12} /> {isSavingLaudo ? 'Salvando...' : 'Salvar Laudo'}
              </button>
            </div>
            <textarea 
              value={laudo} 
              onChange={e => setLaudo(e.target.value)} 
              placeholder="Descreva aqui os detalhes técnicos do reparo e observações importantes..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 h-32 resize-none focus:border-blue-500 outline-none"
            />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14} className="text-green-500" /> Valores do Serviço</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Preço Final Cobrado (R$)</label>
                <input type="number" value={valorCobrado} onChange={e => setValorCobrado(Number(e.target.value))} onBlur={handleSaveCosts} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-black text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Custo de Peças</label><input type="number" value={custoPecas} onChange={e => setCustoPecas(Number(e.target.value))} onBlur={handleSaveCosts} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-bold text-red-400" /></div>
                <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Outros Custos</label><input type="number" value={custoOutros} onChange={e => setCustoOutros(Number(e.target.value))} onBlur={handleSaveCosts} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-bold text-orange-400" /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 space-y-3 shrink-0">
          {os.status === 'pago' && (
            <div className="w-full flex flex-col gap-2">
              <div className="bg-slate-800/50 p-4 rounded-xl text-center border border-slate-700">
                <span className="text-green-500 font-black uppercase text-[10px] flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} /> Serviço Liquidado
                </span>
              </div>
              <button 
                onClick={() => handleOpenWarranty(os)}
                className="w-full bg-purple-600/20 border border-purple-600/30 text-purple-400 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <ShieldCheck size={14} /> Abrir Garantia
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
