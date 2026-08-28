/**
 * Layout.tsx
 * -----------------------------------------------------------------------------
 * Componente de layout principal do LarControl.
 *
 * Contém:
 *  - Cabeçalho (header) com logo, botão de alternar tema escuro/claro,
 *    nome do usuário logado e botão de sair.
 *  - Barra de navegação inferior (mobile) / lateral (desktop) com os 6 módulos.
 *  - Área de conteúdo onde a página ativa é renderizada.
 * -----------------------------------------------------------------------------
 */

import { ReactNode, useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Fuel,
  Wallet,
  Hammer,
  LogOut,
  Home,
  Sun,
  Moon,
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
 * Lista de módulos do app para navegação.
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
  paginaAtual: string;
  onMudarPagina: (id: string) => void;
  children: ReactNode;
}

/**
 * Layout
 * Renderiza o cabeçalho, a navegação e o conteúdo da página.
 */
export function Layout({ paginaAtual, onMudarPagina, children }: LayoutProps) {
  const { usuario, sair } = useAuth();

  // Estado para armazenar se o modo escuro está ativado
  const [eModoEscuro, setEModoEscuro] = useState<boolean>(() => {
    const temaSalvo = localStorage.getItem('tema_larcontrol');
    if (temaSalvo) return temaSalvo === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Atualiza a classe 'dark' na tag HTML quando o estado mudar
  useEffect(() => {
    if (eModoEscuro) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tema_larcontrol', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tema_larcontrol', 'light');
    }
  }, [eModoEscuro]);

  const alternarTema = () => {
    setEModoEscuro((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* === Cabeçalho (mobile) === */}
      <header className="bg-primaria-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 lg:hidden shadow-md">
        <div className="flex items-center gap-2">
          <Home size={22} />
          <span className="font-bold text-lg">LarControl</span>
        </div>

        {/* Botões do Topo Mobile: Botão de Tema + Perfil/Sair */}
        <div className="flex items-center gap-3">
          {/* Botão de Alternar Modo Claro / Escuro */}
          <button
            onClick={alternarTema}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Alternar Modo Escuro/Claro"
          >
            {eModoEscuro ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} />}
          </button>

          {usuario && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
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
        </div>
      </header>

      {/* === Barra lateral (desktop) === */}
      <aside className="hidden lg:flex flex-col w-64 bg-primaria-700 text-white fixed h-full z-30">
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Home size={28} />
            <div>
              <h1 className="font-bold text-xl">LarControl</h1>
              <p className="text-xs text-teal-200">Gestão da Casa</p>
            </div>
          </div>
        </div>

        {/* Navegação Principal */}
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

        {/* Rodapé da Barra Lateral no Desktop */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          {/* Botão Modo Escuro/Claro Desktop */}
          <button
            onClick={alternarTema}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
          >
            {eModoEscuro ? (
              <>
                <Sun size={18} className="text-yellow-300" /> Modo Claro
              </>
            ) : (
              <>
                <Moon size={18} /> Modo Escuro
              </>
            )}
          </button>

          {usuario && (
            <div className="pt-2 border-t border-white/10">
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
        </div>
      </aside>

      {/* === Área de conteúdo === */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* === Barra de navegação inferior (mobile) === */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 dark:border-slate-700 border-t border-slate-200 flex items-center justify-around px-1 py-2 z-30 lg:hidden safe-area-pb">
        {itensNav.map((item) => (
          <button
            key={item.id}
            onClick={() => onMudarPagina(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
              paginaAtual === item.id
                ? 'text-primaria-700 dark:text-teal-400 font-semibold'
                : 'text-slate-400 dark:text-slate-500'
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
