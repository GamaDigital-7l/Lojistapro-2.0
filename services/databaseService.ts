import { supabase } from './supabaseClient';
import { Tecnico, OrdemServico, Profile } from '../types';

const ensureClient = () => {
  if (!supabase) throw new Error("Supabase não configurado corretamente.");
  return supabase;
};

const handleReadError = (error: any, context: string) => {
  console.error(`❌ Erro em ${context}:`, error?.message || error);
  if (error?.message?.includes('column') || error?.message?.includes('relation') || error.message.includes('function')) {
    console.error("DICA: Erro de banco de dados. A estrutura no Supabase pode estar incompleta ou uma função auxiliar pode estar faltando.");
  }
  throw error;
};

const handleWriteError = (error: any, context: string) => {
  console.error(`❌ Erro em ${context}:`, error?.message || error);
  if (error?.message?.includes('schema "supabase_functions" does not exist')) {
    console.error("DICA DE DEBUG: Este erro geralmente significa que um gatilho do banco de dados (ex: 'on_new_os_created') está tentando chamar uma Edge Function que não foi implantada (deployed) corretamente no Supabase. O schema 'supabase_functions' é criado automaticamente apenas após o primeiro deploy de uma função. Verifique o guia de configuração da Integração Google Sheets nos Ajustes e garanta que a função 'google-sheets-sync' foi criada E implantada com sucesso ANTES de criar o gatilho no SQL Editor.");
  }
  return null;
}

export const db = {
  profiles: {
    async getById(id: string): Promise<Profile | null> {
      try {
        const client = ensureClient();
        const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data as Profile;
      } catch (e) {
        return handleReadError(e, 'profiles.getById');
      }
    },
    async create(profile: Profile): Promise<Profile | null> {
      try {
        const client = ensureClient();
        const { data, error } = await client.from('profiles').insert(profile).select().single();
        if (error) throw error;
        return data as Profile;
      } catch (e) {
        handleWriteError(e, 'profiles.create');
        return null;
      }
    }
  },
  system: {
    async checkDependencies() {
      try {
        const client = ensureClient();
        // This function is defined in the setup SQL in SettingsView
        const { data, error } = await client.rpc('check_custom_types_exist');
        if (error) throw error;
        if (data === false) throw new Error('type "public.os_status" does not exist');
        return true;
      } catch (e) {
        return handleReadError(e, 'system.checkDependencies');
      }
    },
    async diagnose() {
      try {
        const client = ensureClient();
        const { data, error } = await client.rpc('diagnose_database_setup');
        if (error) throw error;
        return { success: true, diagnostics: data };
      } catch (error) {
        console.error("Falha ao executar o diagnóstico do banco de dados.", error);
        return { success: false, error };
      }
    }
  },
  settings: {
    async getAll() {
      try {
        const client = ensureClient();
        const { data, error } = await client.from('settings').select('*');
        if (error) throw error;
        return (data || []).reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as { [key: string]: string });
      } catch (e) {
        return handleReadError(e, 'settings.getAll');
      }
    },
    async set(key: string, value: string) {
       try {
        const client = ensureClient();
        const { error } = await client.from('settings').upsert({ key, value });
        if (error) throw error;
        return true;
      } catch (e) {
        handleWriteError(e, 'settings.set');
        return false;
      }
    }
  },
  tecnicos: {
    async getAll() { try { const client = ensureClient(); const { data, error } = await client.from('tecnicos').select('*').order('nome'); if (error) throw error; return (data || []) as Tecnico[]; } catch (e) { return handleReadError(e, 'tecnicos.getAll'); } },
    async create(tecnico: Partial<Tecnico>) { try { const client = ensureClient(); const { data, error } = await client.from('tecnicos').insert([tecnico]).select(); if (error) throw error; return data ? data[0] as Tecnico : null; } catch (e) { return handleWriteError(e, 'tecnicos.create'); } },
    async update(id: string, updates: Partial<Tecnico>) { try { const client = ensureClient(); const { error } = await client.from('tecnicos').update(updates).eq('id', id); if (error) throw error; return true; } catch (e) { handleWriteError(e, 'tecnicos.update'); return false; } },
    async delete(id: string) { try { const client = ensureClient(); const { error } = await client.from('tecnicos').delete().eq('id', id); if (error) throw error; return true; } catch (e) { handleWriteError(e, 'tecnicos.delete'); return false; } }
  },
  os: {
    async getAll() { try { const client = ensureClient(); const { data, error } = await client.from('ordens_servico').select('*').order('created_at', { ascending: false }); if (error) throw error; return (data || []) as OrdemServico[]; } catch (e) { return handleReadError(e, 'os.getAll'); } },
    async create(os: Partial<OrdemServico>): Promise<boolean> {
      try {
        if (!os.id) throw new Error("O ID da OS é obrigatório.");
        const client = ensureClient();
        const rpc_payload = {
          p_id: os.id,
          p_checklist: os.checklist || [],
          p_custo_outros: os.custo_outros || 0,
          p_custo_pecas: os.custo_pecas || 0,
          p_defeito_reclamado: os.defeito_reclamado || '',
          p_modelo: os.modelo,
          p_parent_os_id: os.parent_os_id || null,
          p_pecas_usadas: os.pecas_usadas || [],
          p_prioridade: os.prioridade || 'media',
          p_status: os.status || 'novo',
          p_tecnico_id: os.tecnico_id || null,
          p_tipo_servico: os.tipo_servico || 'hardware',
          p_valor_cobrado: os.valor_cobrado || 0,
        };
        const { error } = await client.rpc('create_os_rpc_void', rpc_payload);
        if (error) throw error;
        return true;
      } catch (e) {
        handleWriteError(e, 'os.create (RPC VOID)');
        return false;
      }
    },
    async update(id: number, updates: Partial<OrdemServico>) { try { const client = ensureClient(); const { error } = await client.from('ordens_servico').update(updates).eq('id', id); if (error) throw error; return true; } catch (e) { handleWriteError(e, 'os.update'); return false; } },
    async delete(id: number) { try { const client = ensureClient(); const { error } = await client.from('ordens_servico').delete().eq('id', id); if (error) throw error; return true; } catch(e) { handleWriteError(e, 'os.delete'); return false; } }
  },
};