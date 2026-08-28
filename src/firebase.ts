/**
 * firebase.ts
 * -----------------------------------------------------------------------------
 * Arquivo de configuração e conexão com o Firebase.
 *
 * Este módulo inicializa e exporta as instâncias do Firebase Authentication
 * (autenticação de usuários via Google) e do Cloud Firestore (banco de dados
 * NoSQL em tempo real). As credenciais abaixo são específicas do projeto
 * "LarControl" e foram fornecidas pelo solicitante.
 *
 * O Firebase foi escolhido por oferecer:
 *  - Autenticação social (Google) pronta para uso.
 *  - Banco de dados em tempo real (onSnapshot) que permite sincronizar dados
 *    entre múltiplos dispositivos/usuários da mesma família instantaneamente.
 *  - Hospedagem e escalabilidade sem necessidade de servidor próprio.
 * -----------------------------------------------------------------------------
 */

// Importações do SDK do Firebase para inicializar o app e usar Auth + Firestore.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * firebaseConfig
 * Objeto contendo as credenciais do projeto Firebase "LarControl".
 * Estes dados são públicos (não são secretos) e são usados pelo SDK do
 * Firebase para identificar qual projeto backend este app deve conectar.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCBZpoChyjoHRZuOsq2dCl0bRrv7rAr-04',
  authDomain: 'larcontrol-7a527.firebaseapp.com',
  projectId: 'larcontrol-7a527',
  storageBucket: 'larcontrol-7a527.firebasestorage.app',
  messagingSenderId: '241457392174',
  appId: '1:241457392174:web:7c11c829323a3232738dbf',
  measurementId: 'G-VPHY9CZNSV',
};

// Inicializa a aplicação Firebase com as credenciais fornecidas.
const app = initializeApp(firebaseConfig);

// Exporta a instância de autenticação (Firebase Auth) para uso em todo o app.
export const auth = getAuth(app);

// Exporta o provedor de login do Google para autenticação social.
export const provedorGoogle = new GoogleAuthProvider();

// Exporta a instância do Firestore (banco de dados em tempo real).
export const banco = getFirestore(app);
