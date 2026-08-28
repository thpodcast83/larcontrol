importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCBZpoChyjoHRZuOsq2dCl0bRrv7rAr-04',
  authDomain: 'larcontrol-7a527.firebaseapp.com',
  projectId: 'larcontrol-7a527',
  storageBucket: 'larcontrol-7a527.firebasestorage.app',
  messagingSenderId: '241457392174',
  appId: '1:241457392174:web:7c11c829323a3232738dbf',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || 'LarControl';
  const opcoes = {
    body: payload.notification?.body || 'Nova atualização no seu aplicativo!',
    icon: '/icon-192.png'
  };

  self.registration.showNotification(titulo, opcoes);
});
