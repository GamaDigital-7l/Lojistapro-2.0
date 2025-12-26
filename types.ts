// FIX: Add missing Lojista type
export interface Lojista {
  id: string;
  nome: string;
  whatsapp: string;
  saldo_devedor: number;
  created_at: string;
}

export type UserRole = 'admin' | 'tecnico';

export interface Profile {
  id: string;
  nome: string;
  papel: UserRole;
  avatar_url?: string;
}

export interface Tecnico {
  id: string;
  nome: string;
  especialidade: string;
  comissao_percentual: number;
  active: boolean;
}

export type OSStatus = 'novo' | 'pronto' | 'pago' | 'garantia';
export type OSPrioridade = 'baixa' | 'media' | 'alta' | 'critica';
export type OSTipo = 'hardware' | 'software' | 'limpeza' | 'outro';

export interface PecaUsada {
  nome: string;
  quantidade: number;
  preco: number;
}

// FIX: Add missing PecaEstoque type.
export interface PecaEstoque {
  id: string;
  nome: string;
  preco_custo: number;
  quantidade: number;
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface OrdemServico {
  id: number;
  tecnico_id: string;
  modelo: string;
  defeito_reclamado: string;
  laudo_tecnico?: string;
  pecas_usadas: PecaUsada[];
  checklist: ChecklistItem[];
  valor_cobrado: number;
  custo_pecas: number;
  custo_outros: number;
  status: OSStatus;
  prioridade: OSPrioridade;
  tipo_servico: OSTipo;
  parent_os_id?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  os_id: number;
  usuario_id: string;
  acao: string;
  valor_anterior: string;
  valor_novo: string;
  data_hora: string;
}

export type View = 'home' | 'os' | 'finance' | 'settings' | 'reports';