import React from 'react';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { HomeChat } from './components/HomeChat';
import { OSList } from './components/OSList';
import { OSDetail } from './components/OSDetail';
import { FinancialView } from './components/FinancialView';
import { SettingsView } from './components/SettingsView';
import { ReportsView } from './components/ReportsView';
import { SetupView } from './components/DatabaseHealthCheck';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from './AppContext';

const App: React.FC = () => {
  const {
    isLoading,
    configError,
    session,
    setupHealth,
    activeView,
    selectedOS,
    currentTecnico,
    fallbackTecnico,
    retryDbCheck,
  } = useAppContext();

  if (isLoading) {
    return (
      <div className="bg-slate-950 h-screen flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-sm font-bold uppercase tracking-widest">Analisando Sistema...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="bg-slate-950 h-screen flex flex-col items-center justify-center text-red-400 p-8">
        <AlertTriangle className="mb-4" size={32} />
        <h1 className="text-lg font-bold uppercase mb-2">Erro de Configuração</h1>
        {configError === 'supabase_missing' && <p className="text-center text-sm">As variáveis de ambiente do Supabase não foram encontradas.</p>}
        {configError === 'stripe_key_detected' && <p className="text-center text-sm">Chave do Stripe detectada. Use a chave anônima (anon key) do Supabase.</p>}
      </div>
    );
  }
  
  if (!session) {
    return <Login />;
  }

  if (!setupHealth.isHealthy) {
    return <SetupView health={setupHealth} onRetry={retryDbCheck} />;
  }
  
  const renderView = () => {
    if (selectedOS && activeView === 'os') {
      return <OSDetail os={selectedOS} tecnico={currentTecnico || fallbackTecnico} />;
    }
    switch (activeView) {
      case 'home': return <HomeChat />;
      case 'os': return <OSList />;
      case 'finance': return <FinancialView />;
      case 'settings': return <SettingsView />;
      case 'reports': return <ReportsView />;
      default: return null;
    }
  };
  
  return <Layout>{renderView()}</Layout>;
};

export default App;