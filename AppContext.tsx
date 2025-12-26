import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import { supabase, isStripeKeyError } from './services/supabaseClient';
import { db } from './services/databaseService';
import { View, OrdemServico, Tecnico, ChecklistItem, Profile } from './types';
import { Session } from '@supabase/supabase-js';
import { ChatResponse } from './services/geminiService';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: 'Aparelho Liga', checked: false },
  { label: 'Touch Screen OK', checked: false },
  { label: 'Carregamento OK', checked: false },
  { label: 'Câmeras OK', checked: false },
  { label: 'Sinal Wi-Fi/Geral', checked: false },
  { label: 'Botões Físicos', checked: false }
];

export interface DbDiagnostics {
  profiles_table_exists: boolean;
  os_table_exists: boolean;
  tecnicos_table_exists: boolean;
  settings_table_exists: boolean;
  ensure_profile_fn_exists: boolean;
}

export interface SetupHealth {
  isHealthy: boolean;
  diagnostics?: DbDiagnostics;
  error?: any;
}


interface AppContextType {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  configError: string | null;
  setupHealth: SetupHealth;
  activeView: View;
  tecnicos: Tecnico[];
  orders: OrdemServico[];
  settings: { [key: string]: string };
  selectedOSId: number | null;
  selectedOS: OrdemServico | undefined;
  currentTecnico: Tecnico | null | undefined;
  fallbackTecnico: Tecnico;

  setActiveView: (view: View) => void;
  setSelectedOSId: (id: number | null) => void;
  handleLogout: () => Promise<void>;
  handleUpdateSetting: (key: string, value: string) => Promise<void>;
  handleCreateOS: (osData: Partial<OrdemServico> & { tecnico_nome?: string; }) => Promise<void>;
  updateOrderStatus: (id: number, status: any) => Promise<void>;
  updateOSFields: (id: number, fields: Partial<OrdemServico>) => Promise<void>;
  updateOSChecklist: (id: number, checklist: ChecklistItem[]) => Promise<void>;
  handleDeleteOS: (id: number) => Promise<void>;
  handleOpenWarranty: (parentOs: OrdemServico) => Promise<void>;
  handleCreateTecnico: (tecnicoData: Partial<Tecnico>) => Promise<void>;
  handleUpdateTecnico: (id: string, updates: Partial<Tecnico>) => Promise<void>;
  handleDeleteTecnico: (id: string) => Promise<void>;
  handleAIAction: (response: ChatResponse) => void;
  retryDbCheck: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const parseCurrency = (value: any): number => {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const sanitized = value.replace(/R\$|\s|\./g, '');
        const normalized = sanitized.replace(',', '.');
        const number = parseFloat(normalized);
        return isNaN(number) ? 0 : number;
    }
    return 0;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [setupHealth, setSetupHealth] = useState<SetupHealth>({ isHealthy: true });
  
  const [activeView, _setActiveView] = useState<View>('home');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [orders, setOrders] = useState<OrdemServico[]>([]);
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [selectedOSId, setSelectedOSId] = useState<number | null>(null);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const setActiveView = useCallback((view: View) => {
    setSelectedOSId(null);
    _setActiveView(view);
  }, []);
  
  const resetStateForSignOut = useCallback(() => {
      setProfile(null);
      setTecnicos([]);
      setOrders([]);
      setSettings({});
      setSetupHealth({ isHealthy: true });
      setIsLoading(false);
      setIsDataLoaded(false);
  }, []);

