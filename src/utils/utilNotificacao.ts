/**
 * utilNotificacao.ts
 * -----------------------------------------------------------------------------
 * Utilitário compatível com Celulares (Android/iOS PWA) e Computadores (Desktop)
 * para exibição de notificações locais e via Service Worker.
 * -----------------------------------------------------------------------------
 */

/**
 * Solicita permissão do usuário para enviar notificações no navegador/dispositivo.
 */
export async function solicitarPermissaoNotificacao(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permissao = await Notification.requestPermission();
    return permissao === 'granted';
  }

  return false;
}

/**
 * Envia a notificação nativa para o dispositivo.
 * Usa o Service Worker para garantir que funcione em celulares Android e iOS.
 */
export async function enviarNotificacao(titulo: string, corpo: string): Promise<void> {
  if (!('Notification' in window)) return;

  // Garante a permissão antes de tentar enviar
  const temPermissao = await solicitarPermissaoNotificacao();
  if (!temPermissao) return;

  const opcoes: NotificationOptions = {
    body: corpo,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
  };

  // 1. Tenta enviar via Service Worker (Obrigatório para funcionar em CELULARES)
  if ('serviceWorker' in navigator) {
    try {
      const registro = await navigator.serviceWorker.ready;
      if (registro && registro.showNotification) {
        await registro.showNotification(titulo, opcoes);
        return;
      }
    } catch (erro) {
      console.warn('Falha ao notificar via Service Worker, usando fallback:', erro);
    }
  }

  // 2. Fallback tradicional (Funciona em Computadores / Desktop)
  try {
    new Notification(titulo, opcoes);
  } catch (erro) {
    console.error('Erro ao instanciar Notification no Desktop:', erro);
  }
}
