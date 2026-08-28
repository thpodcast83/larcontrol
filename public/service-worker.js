/**
 * service-worker.js
 * -----------------------------------------------------------------------------
 * Service Worker do LarControl para funcionamento como PWA (Progressive Web App).
 *
 * O Service Worker permite que o app seja instalável na tela inicial do celular,
 * funcione offline (carregando recursos do cache) e seja mais rápido em
 * visitas repetidas.
 *
 * Estratégia de cache:
 *  - Cache-first para recursos estáticos (HTML, CSS, JS, ícones).
 *  - Network-first com fallback para cache para navegação (páginas).
 * -----------------------------------------------------------------------------
 */

// Nome e versão do cache. Mudar a versão força atualização do cache.
const NOME_CACHE = 'larcontrol-cache-v1';

// Lista de recursos essenciais para pré-carregar (app shell).
const RECURSOS_PRE_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

/**
 * Evento "install": disparado quando o Service Worker é instalado.
 * Pré-carrega os recursos essenciais no cache para funcionamento offline.
 */
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE).then((cache) => cache.addAll(RECURSOS_PRE_CACHE))
  );
  self.skipWaiting();
});

/**
 * Evento "activate": disparado quando o Service Worker se torna ativo.
 * Remove caches antigos de versões anteriores.
 */
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((listaChaves) =>
      Promise.all(
        listaChaves
          .filter((chave) => chave !== NOME_CACHE)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

/**
 * Evento "fetch": intercepta todas as requisições de rede.
 * - Para navegação (documentos HTML): tenta a rede primeiro, fallback no cache.
 * - Para outros recursos: tenta o cache primeiro, fallback na rede.
 */
self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  // Estratégia network-first para navegação (HTML).
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          // Copia a resposta válida para o cache.
          const copia = resposta.clone();
          caches.open(NOME_CACHE).then((cache) => cache.put(requisicao, copia));
          return resposta;
        })
        .catch(() => caches.match(requisicao).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Estratégia cache-first para outros recursos (CSS, JS, imagens, etc).
  evento.respondWith(
    caches.match(requisicao).then((emCache) => {
      return (
        emCache ||
        fetch(requisicao).then((resposta) => {
          // Armazena novos recursos no cache para próximas visitas.
          if (resposta && resposta.status === 200) {
            const copia = resposta.clone();
            caches.open(NOME_CACHE).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        })
      );
    })
  );
});
