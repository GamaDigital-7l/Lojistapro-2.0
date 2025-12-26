import React, { useState, useMemo } from 'react';
import { Database, AlertTriangle, Copy, Check, RefreshCw, Code, ArrowRight, XCircle, CheckCircle } from 'lucide-react';
import { DbDiagnostics, SetupHealth } from '../AppContext';

const MASTER_SETUP_SQL_FOR_RECOVERY = `
-- LOJISTA PRO 2.0 - SCRIPT MESTRE DE CONFIGURAÇÃO V8 (EDGE FUNCTIONS)
-- ATENÇÃO: Este script irá APAGAR tabelas e funções existentes para criar a nova estrutura.
-- FAÇA UM BACKUP MANUAL (CSV) ANTES DE EXECUTAR!

-- 0. REMOVER ESTRUTURAS ANTIGAS (INCLUINDO AS DE IA)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.moddatetime() CASCADE;
DROP FUNCTION IF EXISTS public.check_custom_types_exist() CASCADE;
DROP FUNCTION IF EXISTS public.create_os_rpc_void(bigint,jsonb,numeric,numeric,text,text,bigint,jsonb,text,text,uuid,text,numeric) CASCADE;
DROP FUNCTION IF EXISTS public.gemini_proxy_rpc(input_text text, context_data jsonb) CASCADE; -- Deprecated
DROP FUNCTION IF EXISTS public.ensure_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.check_api_key_status() CASCADE; -- Deprecated
DROP FUNCTION IF EXISTS public.diagnose_database_setup() CASCADE;
DROP TABLE IF EXISTS public.ordens_servico CASCADE;
DROP TABLE IF EXISTS public.lojistas CASCADE;
DROP TABLE IF EXISTS public.tecnicos CASCADE;
DROP TABLE IF EXISTS public.pecas_estoque CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.os_status CASCADE;
DROP TYPE IF EXISTS public.os_prioridade CASCADE;
DROP TYPE IF EXISTS public.os_tipo CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 1. FUNÇÃO DE DIAGNÓSTICO LEGADA (PARA O APP FUNCIONAR)
CREATE OR REPLACE FUNCTION public.check_custom_types_exist()
RETURNS boolean AS $$
DECLARE type_count integer;
BEGIN
  SELECT count(*) INTO type_count
  FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname IN ('os_status', 'os_prioridade', 'os_tipo', 'user_role') AND n.nspname = 'public';
  RETURN type_count = 4;
END;
$$ LANGUAGE plpgsql;

-- 2. CRIAR OS TIPOS (ENUMS)
CREATE TYPE public.os_status AS ENUM ('novo', 'pronto', 'pago', 'garantia');
CREATE TYPE public.os_prioridade AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.os_tipo AS ENUM ('hardware', 'software', 'limpeza', 'outro');
CREATE TYPE public.user_role AS ENUM ('admin', 'tecnico');

-- 3. CRIAR TABELA DE PERFIS
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome character varying,
  papel public.user_role NOT NULL,
  avatar_url character varying
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

-- 4. CRIAR TABELA DE TÉCNICOS
CREATE TABLE public.tecnicos (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  nome character varying NOT NULL,
  especialidade character varying,
  comissao_percentual numeric DEFAULT 10 NOT NULL,
  active boolean DEFAULT true NOT NULL
);
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.tecnicos FOR ALL USING (auth.role() = 'authenticated');

-- 5. CRIAR TABELA DE CONFIGURAÇÕES
CREATE TABLE public.settings ( key text NOT NULL PRIMARY KEY, value text );
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- 6. CRIAR FUNÇÃO DE TIMESTAMP
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR TABELA DE ORDENS DE SERVIÇO
CREATE TABLE public.ordens_servico (
  id bigint NOT NULL PRIMARY KEY,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  modelo text NOT NULL,
  defeito_reclamado text NOT NULL,
  laudo_tecnico text,
  pecas_usadas jsonb DEFAULT '[]'::jsonb NOT NULL,
  checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
  valor_cobrado numeric DEFAULT 0 NOT NULL,
  custo_pecas numeric DEFAULT 0 NOT NULL,
  custo_outros numeric DEFAULT 0 NOT NULL,
  status public.os_status DEFAULT 'novo'::public.os_status NOT NULL,
  prioridade public.os_prioridade DEFAULT 'media'::public.os_prioridade NOT NULL,
  tipo_servico public.os_tipo DEFAULT 'hardware'::public.os_tipo NOT NULL,
  parent_os_id bigint REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.ordens_servico FOR ALL USING (auth.role() = 'authenticated');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE PROCEDURE public.moddatetime();

-- 8. GATILHO E FUNÇÃO DE CRIAÇÃO DE PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, papel)
  VALUES (
    new.id,
    split_part(new.email, '@', 1),
    CASE
      WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin'::public.user_role
      ELSE 'tecnico'::public.user_role
    END
  );
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. FUNÇÃO RPC PARA CRIAR OS
CREATE OR REPLACE FUNCTION public.create_os_rpc_void(p_id bigint, p_checklist jsonb, p_custo_outros numeric, p_custo_pecas numeric, p_defeito_reclamado text, p_modelo text, p_parent_os_id bigint, p_pecas_usadas jsonb, p_prioridade text, p_status text, p_tecnico_id uuid, p_tipo_servico text, p_valor_cobrado numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.ordens_servico (id, tecnico_id, modelo, defeito_reclamado, valor_cobrado, custo_pecas, custo_outros, status, prioridade, tipo_servico, checklist, pecas_usadas, parent_os_id)
    VALUES (p_id, p_tecnico_id, p_modelo, p_defeito_reclamado, p_valor_cobrado, p_custo_pecas, p_custo_outros, p_status::public.os_status, p_prioridade::public.os_prioridade, p_tipo_servico::public.os_tipo, p_checklist, p_pecas_usadas, p_parent_os_id);
END;
$$;

-- 10. FUNÇÃO RPC PARA GARANTIR PERFIL
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  user_id uuid := auth.uid(); user_email text; profile_data jsonb;
BEGIN
  SELECT to_jsonb(p) INTO profile_data FROM public.profiles p WHERE id = user_id;
  IF profile_data IS NOT NULL THEN RETURN profile_data; END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  INSERT INTO public.profiles (id, nome, papel) VALUES (user_id, split_part(user_email, '@', 1), CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin'::public.user_role ELSE 'tecnico'::public.user_role END)
  RETURNING to_jsonb(profiles.*) INTO profile_data;
  RETURN profile_data;
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('error', SQLERRM); END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 11. FUNÇÃO DE DIAGNÓSTICO GERAL DA ESTRUTURA (SIMPLIFICADA)
CREATE OR REPLACE FUNCTION public.diagnose_database_setup()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'profiles_table_exists', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'profiles'),
    'os_table_exists', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'ordens_servico'),
    'tecnicos_table_exists', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'tecnicos'),
    'settings_table_exists', EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'settings'),
    'ensure_profile_fn_exists', EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'ensure_user_profile')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.diagnose_database_setup() TO authenticated;
`;

