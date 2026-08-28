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

// Incrementamos a versão para forçar a renovação do cache antigo
const NOME_CACHE = 'larcontrol-cache-v2';

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
 * - Ignora chamadas POST, PUT, DELETE ou APIs do Firebase/Google (não devem ser registradas em cache).
 * - Para navegação (documentos HTML): tenta a rede primeiro, fallback no cache.
 * - Para outros recursos: tenta o cache primeiro, fallback na rede.
 */
self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  // 1. Ignorar requisições que NÃO sejam GET (como POST/PUT do Firebase/API)
  if (requisicao.method !== 'GET') {
    return;
  }

  // 2. Ignorar APIs externas e requisições do Firebase para não interferir nas chamadas de dados
  if (
    requisicao.url.includes('firestore.googleapis.com') ||
    requisicao.url.includes('identitytoolkit.googleapis.com') ||
    requisicao.url.includes('chrome-extension')
  ) {
    return;
  }

  // Estratégia network-first para navegação (HTML).
  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          // Copia a resposta válida para o cache apenas se status for 200/OK
          if (resposta && resposta.status === 200 && resposta.type === 'basic') {
            const copia = resposta.clone();
            caches.open(NOME_CACHE).then((cache) => cache.put(requisicao, copia));
          }
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
          // Armazena novos recursos no cache apenas para GETs bem-sucedidos
          if (resposta && resposta.status === 200 && resposta.type === 'basic') {
            const copia = resposta.clone();
            caches.open(NOME_CACHE).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        })
      );
    })
  );
});
