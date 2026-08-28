/**
 * utilParser.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para importação em massa de listas de produtos e itens
 * a partir de arquivos nos formatos .txt, .csv, .docx e .xml.
 *
 * O parser converte o conteúdo do arquivo em um array de objetos normalizados
 * com as propriedades: nome, quantidade, unidade, preco.
 * Estes dados podem então ser usados para cadastro em massa no Firestore.
 * -----------------------------------------------------------------------------
 */

import mammoth from 'mammoth';

/**
 * Interface que representa um item importado de um arquivo.
 */
export interface ItemImportado {
  nome: string;
  quantidade: number;
  unidade: string; // 'un', 'kg', 'g'
  preco: number;
}

/**
 * processarArquivoImportacao
 * Função principal que recebe um arquivo e chama o parser apropriado conforme
 * a extensão do arquivo.
 *
 * @param arquivo - O objeto File enviado pelo usuário.
 * @returns Promise<ItemImportado[]> - Array de itens normalizados.
 */
export async function processarArquivoImportacao(arquivo: File): Promise<ItemImportado[]> {
  const extensao = arquivo.name.split('.').pop()?.toLowerCase();

  switch (extensao) {
    case 'csv':
      return processarCsv(await arquivo.text());
    case 'txt':
      return processarTxt(await arquivo.text());
    case 'xml':
      return processarXml(await arquivo.text());
    case 'docx':
      return processarDocx(arquivo);
    default:
      throw new Error(`Formato .${extensao} não suportado. Use .txt, .csv, .docx ou .xml.`);
  }
}

/**
 * processarCsv
 * Processa um arquivo CSV separado por vírgulas ou ponto-e-vírgula.
 * Espera colunas: nome, quantidade, unidade, preco.
 */
function processarCsv(conteudo: string): ItemImportado[] {
  const linhas = conteudo.trim().split(/\r?\n/);
  const itens: ItemImportado[] = [];

  // Detecta o separador (vírgula ou ponto-e-vírgula).
  const separador = linhas[0].includes(';') ? ';' : ',';

  // Pula o cabeçalho se a primeira linha contiver "nome".
  const inicio = linhas[0].toLowerCase().includes('nome') ? 1 : 0;

  for (let i = inicio; i < linhas.length; i++) {
    const colunas = linhas[i].split(separador).map((c) => c.trim());
    if (colunas.length < 1 || !colunas[0]) continue;

    itens.push({
      nome: colunas[0],
      quantidade: parseFloat(colunas[1]) || 1,
      unidade: colunas[2] || 'un',
      preco: parseFloat(colunas[3]?.replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
    });
  }

  return itens;
}

/**
 * processarTxt
 * Processa um arquivo de texto onde cada linha é um item.
 * Formato esperado: "nome, quantidade, unidade, preco" ou apenas "nome".
 */
function processarTxt(conteudo: string): ItemImportado[] {
  const linhas = conteudo.trim().split(/\r?\n/);
  const itens: ItemImportado[] = [];

  for (const linha of linhas) {
    const partes = linha.split(',').map((p) => p.trim());
    if (!partes[0]) continue;

    itens.push({
      nome: partes[0],
      quantidade: parseFloat(partes[1]) || 1,
      unidade: partes[2] || 'un',
      preco: parseFloat(partes[3]?.replace(',', '.')) || 0,
    });
  }

  return itens;
}

/**
 * processarXml
 * Processa um arquivo XML buscando elementos <item> com atributos ou
 * elementos filho: nome, quantidade, unidade, preco.
 */
function processarXml(conteudo: string): ItemImportado[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(conteudo, 'text/xml');
  const itens: ItemImportado[] = [];

  // Busca todos os elementos <item> no XML.
  const elementosItem = doc.querySelectorAll('item');

  elementosItem.forEach((el) => {
    // Tenta obter os valores de elementos filho ou atributos.
    const nome = el.querySelector('nome')?.textContent || el.getAttribute('nome') || '';
    const quantidade =
      parseFloat(el.querySelector('quantidade')?.textContent || el.getAttribute('quantidade') || '1') || 1;
    const unidade =
      el.querySelector('unidade')?.textContent || el.getAttribute('unidade') || 'un';
    const preco =
      parseFloat(
        (el.querySelector('preco')?.textContent || el.getAttribute('preco') || '0').replace(',', '.')
      ) || 0;

    if (nome) {
      itens.push({ nome, quantidade, unidade, preco });
    }
  });

  return itens;
}

/**
 * processarDocx
 * Processa um arquivo .docx extraindo o texto com a biblioteca mammoth,
 * e então tratando cada parágrafo como um item (formato: nome, qtd, un, preco).
 */
async function processarDocx(arquivo: File): Promise<ItemImportado[]> {
  const arrayBuffer = await arquivo.arrayBuffer();
  const resultado = await mammoth.extractRawText({ arrayBuffer });
  // Reutiliza o parser de texto para processar o conteúdo extraído.
  return processarTxt(resultado.value);
}
