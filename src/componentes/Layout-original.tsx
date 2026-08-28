/**
 * Layout.tsx
 * -----------------------------------------------------------------------------
 * Componente de layout principal do LarControl.
 *
 * Contém:
 *  - Cabeçalho (header) com logo, nome do usuário, botão de alternar tema,
 *    botão de instalação PWA e botão de sair.
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
  Download,
} from 'lucide-react';
import { useAuth } from '@/contextos/ContextoAuth';

/**
 * Interface para capturar o evento nativo de instalação do PWA no navegador.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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

interface LayoutProps {
  paginaAtual: string;
  onMudarPagina: (id: string) => void;
  children: ReactNode;
}

export function Layout({ paginaAtual, onMudarPagina, children }: LayoutProps) {
  const { usuario, sair } = useAuth();

  // Estado para controlar o modo escuro/claro
  const [eModoEscuro, setEModoEscuro] = useState<boolean>(() => {
    const temaSalvo = localStorage.getItem('tema_larcontrol');
    if (temaSalvo) return temaSalvo === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Estado para armazenar o evento de instalação do PWA
  const [eventoInstalacao, setEventoInstalacao] = useState<BeforeInstallPromptEvent | null>(null);

  // Efeito para aplicar/remover a classe 'dark' na tag <html> e persistir no localStorage
  useEffect(() => {
    if (eModoEscuro) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tema_larcontrol', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tema_larcontrol', 'light');
    }
  }, [eModoEscuro]);

  // Efeito para escutar a disponibilidade de instalação do PWA no navegador
  useEffect(() => {
    const escutarPromptInstalacao = (e: Event) => {
      e.preventDefault();
      setEventoInstalacao(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', escutarPromptInstalacao);

    return () => {
      window.removeEventListener('beforeinstallprompt', escutarPromptInstalacao);
    };
  }, []);

  /**
   * Alterna entre Modo Escuro e Modo Claro.
   */
  const alternarTema = () => {
    setEModoEscuro((prev) => !prev);
  };

  /**
   * Dispara o aviso nativo de instalação do App no dispositivo.
   */
  const instalarApp = async () => {
    if (!eventoInstalacao) return;
    await eventoInstalacao.prompt();
    const escolha = await eventoInstalacao.userChoice;
    if (escolha.outcome === 'accepted') {
      setEventoInstalacao(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* === Cabeçalho (Mobile) === */}
      <header className="bg-primaria-700 dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 lg:hidden shadow-md">
        <div className="flex items-center gap-2">
          <Home size={22} />
          <span className="font-bold text-lg">LarControl</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão Instalar PWA (Exibido apenas se disponível no celular) */}
          {eventoInstalacao && (
            <button
              onClick={instalarApp}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Instalar Aplicativo"
            >
              <Download size={18} />
            </button>
          )}

          {/* Botão Alternar Modo Claro / Escuro */}
          <button
            onClick={alternarTema}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title={eModoEscuro ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {eModoEscuro ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} />}
          </button>

          {/* Usuário e Sair */}
          {usuario && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
              <img
                src={usuario.fotoUrl}
                alt={usuario.nome}
                className="w-7 h-7 rounded-full border border-white/40"
              />
              <button onClick={() => sair()} aria-label="Sair" className="hover:opacity-80">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* === Barra Lateral (Desktop) === */}
      <aside className="hidden lg:flex flex-col w-64 bg-primaria-700 dark:bg-slate-800 text-white fixed h-full z-30 shadow-xl transition-colors duration-300">
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Home size={28} />
            <div>
              <h1 className="font-bold text-xl">LarControl</h1>
              <p className="text-xs text-teal-200 dark:text-slate-400">Gestão da Casa</p>
            </div>
          </div>
        </div>

        {/* Menu de Navegação Principal */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {itensNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onMudarPagina(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                paginaAtual === item.id
                  ? 'bg-white/20 dark:bg-slate-700 font-semibold text-white'
                  : 'hover:bg-white/10 dark:hover:bg-slate-700/50 text-teal-100 dark:text-slate-300'
              }`}
            >
              {item.icone}
              <span>{item.rotulo}</span>
            </button>
          ))}
        </nav>

        {/* Ações Inferiores (Instalar PWA, Dark Mode e Perfil) */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          
          {/* Botões de Ação Rápida no Desktop */}
          <div className="flex items-center gap-2">
            <button
              onClick={alternarTema}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 dark:bg-slate-700 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              {eModoEscuro ? (
                <>
                  <Sun size={16} className="text-yellow-300" /> Modo Claro
                </>
              ) : (
                <>
                  <Moon size={16} /> Modo Escuro
                </>
              )}
            </button>

            {eventoInstalacao && (
              <button
                onClick={instalarApp}
                className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Instalar App no Computador"
              >
                <Download size={16} /> Instalar
              </button>
            )}
          </div>

          {/* Dados do Usuário Logado */}
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
                  <p className="text-xs text-teal-200 dark:text-slate-400 truncate">
                    {usuario.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => sair()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-100 transition-colors text-sm font-semibold"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* === Área de Conteúdo das Páginas === */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>

      {/* === Barra de Navegação Inferior (Mobile) === */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around px-1 py-2 z-30 lg:hidden safe-area-pb shadow-lg transition-colors duration-300">
        {itensNav.map((item) => (
          <button
            key={item.id}
            onClick={() => onMudarPagina(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
              paginaAtual === item.id
                ? 'text-primaria-700 dark:text-teal-400 font-bold'
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
