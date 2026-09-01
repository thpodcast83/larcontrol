/**
 * utilPdf.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para geração de relatórios em PDF usando a biblioteca jsPDF.
 *
 * Atualizado para suportar larguras de colunas personalizadas opcionais, evitando
 * sobreposição de texto entre colunas estreitas e largas (como "Item" e "Categoria").
 * -----------------------------------------------------------------------------
 */

import { jsPDF } from 'jspdf';

/**
 * Interface que define os parâmetros comuns para geração de PDF.
 */
interface ParametrosPdf {
  titulo: string; // Título do relatório.
  subtitulo?: string; // Subtítulo ou período do relatório.
  colunas: string[]; // Cabeçalhos das colunas da tabela.
  linhas: (string | number)[][]; // Dados das linhas da tabela.
  total?: string; // Linha de total a ser exibida no final.
  colWidths?: number[]; // Larguras opcionais para cada coluna.
}

/**
 * gerarPdfGenerico
 * Função base que cria um PDF com cabeçalho, tabela de dados e rodapé.
 *
 * @param parametros - Objeto com título, colunas, linhas, total e larguras opcionais.
 * @param nomeArquivo - Nome do arquivo PDF a ser baixado.
 */
export function gerarPdfGenerico(parametros: ParametrosPdf, nomeArquivo: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // --- Cabeçalho do documento ---
  doc.setFillColor(15, 118, 110); // teal-700
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LarControl', 14, 12);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(parametros.titulo, 14, 19);

  // Subtítulo (se houver).
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  if (parametros.subtitulo) {
    doc.text(parametros.subtitulo, 14, 32);
  }

  // Data de geração do relatório.
  const dataGeracao = new Date().toLocaleString('pt-BR');
  doc.text(`Gerado em: ${dataGeracao}`, 14, parametros.subtitulo ? 38 : 32);

  // --- Tabela de dados ---
  let y = parametros.subtitulo ? 45 : 40;

  const margemEsquerda = 14;
  const larguraUtil = 182; // 210 - 2*14

  // Define as larguras das colunas: se fornecidas, usa-as; caso contrário, divide igualmente.
  let largurasColunas: number[];
  if (parametros.colWidths && parametros.colWidths.length === parametros.colunas.length) {
    // Normaliza para garantir que a soma respeite a largura útil da página (182mm)
    const somaTotal = parametros.colWidths.reduce((acc, val) => acc + val, 0);
    largurasColunas = parametros.colWidths.map((w) => (w / somaTotal) * larguraUtil);
  } else {
    const larguraIgual = larguraUtil / parametros.colunas.length;
    largurasColunas = parametros.colunas.map(() => larguraIgual);
  }

  // Cabeçalho da tabela.
  doc.setFillColor(15, 118, 110);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  let posicaoXAtual = margemEsquerda;
  parametros.colunas.forEach((coluna, i) => {
    const larguraCol = largurasColunas[i];
    doc.rect(posicaoXAtual, y, larguraCol, 8, 'F');
    doc.text(coluna, posicaoXAtual + 2, y + 5.5);
    posicaoXAtual += larguraCol;
  });

  y += 8;

  // Linhas de dados.
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  parametros.linhas.forEach((linha, idxLinha) => {
    // Verifica se precisa quebrar página.
    if (y > 280) {
      doc.addPage();
      y = 20;
    }

    // Alterna cor de fundo das linhas (zebra).
    if (idxLinha % 2 === 0) {
      doc.setFillColor(240, 253, 250); // teal-50
      doc.rect(margemEsquerda, y, larguraUtil, 8, 'F');
    }

    doc.setFontSize(8);
    posicaoXAtual = margemEsquerda;

    linha.forEach((celula, i) => {
      const larguraCol = largurasColunas[i];
      const texto = String(celula);

      // Limita dinamicamente o número de caracteres com base no espaço da coluna para evitar sobreposição
      // Aproximadamente 2.2mm por caractere em fonte tamanho 8.
      const caracteresMaximos = Math.max(8, Math.floor((larguraCol - 4) / 2.2));
      const textoTruncado =
        texto.length > caracteresMaximos
          ? texto.substring(0, caracteresMaximos - 3) + '...'
          : texto;

      doc.text(textoTruncado, posicaoXAtual + 2, y + 5.5);
      posicaoXAtual += larguraCol;
    });

    y += 8;
  });

  // Linha de total (se houver).
  if (parametros.total) {
    y += 2;
    doc.setFillColor(15, 118, 110);
    doc.rect(margemEsquerda, y, larguraUtil, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(parametros.total, margemEsquerda + 2, y + 6);
  }

  // --- Rodapé ---
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `LarControl - Gestão da Casa | Página ${i} de ${totalPaginas}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Salva o arquivo PDF.
  doc.save(nomeArquivo);
}