const DIAGNOSIS_ITEMS = [
  { key: 'profiles_table_exists', label: 'Tabela de Perfis' },
  { key: 'os_table_exists', label: 'Tabela de Ordens de Serviço' },
  { key: 'tecnicos_table_exists', label: 'Tabela de Técnicos' },
  { key: 'settings_table_exists', label: 'Tabela de Configurações' },
  { key: 'ensure_profile_fn_exists', label: 'Função de Perfil de Usuário' },
];

const DiagnosisItem: React.FC<{ label: string; status: boolean | undefined }> = ({ label, status }) => (
  <div className="flex items-center justify-between text-xs p-2 bg-slate-950/50 rounded-md">
    <span className="text-slate-400">{label}</span>
    {status === true && <CheckCircle size={16} className="text-green-500" />}
    {status === false && <XCircle size={16} className="text-red-500" />}
    {status === undefined && <div className="w-4 h-4 bg-slate-700 rounded-full animate-pulse" />}
  </div>
);


export const SetupView: React.FC<{ health: SetupHealth; onRetry: () => void }> = ({ health, onRetry }) => {
  const [copied, setCopied] = useState(false);
  const { diagnostics, error } = health;

  const errorInfo = useMemo(() => {
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes("timeout") || errorMessage.includes("responder")) {
      return {
        title: "Tempo de Conexão Excedido",
        description: "O sistema não conseguiu se conectar ao seu banco de dados a tempo. Isso pode ser um problema temporário com o Supabase ou sua conexão de internet. Por favor, tente novamente.",
        showScript: false
      };
    }
    if (diagnostics) {
      return {
        title: "Reparo do Sistema Necessário",
        description: "Detectamos que a configuração do seu banco de dados está incompleta. Um ou mais componentes essenciais estão faltando.",
        showScript: true
      };
    }
    return {
      title: "Erro Inesperado na Inicialização",
      description: `Ocorreu um erro ao iniciar o sistema. Detalhes: ${error?.message || 'Erro desconhecido.'}. Tente novamente ou, se o erro persistir, execute o Script de Reparo.`,
      showScript: true
    };
  }, [health]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(MASTER_SETUP_SQL_FOR_RECOVERY.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-slate-950 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2rem] max-w-2xl w-full shadow-2xl">
        <AlertTriangle className="mx-auto mb-4 text-red-500" size={32} />
        <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter mb-2 text-center">{errorInfo.title}</h1>
        <p className="text-slate-400 text-xs sm:text-sm mb-6 text-center">{errorInfo.description}</p>
        
        {errorInfo.showScript ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 text-left">
            <h2 className="text-sm font-bold text-slate-200 mb-3">Diagnóstico Automático</h2>
            <div className="space-y-1 mb-4">
              {DIAGNOSIS_ITEMS.map(item => (
                <DiagnosisItem key={item.key} label={item.label} status={diagnostics ? diagnostics[item.key as keyof DbDiagnostics] : undefined} />
              ))}
            </div>
            <p className="text-xs text-slate-500 mb-4">Um item marcado com <XCircle size={12} className="inline text-red-500"/> indica que uma parte essencial do sistema está faltando no banco de dados.</p>
            
            <div className="border-t border-slate-800 pt-4">
              <h2 className="text-sm font-bold text-slate-200 mb-2">Solução Recomendada</h2>
              <p className="text-xs text-slate-400 mb-4">Para garantir a estabilidade do sistema, a solução é executar novamente o **Script Mestre de Reparo**. Ele irá apagar as estruturas antigas e criar a versão mais recente e correta.</p>
              <p className="text-xs font-bold text-amber-400 mb-4">ATENÇÃO: Este processo irá apagar os dados existentes. Exporte suas Ordens de Serviço em CSV na tela de 'Ajustes' antes de continuar, se possível.</p>

              <div className="bg-slate-950/50 rounded-lg overflow-hidden border border-slate-700 mb-4">
                <div className="flex justify-between items-center bg-slate-800 px-4 py-2">
                  <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Code size={14} /> Script de Reparo V8</span>
                  <button onClick={handleCopy} className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-4">
                Copie o script, cole no <strong>SQL Editor</strong> do seu projeto Supabase e execute. Depois, volte para o aplicativo.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <a 
                href={`https://supabase.com/dashboard/project/wcuaurjbmduehdypsqew/sql/new`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
              >
                Abrir Supabase <ArrowRight size={16} />
              </a>
              <button 
                onClick={onRetry} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw size={14} /> Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onRetry} 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw size={14} /> Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};