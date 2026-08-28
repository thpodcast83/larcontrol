/**
 * utilFormato.ts
 * -----------------------------------------------------------------------------
 * Funções utilitárias para formatação de valores monetários, datas e textos.
 * Centraliza a lógica de formatação para manter consistência em todo o app.
 * -----------------------------------------------------------------------------
 */

/**
 * formatarMoeda
 * Formata um número como moeda brasileira (R$).
 * @param valor - O número a formatar.
 * @returns string formatada, ex: "R$ 1.234,56".
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
}

/**
 * formatarData
 * Formata um timestamp do Firestore ou objeto Date para string legível.
 * @param data - Timestamp (number, Date, ou {seconds, nanoseconds} do Firestore).
 * @returns string formatada, ex: "28/08/2026 14:30".
 */
export function formatarData(data: unknown): string {
  if (!data) return '-';

  let objetoData: Date;

  // Se for um Timestamp do Firestore (tem seconds), converte para Date.
  if (typeof data === 'object' && data !== null && 'seconds' in data) {
    objetoData = new Date((data as { seconds: number }).seconds * 1000);
  } else if (data instanceof Date) {
    objetoData = data;
  } else if (typeof data === 'number') {
    objetoData = new Date(data);
  } else {
    objetoData = new Date(data as string);
  }

  return objetoData.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * formatarDataCurta
 * Formata apenas a data (sem hora) para exibição compacta.
 */
export function formatarDataCurta(data: unknown): string {
  if (!data) return '-';

  let objetoData: Date;
  if (typeof data === 'object' && data !== null && 'seconds' in data) {
    objetoData = new Date((data as { seconds: number }).seconds * 1000);
  } else if (data instanceof Date) {
    objetoData = data;
  } else if (typeof data === 'number') {
    objetoData = new Date(data);
  } else {
    objetoData = new Date(data as string);
  }

  return objetoData.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * formatarNumero
 * Formata um número com casas decimais fixas.
 * @param valor - O número.
 * @param decimais - Quantidade de casas decimais (padrão: 2).
 */
export function formatarNumero(valor: number, decimais = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor || 0);
}
