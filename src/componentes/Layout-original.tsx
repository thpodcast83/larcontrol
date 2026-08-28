/**
 * Layout.tsx
 * -----------------------------------------------------------------------------
 * Componente de layout principal do LarControl.
 *
 * Contém:
 *  - Cabeçalho (header) com logo, nome do usuário logado e botão de sair.
 *  - Barra de navegação inferior (mobile) / lateral (desktop) com os 5 módulos.
 *  - Área de conteúdo onde a página ativa é renderizada.
 *
 * A navegação é responsiva: no mobile aparece como barra inferior fixa,
 * no desktop como menu lateral fixo.
 * -----------------------------------------------------------------------------
 */

import { ReactNode } from 'react';
import {
  ShoppingCart,
  Package,
  Fuel,
  Wallet,
  Hammer,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuth } from '@/contextos/ContextoAuth';

/**
 * Tipo que representa cada item de navegação.
 */
interface ItemNav {
  id: string;
  rotulo: string; // Texto exibido no menu.
  icone: ReactNode; // Ícone Lucide.
}

/**
 * Lista de módulos/módulos do app para navegação.
 * Cada item corresponde a uma página do app.
 */
const itensNav: ItemNav[] = [
  { id: 'inicio', rotulo: 'Início', icone: <Home size={22} /> },
  { id: 'mercado', rotulo: 'Mercado', icone: <ShoppingCart size={22} /> },
  { id: 'despensa', rotulo: 'Despensa', icone: <Package size={22} /> },
  { id: 'combustivel', rotulo: 'Combustível', icone: <Fuel size={22} /> },
  { id: 'financas', rotulo: 'Finanças', icone: <Wallet size={22} /> },
  { id: 'obras', rotulo: 'Obras', icone: <Hammer size={22} /> },
];

/**
 * Props do componente Layout.
 */
interface LayoutProps {
  paginaAtual: string; // ID da página ativa.
  onMudarPagina: (id: string) => void; // Função para trocar de página.
  children: ReactNode; // Conteúdo da página.
}

/**
 * Layout
 * Renderiza o cabeçalho, a navegação e o conteúdo da página.
 */
export function Layout({ paginaAtual, onMudarPagina, children }: LayoutProps) {
  const { usuario, sair } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* === Cabeçalho (mobile e desktop) === */}
      <header className="bg-primaria-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 lg:hidden">
        <div className="flex items-center gap-2">
          <Home size={22} />
          <span className="font-bold text-lg">LarControl</span>
        </div>
        {usuario && (
          <div className="flex items-center gap-2">
            <img
              src={usuario.fotoUrl}
              alt={usuario.nome}
              className="w-8 h-8 rounded-full border-2 border-white/30"
            />
            <button onClick={() => sair()} aria-label="Sair">
              <LogOut size={20} />
            </button>
          </div>
        )}
      </header>

      {/* === Barra lateral (desktop) === */}
      <aside className="hidden lg:flex flex-col w-64 bg-primaria-700 text-white fixed h-full z-30">
        <div className="px-6 py-5 flex items-center gap-3 border-b border-white/10">
          <Home size={28} />
          <div>
            <h1 className="font-bold text-xl">LarControl</h1>
            <p className="text-xs text-teal-200">Gestão da Casa</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {itensNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onMudarPagina(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                paginaAtual === item.id
                  ? 'bg-white/15 font-semibold'
                  : 'hover:bg-white/10 text-teal-100'
              }`}
            >
              {item.icone}
              <span>{item.rotulo}</span>
            </button>
          ))}
        </nav>

        {usuario && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={usuario.fotoUrl}
                alt={usuario.nome}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{usuario.nome}</p>
                <p className="text-xs text-teal-200 truncate">{usuario.email}</p>
              </div>
            </div>
            <button
              onClick={() => sair()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        )}
      </aside>

      {/* === Área de conteúdo === */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* === Barra de navegação inferior (mobile) === */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around px-1 py-2 z-30 lg:hidden safe-area-pb">
        {itensNav.map((item) => (
          <button
            key={item.id}
            onClick={() => onMudarPagina(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
              paginaAtual === item.id
                ? 'text-primaria-700'
                : 'text-slate-400'
            }`}
          >
            {item.icone}
            <span className="text-[10px] font-medium truncate w-full text-center">
              {item.rotulo}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
