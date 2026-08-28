/**
 * firebase.ts
 * -----------------------------------------------------------------------------
 * Arquivo de configuração e conexão com o Firebase (Auth, Firestore e FCM).
 * -----------------------------------------------------------------------------
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyCBZpoChyjoHRZuOsq2dCl0bRrv7rAr-04',
  authDomain: 'larcontrol-7a527.firebaseapp.com',
  projectId: 'larcontrol-7a527',
  storageBucket: 'larcontrol-7a527.firebasestorage.app',
  messagingSenderId: '241457392174',
  appId: '1:241457392174:web:7c11c829323a3232738dbf',
  measurementId: 'G-VPHY9CZNSV',
};

// Inicializa a aplicação Firebase
const app = initializeApp(firebaseConfig);

// Exporta instâncias para Auth e Firestore
export const auth = getAuth(app);
export const provedorGoogle = new GoogleAuthProvider();
export const banco = getFirestore(app);

// Inicializa e exporta o Firebase Cloud Messaging (FCM)
export const messaging = getMessaging(app);

/**
 * Função para solicitar permissão de notificação e obter o Token FCM do dispositivo.
 */
export const obterTokenFCM = async () => {
  try {
    const permissao = await Notification.requestPermission();
    if (permissao === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BKbaIdSPBnL-1h74d0asqWFe8w8DM1n7wBNH7QwDreRKPtGbAttOs0KyW4aTSfrEHE97QN-50-H_xLEWcZaMWSo'
      });
      console.log('Token FCM obtido:', token);
      return token;
    }
  } catch (erro) {
    console.error('Erro ao obter token FCM:', erro);
  }
};