  const retryDbCheck = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (isStripeKeyError) { setConfigError("stripe_key_detected"); setIsLoading(false); return; }
    if (!supabase) { setConfigError("supabase_missing"); setIsLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
            setIsLoading(false);
        }
    });

    const loadInitialData = async () => {
        if (isDataLoaded) return;
        setIsLoading(true);
        try {
            const { data: userProfile, error: rpcError } = await supabase.rpc('ensure_user_profile');
            if (rpcError) throw rpcError;
            if (!userProfile || userProfile.error) {
                throw new Error(userProfile?.error || "Falha crítica: Perfil de usuário não pôde ser carregado ou criado.");
            }
            setProfile(userProfile as Profile);
            
            const [tecnicosData, osData, settingsData] = await Promise.all([
                db.tecnicos.getAll(),
                db.os.getAll(),
                db.settings.getAll()
            ]);
            setTecnicos(tecnicosData || []);
            setOrders(osData || []);
            setSettings(settingsData || {});
            setSetupHealth({ isHealthy: true });
            setIsDataLoaded(true);
        } catch (err: any) {
            console.error("Falha na inicialização do App:", err);
            const diagnosisResult = await db.system.diagnose().catch(() => null);
            setSetupHealth({ 
                isHealthy: false, 
                error: err, 
                diagnostics: diagnosisResult?.diagnostics
            });
        } finally {
            setIsLoading(false);
        }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session && !isDataLoaded) {
          loadInitialData();
      } else if (!session) {
          resetStateForSignOut();
      }
    });

    return () => subscription.unsubscribe();
  }, [isDataLoaded, resetStateForSignOut]);
  
  const selectedOS = useMemo(() => orders.find(o => o.id === selectedOSId), [orders, selectedOSId]);
  const currentTecnico = useMemo(() => selectedOS ? tecnicos.find(t => t.id === selectedOS.tecnico_id) : null, [selectedOS, tecnicos]);

  const handleLogout = useCallback(async () => { await supabase?.auth.signOut(); }, []);
  const handleUpdateSetting = useCallback(async (key: string, value: string) => { const ok = await db.settings.set(key, value); if (ok) setSettings(prev => ({ ...prev, [key]: value })); }, []);

  const handleCreateOS = useCallback(async (osData: Partial<OrdemServico> & { tecnico_nome?: string }) => {
    let finalTecnicoId: string | undefined = osData.tecnico_id;
  
    if (!finalTecnicoId && osData.tecnico_nome) {
      const searchName = osData.tecnico_nome.trim().toLowerCase();
      const matches = tecnicos.filter(t => t.nome.toLowerCase().includes(searchName));
      
      if (matches.length === 1) { finalTecnicoId = matches[0].id; } else {
        const techNames = tecnicos.map(t => t.nome).join(', ');
        const message = matches.length > 1 ? `Múltiplos técnicos para "${osData.tecnico_nome}": ${matches.map(m => m.nome).join(', ')}.` : `Técnico "${osData.tecnico_nome}" não encontrado. Disponíveis: ${techNames}.`;
        alert(message + "\n\nUse um nome exato ou crie a OS manualmente.");
        return;
      }
    }

    if (!finalTecnicoId && !osData.parent_os_id) { alert('Um técnico precisa ser atribuído à OS.'); return; }

    const newOS: OrdemServico = {
      id: osData.id!, tecnico_id: finalTecnicoId || '', modelo: osData.modelo || 'N/A', defeito_reclamado: osData.defeito_reclamado || 'N/A',
      valor_cobrado: parseCurrency(osData.valor_cobrado), custo_pecas: parseCurrency(osData.custo_pecas), custo_outros: parseCurrency(osData.custo_outros),
      status: osData.status === 'garantia' ? 'garantia' : 'pago', prioridade: osData.prioridade || 'media', tipo_servico: osData.tipo_servico || 'hardware',
      checklist: osData.checklist || DEFAULT_CHECKLIST, pecas_usadas: osData.pecas_usadas || [], laudo_tecnico: osData.laudo_tecnico || '',
      parent_os_id: osData.parent_os_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    
    const success = await db.os.create(newOS);
    if (success) { setOrders(prev => [newOS, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); } 
    else { alert("Erro ao criar OS. Verifique se o Nº da OS já existe."); }
  }, [tecnicos]);
  
  const updateOrderStatus = useCallback(async (id: number, status: any) => { const ok = await db.os.update(id, { status }); if (ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); }, []);
  const updateOSFields = useCallback(async (id: number, fields: Partial<OrdemServico>) => { const ok = await db.os.update(id, fields); if (ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, ...fields } : o)); }, []);
  const updateOSChecklist = useCallback(async (id: number, checklist: ChecklistItem[]) => { const ok = await db.os.update(id, { checklist }); if (ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, checklist } : o)); }, []);
  const handleDeleteOS = useCallback(async (id: number) => { const ok = await db.os.delete(id); if (ok) { setOrders(prev => prev.filter(o => o.id !== id)); setSelectedOSId(null); } }, []);
  
  const handleOpenWarranty = useCallback(async (parentOs: OrdemServico) => { 
    const newId = Number(prompt("Digite o NOVO número para esta OS de Garantia:", `${parentOs.id}1`));
    if (isNaN(newId) || !newId) return;
    await handleCreateOS({ ...parentOs, id: newId, status: 'garantia', parent_os_id: parentOs.id, valor_cobrado: 0, custo_pecas: 0, custo_outros: 0, defeito_reclamado: `GARANTIA DA OS#${parentOs.id}`, created_at: undefined, updated_at: undefined }); 
  }, [handleCreateOS]);

  const handleCreateTecnico = useCallback(async (tecnicoData: Partial<Tecnico>) => { const newTecnico = await db.tecnicos.create(tecnicoData); if (newTecnico) setTecnicos(prev => [...prev, newTecnico].sort((a,b) => a.nome.localeCompare(b.nome))); }, []);
  const handleUpdateTecnico = useCallback(async (id: string, updates: Partial<Tecnico>) => { const ok = await db.tecnicos.update(id, updates); if (ok) setTecnicos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); }, []);
  const handleDeleteTecnico = useCallback(async (id: string) => { const ok = await db.tecnicos.delete(id); if (ok) setTecnicos(prev => prev.filter(t => t.id !== id)); }, []);
  
  const handleAIAction = useCallback((response: ChatResponse) => {
    if (response.action === 'CREATE_OS' && response.data?.id) {
      handleCreateOS({ id: response.data.id, modelo: response.data.modelo, defeito_reclamado: response.data.defeito_reclamado,
        valor_cobrado: response.data.valor_cobrado, custo_pecas: response.data.custo_pecas, tecnico_id: response.data.tecnico_id, tecnico_nome: response.data.tecnico_nome,
      });
    }
  }, [handleCreateOS]);

  const fallbackTecnico: Tecnico = { id: 'deleted', nome: 'Técnico Removido', especialidade: '-', comissao_percentual: 0, active: false };

  const contextValue = useMemo(() => ({
      session, profile, isLoading, configError, setupHealth, activeView, tecnicos, orders, settings,
      selectedOSId, selectedOS, currentTecnico, fallbackTecnico,
      setActiveView, setSelectedOSId, handleLogout, handleUpdateSetting, handleCreateOS,
      updateOrderStatus, updateOSFields, updateOSChecklist, handleDeleteOS, handleOpenWarranty,
      handleCreateTecnico, handleUpdateTecnico, handleDeleteTecnico, handleAIAction, retryDbCheck
  }), [
      session, profile, isLoading, configError, setupHealth, activeView, tecnicos, orders, settings,
      selectedOSId, selectedOS, currentTecnico, setActiveView, handleLogout, handleUpdateSetting, 
      handleCreateOS, updateOrderStatus, updateOSFields, updateOSChecklist, handleDeleteOS, 
      handleOpenWarranty, handleCreateTecnico, handleUpdateTecnico, handleDeleteTecnico, 
      handleAIAction, retryDbCheck
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
