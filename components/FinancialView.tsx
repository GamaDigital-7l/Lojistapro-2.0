import React, { useState, useMemo } from 'react';
import { Wallet, AlertCircle, Store } from 'lucide-react';
import { useAppContext } from '../AppContext';

export const FinancialView: React.FC = () => {
  const { orders } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  const filteredOrders = useMemo(() => {
    return orders.filter(os => {
      const d = new Date(os.created_at);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const previsto = filteredOrders.reduce((acc, os) => acc + (os.status !== 'pago' ? os.valor_cobrado : 0), 0);
    const recebido = filteredOrders.reduce((acc, os) => acc + (os.status === 'pago' ? os.valor_cobrado : 0), 0);
    return { previsto, recebido };
  }, [filteredOrders]);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="px-6 py-6 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-md z-30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Financeiro da Loja</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-300">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-300">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800"><span className="text-[8px] text-slate-500 font-black uppercase block mb-1">A Receber</span><p className="text-lg font-black text-orange-400">R$ {stats.previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-green-500/20"><span className="text-[8px] text-green-500 font-black uppercase block mb-1">Recebido</span><p className="text-lg font-black text-green-500">R$ {stats.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-24 no-scrollbar flex-1 overflow-y-auto">
        {filteredOrders.length > 0 ? filteredOrders.map(os => (
            <div key={os.id} className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20"><Store size={18} /></div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500">#OS {os.id}</span>
                    <h5 className="text-sm font-black text-slate-100">{os.modelo}</h5>
                  </div>
               </div>
               <div className="text-right">
                 <p className="text-xs font-black text-slate-200">R$ {os.valor_cobrado.toFixed(2)}</p>
                 <span className={`text-[8px] font-black uppercase ${os.status === 'pago' ? 'text-green-500' : 'text-orange-400'}`}>{os.status === 'pago' ? 'PAGO' : 'PENDENTE'}</span>
               </div>
            </div>
          )) : (
            <div className="py-20 text-center text-slate-700">
              <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma OS encontrada neste período.</p>
            </div>
          )}
      </div>
    </div>
  );
};