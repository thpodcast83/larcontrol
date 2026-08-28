/**
 * PaginaInicio.tsx
 * -----------------------------------------------------------------------------
 * Página inicial (dashboard) do LarControl.
 *
 * Exibe um resumo geral com cards para cada módulo, permitindo navegação rápida.
 * Mostra também um resumo financeiro e atalhos para as funcionalidades.
 * -----------------------------------------------------------------------------
 */

import {
  ShoppingCart,
  Package,
  Fuel,
  Wallet,
  Hammer,
  TrendingUp,
  Users,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contextos/ContextoAuth';
import { solicitarPermissaoNotificacao } from '@/utils/utilNotificacao';

interface PaginaInicioProps {
  onNavegar: (pagina: string) => void;
}

// Configuração dos cards de módulos.
const modulos = [
  { id: 'mercado', titulo: 'Mercado', descricao: 'Rancho e gastos extras', icone: ShoppingCart, cor: 'bg-teal-50 text-teal-700' },
  { id: 'despensa', titulo: 'Despensa', descricao: 'Controle de estoque', icone: Package, cor: 'bg-blue-50 text-blue-700' },
  { id: 'combustivel', titulo: 'Combustível', descricao: 'Abastecimento e consumo', icone: Fuel, cor: 'bg-amber-50 text-amber-700' },
  { id: 'financas', titulo: 'Finanças', descricao: 'Contas e dívidas', icone: Wallet, cor: 'bg-green-50 text-green-700' },
  { id: 'obras', titulo: 'Obras', descricao: 'Materiais e fornecedores', icone: Hammer, cor: 'bg-orange-50 text-orange-700' },
];

export function PaginaInicio({ onNavegar }: PaginaInicioProps) {
  const { usuario } = useAuth();

  return (
    <div className="space-y-6">
      {/* Cabeçalho de boas-vindas */}
      <div className="bg-gradient-to-r from-primaria-700 to-primaria-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Olá, {usuario?.nome?.split(' ')[0] || 'família'}!</h1>
            <p className="text-teal-200 text-sm mt-1">Bem-vindo ao LarControl</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Users size={18} />
            <span className="text-sm font-medium">Multi-usuário</span>
          </div>
        </div>
      </div>

      {/* Botão de ativar notificações */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Bell className="text-amber-600 shrink-0" size={20} />
        <div className="flex-1">
          <p className="font-semibold text-amber-800 text-sm">Ativar notificações</p>
          <p className="text-amber-700 text-xs">Receba alertas quando membros da família adicionarem itens.</p>
        </div>
        <button
          onClick={solicitarPermissaoNotificacao}
          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          Ativar
        </button>
      </div>

      {/* Grid de módulos */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <TrendingUp size={20} className="text-primaria-700" />
          Módulos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modulos.map((m) => {
            const Icone = m.icone;
            return (
              <button
                key={m.id}
                onClick={() => onNavegar(m.id)}
                className="cartao text-left hover:shadow-md transition-all duration-200 active:scale-95 group"
              >
                <div className={`inline-flex p-3 rounded-xl ${m.cor} mb-3 group-hover:scale-110 transition-transform`}>
                  <Icone size={24} />
                </div>
                <h3 className="font-bold text-slate-900">{m.titulo}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{m.descricao}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Informações do app */}
      <div className="cartao">
        <h2 className="font-bold text-slate-800 mb-3">Sobre o LarControl</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          O LarControl é um aplicativo de gestão doméstica que reúne em um só lugar
          o controle de compras do mercado, estoque da despensa, abastecimento de
          combustível, finanças da casa e projetos de obras e reformas. Tudo
          sincronizado em tempo real entre os membros da família.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            'Sincronização em tempo real',
            'Login com Google',
            'Relatórios em PDF',
            'Importação em massa',
            'Calculadoras inteligentes',
            'PWA instalável',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-primaria-600 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
