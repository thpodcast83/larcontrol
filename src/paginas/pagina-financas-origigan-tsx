/**
 * PaginaFinancas.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Saúde Financeira e Gestão de Contas do LarControl.
 *
 * Funcionalidades:
 *  1. Painel de contas fixas e variáveis (Luz, Água, Internet, Cartão, etc).
 *  2. Dashboard com gráficos de custos e alertas de orçamento.
 *  3. Assistente de economia: sugestões de corte de custos.
 *  4. Simulador de amortização de dívidas.
 *  5. Geração de relatório PDF.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import type { Conta, Divida } from '@/tipos';
import { formatarMoeda, formatarDataCurta } from '@/utils/utilFormato';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import {
  Wallet,
  Plus,
  Trash2,
  FileText,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Calculator,
  Pencil,
} from 'lucide-react';

// Lista de categorias de contas com suas cores (para o gráfico de barras).
const categoriasConta = [
  'Luz',
  'Água',
  'Internet',
  'Fatura de Cartão',
  'Compras Online',
  'Delivery',
  'Empréstimo',
  'Outros',
] as const;

// Cores para cada categoria no gráfico de barras.
const coresCategoria: Record<string, string> = {
  Luz: 'bg-yellow-500',
  Água: 'bg-blue-500',
  Internet: 'bg-cyan-500',
  'Fatura de Cartão': 'bg-red-500',
  'Compras Online': 'bg-orange-500',
  Delivery: 'bg-pink-500',
  Empréstimo: 'bg-purple-500',
  Outros: 'bg-slate-500',
};

export function PaginaFinancas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [modalDividaAberto, setModalDividaAberto] = useState(false);
  const [editandoContaId, setEditandoContaId] = useState<string | null>(null);

  // Campos do formulário de conta.
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Conta['categoria']>('Luz');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [statusConta, setStatusConta] = useState<'Paga' | 'Pendente'>('Pendente');
  const [fixa, setFixa] = useState(false);

  // Campos do simulador de dívida.
  const [descDivida, setDescDivida] = useState('');
  const [valorDivida, setValorDivida] = useState('');
  const [jurosDivida, setJurosDivida] = useState('');
  const [parcelasDivida, setParcelasDivida] = useState('');

  /**
   * Efeito: escuta em tempo real as coleções "contas" e "dividas".
   */
  useEffect(() => {
    const cancelarContas = onSnapshot(collection(banco, 'contas'), (snapshot) => {
      const lista: Conta[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          descricao: dados.descricao || '',
          categoria: dados.categoria || 'Outros',
          valor: dados.valor || 0,
          vencimento: dados.vencimento || '',
          status: dados.status || 'Pendente',
          fixa: dados.fixa || false,
        });
      });
      setContas(lista);
    });

    const cancelarDividas = onSnapshot(collection(banco, 'dividas'), (snapshot) => {
      const lista: Divida[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          descricao: dados.descricao || '',
          valorTotal: dados.valorTotal || 0,
          jurosMensal: dados.jurosMensal || 0,
          parcelas: dados.parcelas || 0,
          valorParcela: dados.valorParcela || 0,
        });
      });
      setDividas(lista);
    });

    return () => {
      cancelarContas();
      cancelarDividas();
    };
  }, []);

  // --- Cálculos derivados para o dashboard ---

  // Total de contas pendentes.
  const totalPendente = useMemo(
    () => contas.filter((c) => c.status === 'Pendente').reduce((acc, c) => acc + c.valor, 0),
    [contas]
  );

  // Total de contas pagas.
  const totalPago = useMemo(
    () => contas.filter((c) => c.status === 'Paga').reduce((acc, c) => acc + c.valor, 0),
    [contas]
  );

  // Total geral.
  const totalGeral = useMemo(() => contas.reduce((acc, c) => acc + c.valor, 0), [contas]);

  // Gastos por categoria (para o gráfico de barras).
  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    contas.forEach((c) => {
      mapa[c.categoria] = (mapa[c.categoria] || 0) + c.valor;
    });
    return categoriasConta
      .map((cat) => ({ categoria: cat, valor: mapa[cat] || 0 }))
      .filter((c) => c.valor > 0);
  }, [contas]);

  // Maior gasto (para alertas de orçamento).
  const maiorGasto = useMemo(() => {
    if (gastosPorCategoria.length === 0) return null;
    return gastosPorCategoria.reduce((max, c) => (c.valor > max.valor ? c : max));
  }, [gastosPorCategoria]);

  /**
   * salvarConta
   * Adiciona ou atualiza uma conta no Firestore.
   */
  const salvarConta = async () => {
    if (!descricao.trim() || !valor) return;

    const dados = {
      descricao: descricao.trim(),
      categoria,
      valor: parseFloat(valor.replace(',', '.')) || 0,
      vencimento: vencimento || 'Não informado',
      status: statusConta,
      fixa,
    };

    if (editandoContaId) {
      await updateDoc(doc(banco, 'contas', editandoContaId), dados);
    } else {
      await addDoc(collection(banco, 'contas'), dados);
    }

    limparFormularioConta();
    setModalContaAberto(false);
  };

  /**
   * marcarComoPaga
   * Alterna o status de pagamento da conta.
   */
  const marcarComoPaga = async (conta: Conta) => {
    await updateDoc(doc(banco, 'contas', conta.id), {
      status: conta.status === 'Paga' ? 'Pendente' : 'Paga',
    });
  };

  /**
   * removerConta
   */
  const removerConta = async (id: string) => {
    await deleteDoc(doc(banco, 'contas', id));
  };

  /**
   * editarConta
   */
  const editarConta = (conta: Conta) => {
    setEditandoContaId(conta.id);
    setDescricao(conta.descricao);
    setCategoria(conta.categoria);
    setValor(String(conta.valor));
    setVencimento(conta.vencimento);
    setStatusConta(conta.status);
    setFixa(conta.fixa);
    setModalContaAberto(true);
  };

  const limparFormularioConta = () => {
    setEditandoContaId(null);
    setDescricao('');
    setCategoria('Luz');
    setValor('');
    setVencimento('');
    setStatusConta('Pendente');
    setFixa(false);
  };

  /**
   * calcularDivida
   * Simula amortização de dívida usando o sistema Price (parcelas fixas).
   * Fórmula: PMT = PV * i / (1 - (1+i)^-n)
   * Onde: PV = valor presente, i = taxa de juros mensal, n = número de parcelas.
   */
  const calcularDivida = () => {
    const pv = parseFloat(valorDivida.replace(',', '.')) || 0;
    const i = (parseFloat(jurosDivida.replace(',', '.')) || 0) / 100;
    const n = parseInt(parcelasDivida) || 0;

    if (pv <= 0 || n <= 0) return;

    // Cálculo da parcela fixa (sistema Price).
    let pmt: number;
    if (i === 0) {
      pmt = pv / n; // Sem juros: divisão simples.
    } else {
      pmt = (pv * i) / (1 - Math.pow(1 + i, -n));
    }

    return {
      pv,
      i,
      n,
      pmt,
      total: pmt * n,
      jurosTotal: pmt * n - pv,
    };
  };

  /**
   * salvarDivida
   * Salva a dívida simulada no Firestore.
   */
  const salvarDivida = async () => {
    const calc = calcularDivida();
    if (!calc || !descDivida.trim()) return;

    await addDoc(collection(banco, 'dividas'), {
      descricao: descDivida.trim(),
      valorTotal: calc.pv,
      jurosMensal: calc.i * 100,
      parcelas: calc.n,
      valorParcela: calc.pmt,
    });

    setDescDivida('');
    setValorDivida('');
    setJurosDivida('');
    setParcelasDivida('');
    setModalDividaAberto(false);
  };

  const removerDivida = async (id: string) => {
    await deleteDoc(doc(banco, 'dividas', id));
  };

  /**
   * gerarPdf
   * Gera relatório PDF das contas.
   */
  const gerarPdf = () => {
    const colunas = ['Descrição', 'Categoria', 'Vencimento', 'Status', 'Valor'];
    const linhas = contas.map((c) => [
      c.descricao,
      c.categoria,
      c.vencimento,
      c.status,
      formatarMoeda(c.valor),
    ]);

    gerarPdfGenerico(
      {
        titulo: 'Relatório de Contas',
        colunas,
        linhas,
        total: `Total: ${formatarMoeda(totalGeral)} | Pendente: ${formatarMoeda(totalPendente)}`,
      },
      'relatorio-financas-larcontrol.pdf'
    );
  };

  const resultadoDivida = calcularDivida();

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="text-primaria-700" />
          Finanças
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestão de contas, dashboard financeiro e simulador de dívidas.
        </p>
      </div>

      {/* === Dashboard de resumo === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="cartao">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Wallet size={16} /> Total geral
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatarMoeda(totalGeral)}</p>
        </div>
        <div className="cartao">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle size={16} /> Pago
          </div>
          <p className="text-2xl font-bold text-green-600">{formatarMoeda(totalPago)}</p>
        </div>
        <div className="cartao">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <AlertCircle size={16} /> Pendente
          </div>
          <p className="text-2xl font-bold text-red-600">{formatarMoeda(totalPendente)}</p>
        </div>
      </div>

      {/* === Gráfico de barras por categoria === */}
      {gastosPorCategoria.length > 0 && (
        <div className="cartao">
          <h2 className="font-bold text-slate-800 mb-4">Gastos por categoria</h2>
          <div className="space-y-3">
            {gastosPorCategoria.map((g) => {
              const pct = totalGeral > 0 ? (g.valor / totalGeral) * 100 : 0;
              return (
                <div key={g.categoria}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">{g.categoria}</span>
                    <span className="text-slate-700 font-semibold">{formatarMoeda(g.valor)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${coresCategoria[g.categoria]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Alertas de orçamento === */}
      {maiorGasto && maiorGasto.valor > totalGeral * 0.4 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-800 text-sm">Alerta de orçamento</p>
            <p className="text-red-700 text-sm">
              A categoria "{maiorGasto.categoria}" representa mais de 40% dos seus gastos.
              Considere revisar este valor para equilibrar o orçamento.
            </p>
          </div>
        </div>
      )}

      {/* === Barra de ações === */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            limparFormularioConta();
            setModalContaAberto(true);
          }}
          className="botao-primario"
        >
          <Plus size={18} />
          Adicionar conta
        </button>
        <button onClick={() => setModalDividaAberto(true)} className="botao-secundario">
          <Calculator size={18} />
          Simular dívida
        </button>
        <button onClick={gerarPdf} className="botao-secundario">
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      {/* === Lista de contas === */}
      <div className="space-y-3">
        {contas.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma conta registrada ainda.</p>
          </div>
        ) : (
          contas.map((c) => (
            <div key={c.id} className="cartao flex items-center gap-3 animar-entrada">
              <div className={`p-2 rounded-lg ${coresCategoria[c.categoria]} text-white`}>
                <CreditCard size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 truncate">{c.descricao}</h3>
                  {c.fixa && (
                    <span className="badge bg-slate-100 text-slate-600">Fixa</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {c.categoria} • Vence: {c.vencimento} • {formatarMoeda(c.valor)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => marcarComoPaga(c)}
                  className={`badge ${
                    c.status === 'Paga'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {c.status === 'Paga' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {c.status}
                </button>
                <button
                  onClick={() => editarConta(c)}
                  className="p-2 rounded-lg text-slate-400 hover:text-primaria-700 hover:bg-primaria-50 transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => removerConta(c.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* === Lista de dívidas === */}
      {dividas.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-600" />
            Dívidas cadastradas
          </h2>
          <div className="space-y-3">
            {dividas.map((d) => (
              <div key={d.id} className="cartao flex items-center gap-3 animar-entrada">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{d.descricao}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {d.parcelas}x de {formatarMoeda(d.valorParcela)} • Juros: {formatarMoeda(d.jurosMensal)}%/mês
                  </p>
                  <p className="text-xs text-slate-400">
                    Total: {formatarMoeda(d.valorTotal)} • Total a pagar: {formatarMoeda(d.valorParcela * d.parcelas)}
                  </p>
                </div>
                <button
                  onClick={() => removerDivida(d.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Modal de conta === */}
      <Modal
        aberto={modalContaAberto}
        onFechar={() => setModalContaAberto(false)}
        titulo={editandoContaId ? 'Editar conta' : 'Adicionar conta'}
      >
        <div className="space-y-4">
          <div>
            <label className="rotulo">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Conta de luz - Agosto"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="campo-entrada"
              autoFocus
            />
          </div>
          <div>
            <label className="rotulo">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Conta['categoria'])}
              className="campo-entrada"
            >
              {categoriasConta.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 150.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Vencimento</label>
              <input
                type="text"
                placeholder="dd/mm/aaaa"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="campo-entrada"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusConta('Pendente')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                statusConta === 'Pendente' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Pendente
            </button>
            <button
              onClick={() => setStatusConta('Paga')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                statusConta === 'Paga' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Paga
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={fixa}
              onChange={(e) => setFixa(e.target.checked)}
              className="w-4 h-4 rounded accent-primaria-700"
            />
            Conta fixa mensal
          </label>
          <button onClick={salvarConta} className="botao-primario w-full">
            {editandoContaId ? 'Salvar alterações' : 'Adicionar conta'}
          </button>
        </div>
      </Modal>

      {/* === Modal de simulação de dívida === */}
      <Modal aberto={modalDividaAberto} onFechar={() => setModalDividaAberto(false)} titulo="Simulador de amortização de dívida">
        <div className="space-y-4">
          <div>
            <label className="rotulo">Descrição da dívida</label>
            <input
              type="text"
              placeholder="Ex: Cartão de crédito"
              value={descDivida}
              onChange={(e) => setDescDivida(e.target.value)}
              className="campo-entrada"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="rotulo">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 5000"
                value={valorDivida}
                onChange={(e) => setValorDivida(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Juros (%/mês)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 3.5"
                value={jurosDivida}
                onChange={(e) => setJurosDivida(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Parcelas</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 12"
                value={parcelasDivida}
                onChange={(e) => setParcelasDivida(e.target.value)}
                className="campo-entrada"
              />
            </div>
          </div>
          {/* Resultado da simulação */}
          {resultadoDivida && (
            <div className="bg-primaria-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Valor da parcela:</span>
                <span className="font-bold text-primaria-700">{formatarMoeda(resultadoDivida.pmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total a pagar:</span>
                <span className="font-bold text-slate-800">{formatarMoeda(resultadoDivida.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total de juros:</span>
                <span className="font-bold text-red-600">{formatarMoeda(resultadoDivida.jurosTotal)}</span>
              </div>
            </div>
          )}
          <button onClick={salvarDivida} className="botao-primario w-full">
            Salvar dívida
          </button>
        </div>
      </Modal>
    </div>
  );
}
