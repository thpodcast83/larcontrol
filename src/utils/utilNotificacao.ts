/**
 * utilNotificacao.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para envio de notificações ao usuário usando a
 * Web Notifications API do navegador.
 *
 * Usada para alertar membros da família quando outro membro adiciona um
 * item ao carrinho compartilhado, ou para outros alertas importantes.
 * -----------------------------------------------------------------------------
 */

/**
 * enviarNotificacao
 * Envia uma notificação nativa do navegador (se permitido pelo usuário).
 *
 * @param titulo - Título da notificação.
 * @param corpo - Texto do corpo da notificação.
 */
export function enviarNotificacao(titulo: string, corpo: string): void {
  // Verifica se o navegador suporta notificações.
  if (!('Notification' in window)) return;

  // Se a permissão já foi concedida, envia a notificação.
  if (Notification.permission === 'granted') {
    new Notification(titulo, {
      body: corpo,
      icon: '/icon.svg',
    });
  }
  // Se ainda não foi decidido, solicita permissão e envia se aceito.
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permissao) => {
      if (permissao === 'granted') {
        new Notification(titulo, {
          body: corpo,
          icon: '/icon.svg',
        });
      }
    });
  }
}

/**
 * solicitarPermissaoNotificacao
 * Solicita permissão do usuário para enviar notificações.
 * Deve ser chamado em resposta a uma ação do usuário (ex: clique em botão).
 */
export function solicitarPermissaoNotificacao(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
