import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Search, Phone, Trash2, Edit2, X, CheckCircle } from 'lucide-react';
import { Lojista } from '../types';

interface LojistasViewProps {
  lojistas: Lojista[];
  onCreateLojista: (nome: string, whatsapp: string) => void;
  onUpdateLojista: (id: string, nome: string, whatsapp: string) => void;
  onDeleteLojista: (id: string) => void;
}

export const LojistasView: React.FC<LojistasViewProps> = ({ lojistas, onCreateLojista, onUpdateLojista, onDeleteLojista }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingLojista, setEditingLojista] = useState<Lojista | null>(null);
  const [search, setSearch] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    if (editingLojista) {
      setNome(editingLojista.nome);
      setWhatsapp(editingLojista.whatsapp);
      setShowModal(true);
    } else {
      setNome('');
      setWhatsapp('');
    }
  }, [editingLojista]);

  const filteredLojistas = useMemo(() => lojistas.filter(l => 
    l.nome.toLowerCase().includes(search.toLowerCase()) || 
    l.whatsapp.includes(search)
  ), [lojistas, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      alert("O nome do lojista é obrigatório.");
      return;
    }
    
    if (editingLojista) {
      onUpdateLojista(editingLojista.id, nome, whatsapp);
    } else {
      onCreateLojista(nome, whatsapp);
    }
    
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLojista(null);
    setNome('');
    setWhatsapp('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tighter">Lojistas Parceiros</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{lojistas.length} Clientes Ativos</p>
        </div>
        <button 
          aria-label="Adicionar Lojista"
          onClick={() => { setEditingLojista(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
        >
          <UserPlus size={20} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar lojista por nome ou zap..."
          className="w-full bg-slate-900 border border-slate-800 rounded-3xl py-4 pl-12 pr-6 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredLojistas.map(l => (
          <div key={l.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:bg-slate-900 hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                <span className="font-black text-lg">{l.nome.charAt(0)}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-100">{l.nome}</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Phone size={10} className="text-green-500" /> {l.whatsapp}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                aria-label={`Editar ${l.nome}`}
                onClick={() => setEditingLojista(l)}
                className="p-2 text-slate-500 hover:text-blue-400"
              >
                <Edit2 size={16} />
              </button>
              <button 
                aria-label={`Excluir ${l.nome}`}
                onClick={() => onDeleteLojista(l.id)}
                className="p-2 text-slate-500 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar Lojista */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">
                {editingLojista ? 'Editar Parceiro' : 'Cadastrar Parceiro'}
              </h3>
              <button aria-label="Fechar modal" onClick={closeModal} className="text-slate-500 hover:text-slate-300"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Nome da Loja / Lojista</label>
                <input 
                  autoFocus
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Celulares do Tiago"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">WhatsApp (Opcional)</label>
                <input 
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: 11999999999"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> {editingLojista ? 'Atualizar' : 'Salvar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};