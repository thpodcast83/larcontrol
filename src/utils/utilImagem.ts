/**
 * utilImagem.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para manipulação de imagens no frontend.
 *
 * A principal função deste módulo é redimensionar imagens enviadas pelo
 * usuário (comprovantes de pagamento, fotos de produtos, etc.) para uma
 * resolução fixa de 300x300 pixels usando a API Canvas do HTML5, e então
 * convertê-las em uma string Base64 (JPEG qualidade 0.8).
 *
 * Esta abordagem é usada em vez do Firebase Storage porque:
 *  - Evita custos e complexidade do Storage.
 *  - Permite salvar a imagem diretamente no Firestore como string Base64.
 *  - Garante tamanho uniforme e otimizado (300x300px, ~30-50KB por imagem).
 * -----------------------------------------------------------------------------
 */

/**
 * redimensionarImagemBase64
 * Recebe um arquivo de imagem (File) e retorna uma Promise que resolve para
 * uma string Base64 da imagem redimensionada para 300x300px em JPEG q0.8.
 *
 * @param arquivo - O objeto File da imagem selecionada pelo usuário.
 * @returns Promise<string> - String Base64 da imagem processada.
 */
export async function redimensionarImagemBase64(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    // Validação: verifica se o arquivo é uma imagem.
    if (!arquivo.type.startsWith('image/')) {
      rejeitar(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    // Cria um FileReader para ler o arquivo como Data URL (Base64 bruto).
    const leitor = new FileReader();

    // Quando a leitura do arquivo for concluída...
    leitor.onload = (evento) => {
      const resultado = evento.target?.result as string;
      if (!resultado) {
        rejeitar(new Error('Falha ao ler o arquivo de imagem.'));
        return;
      }

      // Cria um elemento <img> para carregar a imagem no DOM.
      const img = new Image();
      img.onload = () => {
        // Cria um canvas de tamanho fixo 300x300 pixels.
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          rejeitar(new Error('Não foi possível obter o contexto do canvas.'));
          return;
        }

        // Preenche o fundo com branco (para imagens PNG com transparência).
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);

        // Calcula o redimensionamento mantendo a proporção (object-fit: cover).
        const proporcao = Math.max(300 / img.width, 300 / img.height);
        const larguraReduzida = img.width * proporcao;
        const alturaReduzida = img.height * proporcao;
        const x = (300 - larguraReduzida) / 2;
        const y = (300 - alturaReduzida) / 2;

        // Desenha a imagem redimensionada e centralizada no canvas.
        ctx.drawImage(img, x, y, larguraReduzida, alturaReduzida);

        // Converte o canvas para JPEG Base64 com qualidade 0.8 (80%).
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolver(base64);
      };

      img.onerror = () => rejeitar(new Error('Erro ao carregar a imagem.'));
      img.src = resultado;
    };

    leitor.onerror = () => rejeitar(new Error('Erro ao ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
