/**
 * utilPdf.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para geração de relatórios em PDF usando a biblioteca jsPDF.
 *
 * Cada módulo do LarControl (Mercado, Despensa, Combustível, Finanças, Obras)
 * possui sua própria função geradora de PDF, que formata os dados do módulo
 * em um documento PDF profissional e baixável.
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
}

/**
 * gerarPdfGenerico
 * Função base que cria um PDF com cabeçalho, tabela de dados e rodapé.
 * É chamada por cada módulo com seus dados específicos.
 *
 * @param parametros - Objeto com título, colunas, linhas e total.
 * @param nomeArquivo - Nome do arquivo PDF a ser baixado.
 */
export function gerarPdfGenerico(parametros: ParametrosPdf, nomeArquivo: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // --- Cabeçalho do documento ---
  // Faixa teal no topo.
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

  // Cabeçalho da tabela.
  doc.setFillColor(15, 118, 110);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Calcula a largura de cada coluna (dividindo igualmente a largura útil).
  const margemEsquerda = 14;
  const larguraUtil = 182; // 210 - 2*14
  const larguraColuna = larguraUtil / parametros.colunas.length;

  parametros.colunas.forEach((coluna, i) => {
    doc.rect(margemEsquerda + i * larguraColuna, y, larguraColuna, 8, 'F');
    doc.text(coluna, margemEsquerda + i * larguraColuna + 2, y + 5.5);
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
    linha.forEach((celula, i) => {
      const texto = String(celula);
      // Trunca texto se for maior que a coluna.
      const textoTruncado = texto.length > 28 ? texto.substring(0, 25) + '...' : texto;
      doc.text(textoTruncado, margemEsquerda + i * larguraColuna + 2, y + 5.5);
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
