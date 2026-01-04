import { 
  ClipboardList, 
  Wallet, 
  Settings, 
  Users,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { View, UserRole } from './types';

export const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-slate-500/10 text-slate-400 border-slate-800',
  pronto: 'bg-blue-600/10 text-blue-400 border-blue-500/30', // Finalizado = Azul
  pago: 'bg-green-600/10 text-green-500 border-green-500/30', // Pago = Verde
  garantia: 'bg-purple-600/10 text-purple-400 border-purple-500/30',
};

export const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  pronto: 'Finalizado',
  pago: 'Pago',
  garantia: 'Garantia',
};

export const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: 'bg-slate-800 text-slate-400',
  media: 'bg-blue-900/40 text-blue-300',
  alta: 'bg-orange-900/40 text-orange-300',
  critica: 'bg-red-900/60 text-red-200 border-red-500/30',
};

export const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Normal',
  alta: 'Alta',
  critica: 'URGENTE',
};

export const TIPO_LABELS: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  limpeza: 'Limpeza/Prev',
  outro: 'Outro',
};

export const NAVIGATION_ITEMS = [
  { id: 'home', label: 'Chat Rápido', icon: MessageSquare },
  { id: 'os', label: 'OS', icon: ClipboardList },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'finance', label: 'Financeiro', icon: Wallet },
  { id: 'settings', label: 'Ajustes', icon: Settings },
] as const;

export const VIEW_PERMISSIONS: Record<UserRole, View[]> = {
  admin: ['home', 'os', 'reports', 'finance', 'settings'],
  tecnico: ['home', 'os'],
};