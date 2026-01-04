import React, { useState, useMemo } from 'react';
import { Award, AlertCircle, Store, X } from 'lucide-react';
import { OrdemServico, Tecnico } from '../types';
import { useAppContext } from '../AppContext';

const calculateOSCommission = (os: OrdemServico, comissao_percentual: number): number => {
  const revenue = os.valor_cobrado || 0;
  const costs = (os.custo_pecas || 0) + (os.custo_outros || 0);
  const profit = revenue - costs;
  return profit > 0 ? (profit * comissao_percentual) / 100 : 0;
};

export const ReportsView: React.FC = () => {
  const { orders, tecnicos } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const filteredOrders = useMemo(() => {
    return orders.filter(os => {
      const d = new Date(os.created_at);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [orders, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const report = tecnicos.map(t => {
      const techOrders = filteredOrders.filter(o => o.tecnico_id === t.id && o.status === 'pago');
      
      const totalComm = techOrders.reduce((acc, o) => acc + calculateOSCommission(o, t.comissao_percentual), 0);

      return {
        ...t,
        orderCount: techOrders.length,
        totalComm: totalComm,
        techOrders
      };
    });
    return { techReports: report };
  }, [filteredOrders, tecnicos]);

  const selectedTech = stats.techReports.find(t => t.id === selectedTechId);

  return (
    <div className="p-6 space-y-8 pb-24 flex-1 overflow-y-auto no-scrollbar h-full bg-slate-950">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter">Performance e Comissões</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fechamento do Período</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-300">{months.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-300">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>

      <section>
         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Relatório Detalhado por Técnico</h3>
        <div className="space-y-4">
          {stats.techReports.map(tech => (
            <button key={tech.id} onClick={() => setSelectedTechId(tech.id)} className="w-full bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 text-left active:scale-[0.98] transition-all hover:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700"><Award size={24} /></div><div><h4 className="text-sm font-black text-white uppercase">{tech.nome}</h4><p className="text-[9px] text-slate-500 font-bold uppercase">{tech.orderCount} Serviços Pagos</p></div></div>
                <div className="text-right"><span className="text-[8px] text-blue-400 font-black uppercase block">Comissão Total</span><p className="text-lg font-black text-blue-400">R$ {tech.totalComm.toFixed(2)}</p></div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedTech && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 lg:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-950 w-full h-full lg:max-w-4xl lg:h-[85vh] lg:rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden">
            <div className="px-6 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 shrink-0">
              <div><h3 className="text-xl font-black text-white uppercase tracking-tighter">{selectedTech.nome}</h3><p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{months[selectedMonth]} {selectedYear}</p></div>
              <button aria-label="Fechar detalhes do técnico" onClick={() => setSelectedTechId(null)} className="p-3 bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar pb-10">
              {selectedTech.techOrders.length > 0 ? selectedTech.techOrders.map(os => {
                const commission = calculateOSCommission(os, selectedTech.comissao_percentual);
                return (
                  <div key={os.id} className={'bg-slate-900/50 border rounded-2xl p-4 flex items-center justify-between border-slate-800'}>
                    <div className="flex items-center gap-3">
                      <Store size={16} className="text-amber-500" />
                      <div>
                        <h5 className="text-xs font-black text-slate-200">{os.modelo} (OS #{os.id})</h5>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Serviço da Loja</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-200">R$ {os.valor_cobrado.toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-blue-400">Comissão: R$ {commission.toFixed(2)}</p>
                      <p className="text-[8px] text-slate-500 font-black uppercase mt-1">{new Date(os.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                );
              }) : (
                 <div className="py-20 text-center text-slate-700">
                  <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma OS paga encontrada para este técnico no período.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};