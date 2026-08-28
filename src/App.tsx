/**
 * App.tsx
 * -----------------------------------------------------------------------------
 * Componente raiz do LarControl.
 *
 * Responsabilidades:
 *  - Envolver o app com o ProvedorAuth (contexto de autenticação).
 *  - Decidir qual tela mostrar: login (se não autenticado) ou app (se autenticado).
 *  - Gerenciar qual página/módulo está ativo.
 *  - Exibir tela de carregamento enquanto verifica a sessão.
 *  - Solicitar permissão de notificação FCM quando o usuário estiver logado.
 * -----------------------------------------------------------------------------
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ProvedorAuth, useAuth } from '@/contextos/ContextoAuth';
import { Layout } from '@/componentes/Layout';
import { PaginaLogin } from '@/paginas/PaginaLogin';
import { PaginaInicio } from '@/paginas/PaginaInicio';
import { PaginaMercado } from '@/paginas/PaginaMercado';
import { PaginaDespensa } from '@/paginas/PaginaDespensa';
import { PaginaCombustivel } from '@/paginas/PaginaCombustivel';
import { PaginaFinancas } from '@/paginas/PaginaFinancas';
import { PaginaObras } from '@/paginas/PaginaObras';
import { PaginaHistorico } from '@/paginas/PaginaHistorico'; // 1. Importe a nova página de histórico
import { obterTokenFCM } from '@/firebase';

/**
 * ConteudoApp
 * Componente interno que decide o que renderizar com base no estado de auth.
 * Deve estar dentro do ProvedorAuth para acessar useAuth().
 */
function ConteudoApp() {
  const { usuario, carregando } = useAuth();
  const [paginaAtual, setPaginaAtual] = useState('inicio');

  // Efeito para solicitar permissão de notificações FCM quando o usuário se autentica
  useEffect(() => {
    if (usuario) {
      obterTokenFCM().then((token) => {
        if (token) {
          console.log('Permissão FCM concedida para o usuário:', usuario.nome);
        }
      });
    }
  }, [usuario]);

  // Tela de carregamento: enquanto o Firebase verifica a sessão.
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primaria-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando LarControl...</p>
        </div>
      </div>
    );
  }

  // Tela de login: se o usuário não está autenticado.
  if (!usuario) {
    return <PaginaLogin />;
  }

  // App principal: usuário autenticado, renderiza o layout e a página ativa.
  const renderizarPagina = () => {
    switch (paginaAtual) {
      case 'inicio':
        return <PaginaInicio onNavegar={setPaginaAtual} />;
      case 'mercado':
        return <PaginaMercado />;
      case 'despensa':
        return <PaginaDespensa />;
      case 'combustivel':
        return <PaginaCombustivel />;
      case 'financas':
        return <PaginaFinancas />;
      case 'obras':
        return <PaginaObras />;
      case 'historico': // 2. Adicione a rota para o histórico funcionar pelo menu
        return <PaginaHistorico />;
      default:
        return <PaginaInicio onNavegar={setPaginaAtual} />;
    }
  };

  return (
    <Layout paginaAtual={paginaAtual} onMudarPagina={setPaginaAtual}>
      {renderizarPagina()}
    </Layout>
  );
}

/**
 * App
 * Componente raiz exportado. Envolve tudo com o provedor de autenticação.
 */
function App() {
  return (
    <ProvedorAuth>
      <ConteudoApp />
    </ProvedorAuth>
  );
}

export default App;
