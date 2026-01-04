import { Lojista, Tecnico, OrdemServico, PecaEstoque } from '../types';

export const mockLojistas: Lojista[] = [
  { id: '1', nome: 'Tiago Celulares', whatsapp: '11999999999', saldo_devedor: 1250.00, created_at: new Date().toISOString() },
  { id: '2', nome: 'Banca do João', whatsapp: '11888888888', saldo_devedor: 450.00, created_at: new Date().toISOString() },
  { id: '3', nome: 'Fast Repair ME', whatsapp: '11777777777', saldo_devedor: 0, created_at: new Date().toISOString() },
];

export const mockTecnicos: Tecnico[] = [
  { id: 't1', nome: 'André', especialidade: 'Telas e Baterias', comissao_percentual: 10, active: true },
  { id: 't2', nome: 'Carlos', especialidade: 'Placas Micro-soldagem', comissao_percentual: 15, active: true },
];

export const mockOS: OrdemServico[] = [
  { 
    id: 101, 
    tecnico_id: 't1', 
    modelo: 'iPhone 14 Pro Max', 
    defeito_reclamado: 'Tela Quebrada', 
    status: 'novo', 
    valor_cobrado: 1200, 
    pecas_usadas: [],
    // Added missing required checklist field
    checklist: [],
    // Fix: Adding missing properties for OrdemServico interface
    custo_pecas: 350,
    custo_outros: 0,
    prioridade: 'alta',
    tipo_servico: 'hardware',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 102, 
    tecnico_id: 't2', 
    modelo: 'S23 Ultra', 
    defeito_reclamado: 'Não Liga', 
    status: 'novo', 
    valor_cobrado: 850, 
    pecas_usadas: [],
    // Added missing required checklist field
    checklist: [],
    // Fix: Adding missing properties for OrdemServico interface
    custo_pecas: 0,
    custo_outros: 0,
    prioridade: 'critica',
    tipo_servico: 'hardware',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 103, 
    tecnico_id: 't1', 
    modelo: 'Macbook Air M2', 
    defeito_reclamado: 'Teclado Falhando', 
    status: 'pronto', 
    valor_cobrado: 1500, 
    pecas_usadas: [],
    // Added missing required checklist field
    checklist: [],
    // Fix: Adding missing properties for OrdemServico interface
    custo_pecas: 200,
    custo_outros: 0,
    prioridade: 'media',
    tipo_servico: 'hardware',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
];

export const mockEstoque: PecaEstoque[] = [
  { id: 'p1', nome: 'Tela iPhone 14 Pro Max Incell', preco_custo: 350, quantidade: 5 },
  { id: 'p2', nome: 'Bateria iPhone 13 Original', preco_custo: 120, quantidade: 12 },
  { id: 'p3', nome: 'Conector de Carga Moto G52', preco_custo: 15, quantidade: 25 },
];