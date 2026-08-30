/**
 * tipos.ts
 * -----------------------------------------------------------------------------
 * Definições de tipos TypeScript (interfaces) usadas em todo o app LarControl.
 *
 * Centraliza os tipos de dados de cada módulo para manter consistência entre
 * os componentes, o contexto de autenticação e as operações do Firestore.
 * -----------------------------------------------------------------------------
 */

/**
 * Usuario - Representa o usuário autenticado via Google.
 */
export interface Usuario {
  uid: string; // ID único do Firebase Auth.
  nome: string; // Nome de exibição do Google.
  email: string; // E-mail do Google.
  fotoUrl: string; // URL da foto de perfil do Google.
}

/**
 * ItemCarrinho - Item adicionado ao carrinho de compras (Mercado).
 */
export interface ItemCarrinho {
  id: string; // ID único do item no Firestore.
  nome: string; // Nome do produto.
  quantidade: number; // Quantidade (unidade, kg ou g).
  unidade: 'un' | 'kg' | 'g'; // Tipo de unidade.
  precoUnitario: number; // Preço por unidade/peso.
  subtotal: number; // quantidade * precoUnitario.
  modo: 'rancho' | 'extras'; // Modo da compra: VR/VA ou Pix/Débito/Crédito.
  mercado: string; // Nome do mercado.
  adicionadoPor: string; // Nome do usuário que adicionou.
  adicionadoEm: number; // Timestamp de adição.
}

/**
 * ItemDespensa - Item armazenado na despensa de casa.
 */
export interface ItemDespensa {
  id: string;
  nome: string;
  categoria: 'Geladeira' | 'Armários' | 'Produtos de Limpeza';
  quantidade: number;
  unidade: 'un' | 'kg' | 'g';
  status: 'Fechado' | 'Aberto';
  ultimoPreco: number; // Preço pago na última compra.
  ultimoLocal: string; // Local da última compra.
  ultimaCompra: number; // Timestamp da última compra.
}

/**
 * Abastecimento - Registro de abastecimento de combustível.
 */
export interface Abastecimento {
  id: string;
  kmAtual: number; // KM atual do veículo.
  precoPorLitro: number; // Preço do combustível por litro (R$/L).
  valorTotal: number; // Valor total pago.
  litros: number; // Litros abastecidos (calculado: valorTotal / precoPorLitro).
  data: number; // Timestamp do abastecimento.
  localizacao: string; // Coordenadas do posto.
  comprovante: string; // Imagem Base64 do comprovante (300x300px).
  consumo: number | null; // KM/L em relação ao abastecimento anterior.
}

/**
 * Conta - Conta fixa ou variável (finanças).
 */
export interface Conta {
  id: string;
  descricao: string; // Descrição (ex: "Conta de Luz").
  categoria:
    | 'Luz'
    | 'Água'
    | 'Internet'
    | 'Fatura de Cartão'
    | 'Compras Online'
    | 'Delivery'
    | 'Empréstimo'
    | 'Outros';
  valor: number; // Valor da conta.
  vencimento: string; // Data de vencimento (dd/mm/aaaa).
  status: 'Paga' | 'Pendente'; // Status do pagamento.
  fixa: boolean; // Se é uma conta fixa mensal.
  cartaoOrigem?: string;
  ehParcelado?: boolean;
  numeroParcelas?: number;
  parcelaAtual?: number; // Parcela atual em que você está (ex: 6 de 10)
  valorParcela?: number;
  diaFechamento?: string;
  diaVencimento?: string;
  taxaJurosMes?: number;
}

/**
 * Divida - Dívida para o simulador de amortização.
 */
export interface Divida {
  id: string;
  descricao: string;
  valorTotal: number;
  jurosMensal: number; // Juros mensal (%).
  parcelas: number; // Número de parcelas.
  valorParcela: number; // Valor de cada parcela.
}

/**
 * Obra - Projeto de obra/reforma.
 */
export interface Obra {
  id: string;
  nome: string;
  tipo: 'area' | 'volume'; // Cálculo de área (m²) ou volume (m³).
  largura: number; // Em metros.
  altura: number; // Em metros.
  profundidade: number; // Em metros (para volume).
  area: number; // Resultado em m².
  volume: number; // Resultado em m³.
  materiais: MaterialEstimado[];
  valorTotal: number;
  data: number;
}

/**
 * MaterialEstimado - Material calculado para uma obra.
 */
export interface MaterialEstimado {
  nome: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  subtotal: number;
}

/**
 * Fornecedor - Fornecedor para o comparador de custo-benefício.
 */
export interface Fornecedor {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  valorProduto: number;
  valorFrete: number;
  distanciaKm: number;
  custoTotal: number; // valorProduto + valorFrete.
  custoBeneficio: number; // custoTotal / distanciaKm (quanto menor, melhor).
}
