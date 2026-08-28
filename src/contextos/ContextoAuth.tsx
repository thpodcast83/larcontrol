/**
 * ContextoAuth.tsx
 * -----------------------------------------------------------------------------
 * Contexto React que gerencia a autenticação de usuários no LarControl.
 *
 * Funcionalidades:
 *  - Login social via Google (Firebase Auth).
 *  - Logout.
 *  - Observação do estado de autenticação (onAuthStateChanged).
 *  - Exposição do usuário atual para todos os componentes do app.
 *
 * O login Google permite que múltiplos membros de uma família compartilhem
 * o app, cada um com sua conta Google, sincronizando dados em tempo real.
 * -----------------------------------------------------------------------------
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, provedorGoogle } from '../firebase';
import type { Usuario } from '../tipos';

/**
 * Interface do contexto de autenticação.
 */
interface ContextoAuthTipo {
  usuario: Usuario | null; // Usuário atual (null se não logado).
  carregando: boolean; // True enquanto verifica a sessão inicial.
  entrarComGoogle: () => Promise<void>; // Função de login.
  sair: () => Promise<void>; // Função de logout.
}

// Cria o contexto com valor padrão vazio.
const ContextoAuth = createContext<ContextoAuthTipo>({
  usuario: null,
  carregando: true,
  entrarComGoogle: async () => {},
  sair: async () => {},
});

/**
 * useAuth
 * Hook personalizado para acessar o contexto de autenticação.
 * Deve ser usado por componentes que precisam do usuário atual ou funções de login.
 */
export function useAuth(): ContextoAuthTipo {
  return useContext(ContextoAuth);
}

/**
 * ProvedorAuth
 * Componente provedor que envolve o app e fornece o contexto de autenticação.
 * Observa mudanças no estado de login do Firebase e atualiza o estado React.
 */
export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  /**
   * Efeito colateral: registra um observador (onAuthStateChanged) do Firebase
   * que dispara sempre que o usuário faz login ou logout.
   * Isso mantém a sessão persistente entre recargas de página.
   */
  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // Usuário logado: converte o User do Firebase para nossa interface.
        setUsuario({
          uid: user.uid,
          nome: user.displayName || 'Usuário',
          email: user.email || '',
          fotoUrl: user.photoURL || '',
        });
      } else {
        // Usuário deslogado.
        setUsuario(null);
      }
      setCarregando(false);
    });

    // Limpa o observador quando o componente desmonta.
    return () => cancelar();
  }, []);

  /**
   * entrarComGoogle
   * Abre o popup de login do Google. Em caso de sucesso, o observador
   * onAuthStateChanged atualiza o estado automaticamente.
   */
  const entrarComGoogle = async () => {
    try {
      await signInWithPopup(auth, provedorGoogle);
    } catch (erro) {
      console.error('Erro no login com Google:', erro);
      throw erro;
    }
  };

  /**
   * sair
   * Desconecta o usuário. O observador atualiza o estado para null.
   */
  const sair = async () => {
    try {
      await signOut(auth);
    } catch (erro) {
      console.error('Erro ao sair:', erro);
    }
  };

  return (
    <ContextoAuth.Provider value={{ usuario, carregando, entrarComGoogle, sair }}>
      {children}
    </ContextoAuth.Provider>
  );
}
