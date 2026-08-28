/**
 * utilGeolocalizacao.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para obter a localização geográfica do usuário
 * usando a API navigator.geolocation do navegador.
 *
 * Usada em módulos como Mercado (registrar local do mercado) e Combustível
 * (registrar local do posto) para salvar coordenadas junto aos registros.
 * -----------------------------------------------------------------------------
 */

/**
 * obterGeolocalizacao
 * Solicita permissão e obtém a posição atual do dispositivo.
 * Retorna um objeto com latitude, longitude e um texto formatado para exibição.
 *
 * @returns Promise<{latitude: number, longitude: number, texto: string}>
 *   Resolve com as coordenadas, ou rejeita se o usuário negar ou der erro.
 */
export function obterGeolocalizacao(): Promise<{
  latitude: number;
  longitude: number;
  texto: string;
}> {
  return new Promise((resolver, rejeitar) => {
    // Verifica se o navegador suporta geolocalização.
    if (!navigator.geolocation) {
      rejeitar(new Error('Geolocalização não é suportada por este navegador.'));
      return;
    }

    // Opções: alta precisão, timeout de 10s, sem cache.
    const opcoes = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { latitude, longitude } = posicao.coords;
        resolver({
          latitude,
          longitude,
          // Texto formatado para exibição amigável na interface.
          texto: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      },
      (erro) => {
        rejeitar(new Error(`Erro ao obter localização: ${erro.message}`));
      },
      opcoes
    );
  });
}
