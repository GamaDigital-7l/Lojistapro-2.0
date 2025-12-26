import React, { useState, useEffect } from 'react';
import { User, LogOut, Wrench, Settings, Database, Trash2, Edit2, X, CheckCircle, UserPlus, Download, FileSpreadsheet, Code, Save, Zap } from 'lucide-react';
import { Tecnico } from '../types';
import { useAppContext } from '../AppContext';

const CodeBlock: React.FC<{ code: string; title: string; lang: 'javascript' | 'sql' }> = ({ code, title, lang }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-slate-950/50 rounded-lg overflow-hidden border border-slate-700 mb-4">
      <div className="flex justify-between items-center bg-slate-800 px-4 py-2">
        <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Code size={14} /> {title}</span>
        <button onClick={handleCopy} className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white">
          {copied ? <CheckCircle size={14} className="text-green-400" /> : <Code size={14} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="p-4 text-[10px] text-slate-300 overflow-x-auto"><code className={`language-${lang}`}>{code.trim()}</code></pre>
    </div>
  );
};

const MASTER_SETUP_SQL = `
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

const EDGE_FUNCTION_CODE = `
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Utility to create a JWT for Google API authentication
async function createJwt(email, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const strToSign = [
    btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_"),
    btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_"),
  ].join(".");

  const key = await crypto.subtle.importKey(
    "pkcs8",
    (new TextEncoder()).encode(privateKey).buffer.slice(27, -25),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    (new TextEncoder()).encode(strToSign),
  );

  return strToSign + "." + btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record, old_record, type } = await req.json();
    const credsJson = Deno.env.get("GOOGLE_CREDENTIALS_JSON");
    if (!credsJson) throw new Error("Credenciais do Google não encontradas.");
    
    const { client_email, private_key } = JSON.parse(credsJson);

    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );

    const { data: settings } = await supabaseAdminClient.from('settings').select('value').eq('key', 'google_sheet_id').single();
    if (!settings || !settings.value) throw new Error("ID da Planilha não encontrado.");
    const SHEET_ID = settings.value;

    const jwt = await createJwt(client_email, private_key);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    const { access_token } = await tokenResponse.json();
    if (!access_token) throw new Error("Falha ao obter token de acesso do Google.");

    const os = type === 'DELETE' ? old_record : record;
    const { data: tecnico } = await supabaseAdminClient.from('tecnicos').select('nome').eq('id', os.tecnico_id).single();
    
    const osData = [
      os.id,
      new Date(os.created_at).toLocaleString("pt-BR"),
      os.modelo,
      os.defeito_reclamado,
      os.status,
      tecnico?.nome || "N/A",
      os.valor_cobrado,
      os.custo_pecas,
      os.custo_outros,
      os.valor_cobrado - os.custo_pecas - os.custo_outros,
      os.laudo_tecnico || ""
    ];

    const sheetsApi = \`https://sheets.googleapis.com/v4/spreadsheets/\${SHEET_ID}\`;
    const headers = { Authorization: \`Bearer \${access_token}\`, "Content-Type": "application/json" };
    
    // Find row with OS ID
    const findResponse = await fetch(\`\${sheetsApi}/values/A:A\`, { headers });
    const { values } = await findResponse.json();
    const rowIndex = values ? values.findIndex(row => row[0] == os.id) : -1;

    if (type === 'DELETE') {
      if (rowIndex !== -1) {
        await fetch(\`\${sheetsApi}:batchUpdate\`, {
          method: "POST", headers,
          body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: 0, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }),
        });
      }
    } else if (rowIndex === -1) { // INSERT
       await fetch(\`\${sheetsApi}/values/A1:append?valueInputOption=USER_ENTERED\`, {
        method: "POST", headers,
        body: JSON.stringify({ values: [osData] }),
      });
    } else { // UPDATE
      await fetch(\`\${sheetsApi}/values/A\${rowIndex + 1}?valueInputOption=USER_ENTERED\`, {
        method: "PUT", headers,
        body: JSON.stringify({ values: [osData] }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Erro na Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
`;

const SQL_TRIGGER_CODE = `
-- Remover gatilho antigo, se existir
DROP TRIGGER IF EXISTS on_os_change_for_sheets ON public.ordens_servico;
-- Remover função antiga, se existir
DROP FUNCTION IF EXISTS public.notify_google_sheets_on_os_change();

-- Criar a função de gatilho que chamará a Edge Function
CREATE OR REPLACE FUNCTION public.notify_google_sheets_on_os_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM net.http_post(
    url:='https://wcuaurjbmduehdypsqew.supabase.co/functions/v1/google-sheets-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWF1cmpibWR1ZWhkeXBzcWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MjcwMjUsImV4cCI6MjA4MjEwMzAyNX0.SzVoYZPgxd3-2tObEBdmE9amrw75j-uiM4S-TXgXVfI"}'::jsonb,
    body:=jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );
  RETURN NEW;
END;
$$;

-- Criar o gatilho que executa a função em cada mudança
CREATE TRIGGER on_os_change_for_sheets
AFTER INSERT OR UPDATE OR DELETE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.notify_google_sheets_on_os_change();
`;

export const SettingsView: React.FC = () => {
  const { 
    tecnicos, 
    orders,
    settings,
    handleCreateTecnico, 
    handleUpdateTecnico, 
    handleDeleteTecnico,
    handleUpdateSetting,
    handleLogout
  } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [comissao, setComissao] = useState(10);
  
  const [sheetId, setSheetId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');

  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isSavingOpenAI, setIsSavingOpenAI] = useState(false);

  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (editingTecnico) {
      setNome(editingTecnico.nome);
      setEspecialidade(editingTecnico.especialidade);
      setComissao(editingTecnico.comissao_percentual);
      setShowModal(true);
    } else {
      setNome('');
      setEspecialidade('');
      setComissao(10);
    }
  }, [editingTecnico]);

  useEffect(() => {
    setSheetId(settings.google_sheet_id || '');
    setGeminiKey(settings.gemini_api_key || '');
    setOpenAIKey(settings.openai_api_key || '');
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!nome) return;
    const data = { nome, especialidade, comissao_percentual: comissao, active: true };
    if (editingTecnico) handleUpdateTecnico(editingTecnico.id, data); else handleCreateTecnico(data);
    closeModal();
  };
  
  const handleSaveSetting = async (key: string, value: string, setSavingState: React.Dispatch<React.SetStateAction<boolean>>) => {
    setSavingState(true);
    await handleUpdateSetting(key, value);
    setSavingState(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID OS', 'Data', 'Cliente', 'Aparelho', 'Defeito', 'Status', 'Técnico', 'Valor Cobrado (R$)', 'Custo Peças (R$)', 'Outros Custos (R$)', 'Lucro Líquido (R$)', '% Comissão', 'Valor Comissão (R$)'];
    const escapeCsvCell = (cell: any) => {
      const cellStr = String(cell ?? '');
      return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
    };
    const rows = orders.map(os => {
      const tecnico = tecnicos.find(t => t.id === os.tecnico_id);
      const valorCobrado = os.valor_cobrado || 0, custoPecas = os.custo_pecas || 0, custoOutros = os.custo_outros || 0;
      const lucro = valorCobrado - custoPecas - custoOutros;
      const comissaoPercentual = tecnico ? tecnico.comissao_percentual : 0;
      const valorComissao = os.status === 'pago' && lucro > 0 ? (lucro * comissaoPercentual) / 100 : 0;
      return [os.id, new Date(os.created_at).toLocaleDateString('pt-BR'), 'Loja', os.modelo, os.defeito_reclamado, os.status, tecnico?.nome || 'N/A', valorCobrado.toFixed(2), custoPecas.toFixed(2), custoOutros.toFixed(2), lucro.toFixed(2), comissaoPercentual, valorComissao.toFixed(2)].map(escapeCsvCell).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `backup_os_lojista_pro_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => { setShowModal(false); setEditingTecnico(null); };

  return (
    <div className="p-6 space-y-8 pb-20">

      <section>
        <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-purple-400" /><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chaves de API (Inteligência Artificial)</h3></div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Configure as chaves de API para habilitar as funcionalidades do Chat Rápido. O sistema dará preferência à chave do Google Gemini.
          </p>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Google Gemini API Key</label>
            <div className="flex gap-2">
              <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Cole sua chave do AI Studio aqui" className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" />
              <button onClick={() => handleSaveSetting('gemini_api_key', geminiKey, setIsSavingGemini)} disabled={isSavingGemini} className="bg-blue-600 text-white font-bold p-3 rounded-xl disabled:opacity-50 active:scale-95 transition-all"><Save size={16} /></button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">OpenAI API Key (Opcional)</label>
            <div className="flex gap-2">
              <input type="password" value={openAIKey} onChange={e => setOpenAIKey(e.target.value)} placeholder="sk-..." className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" />
              <button onClick={() => handleSaveSetting('openai_api_key', openAIKey, setIsSavingOpenAI)} disabled={isSavingOpenAI} className="bg-slate-700 text-white font-bold p-3 rounded-xl disabled:opacity-50 active:scale-95 transition-all"><Save size={16} /></button>
            </div>
          </div>
        </div>
      </section>
      
      <section>
        <div className="flex items-center gap-2 mb-4"><FileSpreadsheet size={18} className="text-green-400" /><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Integração Google Sheets</h3></div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Sincronize suas Ordens de Serviço automaticamente com uma Planilha Google para ter um backup em tempo real e facilitar a análise de dados.
          </p>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ID da Planilha Google</label>
            <div className="flex gap-2">
              <input type="text" value={sheetId} onChange={e => setSheetId(e.target.value)} placeholder="Cole o ID da sua planilha aqui" className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" />
              <button onClick={() => handleSaveSetting('google_sheet_id', sheetId, setIsSavingSheet)} disabled={isSavingSheet} className="bg-green-600 text-white font-bold p-3 rounded-xl disabled:opacity-50 active:scale-95 transition-all"><Save size={16} /></button>
            </div>
          </div>
          <button onClick={() => setShowSetup(!showSetup)} className="text-xs text-slate-500 hover:text-blue-400 font-bold text-left">{showSetup ? 'Ocultar Guia de Configuração' : 'Exibir Guia de Configuração...'}</button>
          {showSetup && <div className="border-t border-slate-800 pt-4 space-y-4 text-slate-400 text-xs animate-in fade-in duration-300">
            <ol className="list-decimal list-inside space-y-4 pl-2">
              <li><span className="font-bold text-slate-200">Google Cloud &amp; Planilhas:</span> Crie uma Conta de Serviço no Google Cloud com papel de "Editor", ative a API do Google Sheets e crie uma chave JSON. Compartilhe sua Planilha Google com o e-mail da conta de serviço.</li>
              <li><span className="font-bold text-slate-200">Crie a Edge Function:</span> No Supabase, crie uma Edge Function chamada <code className="bg-slate-950 px-1 py-0.5 rounded">google-sheets-sync</code>, cole o código abaixo e adicione o conteúdo da sua chave JSON em um segredo chamado <code className="bg-slate-950 px-1 py-0.5 rounded">GOOGLE_CREDENTIALS_JSON</code>. Faça o deploy.</li>
              <CodeBlock title="Edge Function: google-sheets-sync" lang="javascript" code={EDGE_FUNCTION_CODE} />
              <li><span className="font-bold text-slate-200">Ative o Gatilho no Banco:</span> No SQL Editor do Supabase, cole e execute o código SQL abaixo para que cada mudança em uma OS chame a Edge Function.</li>
              <CodeBlock title="Gatilho do Banco de Dados (SQL)" lang="sql" code={SQL_TRIGGER_CODE} />
              <li><span className="font-bold text-slate-200">Cole o ID da Planilha:</span> Pegue o ID da URL da sua planilha, cole no campo acima e salve.</li>
            </ol>
          </div>}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Wrench size={18} className="text-blue-400" /><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Equipe Técnica</h3></div></div>
        <div className="space-y-3">
          {tecnicos.map(t => (<div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 group"><div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><User size={20} /></div><div className="flex-1"><h4 className="text-sm font-bold text-slate-100">{t.nome}</h4><p className="text-[10px] text-slate-500 uppercase font-semibold">{t.especialidade}</p></div><div className="text-right mr-4"><p className="text-[10px] text-slate-500 uppercase font-semibold">Comissão</p><p className="text-sm font-bold text-blue-400">{t.comissao_percentual}%</p></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all"><button aria-label={`Editar ${t.nome}`} onClick={() => setEditingTecnico(t)} className="p-2 text-slate-500 hover:text-blue-400"><Edit2 size={16} /></button><button aria-label={`Excluir ${t.nome}`} onClick={() => handleDeleteTecnico(t.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div></div>))}
          <button onClick={() => { setEditingTecnico(null); setShowModal(true); }} className="w-full py-3 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs font-bold uppercase hover:bg-slate-900/50 transition-all flex items-center justify-center gap-2"><UserPlus size={14} /> Adicionar Técnico</button>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4"><Database size={18} className="text-blue-400" /><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Backup de Dados Manual</h3></div>
        <button onClick={handleExportCSV} className="w-full py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-slate-300 text-xs font-bold uppercase hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2"><Download size={14} /> Exportar Ordens de Serviço (.csv)</button>
      </section>
      
      <section className="space-y-4"><div className="flex items-center gap-2 mb-4"><Settings size={18} className="text-blue-400" /><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sistema</h3></div><button onClick={handleLogout} className="w-full py-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl text-xs font-bold uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"><LogOut size={16} /> Sair do Sistema</button></section>

      {showModal && <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-8"><h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">{editingTecnico ? 'Editar Técnico' : 'Novo Técnico'}</h3><button aria-label="Fechar modal" onClick={closeModal} className="text-slate-500 hover:text-slate-300"><X size={24} /></button></div><form onSubmit={handleSubmit} className="space-y-6"><div><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Nome Completo</label><input autoFocus type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do colaborador" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500 outline-none"/></div><div><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Especialidade</label><input type="text" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder="Ex: Micro-soldagem, Apple, etc" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500 outline-none"/></div><div><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Comissão (%)</label><input type="number" value={comissao} onChange={(e) => setComissao(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500 outline-none"/></div><button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"><CheckCircle size={18} /> {editingTecnico ? 'Atualizar' : 'Cadastrar'}</button></form></div></div>}
    </div>
  );
};