/**
 * PaginaFinancas.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Saúde Financeira, Cartões, Faturas Parceladas e Empréstimos.
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
import { formatarMoeda } from '@/utils/utilFormato';
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

function converterParaNumero(val: string): number {
  if (!val) return 0;
  const limpo = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

export function PaginaFinancas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [modalDividaAberto, setModalDividaAberto] = useState(false);
  const [editandoContaId, setEditandoContaId] = useState<string | null>(null);

  // Campos do formulário de conta / cartão / parcelamento
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Conta['categoria']>('Fatura de Cartão');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [statusConta, setStatusConta] = useState<'Paga' | 'Pendente'>('Pendente');
  const [fixa, setFixa] = useState(false);

  // Campos específicos para Cartão / Parcelamento / Empréstimo
  const [cartaoOrigem, setCartaoOrigem] = useState('Nubank');
  const [tipoPagamento, setTipoPagamento] = useState<'a-vista' | 'parcelado'>('a-vista');
  const [ehParcelado, setEhParcelado] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [diaFechamento, setDiaFechamento] = useState('5');
  const [diaVencimento, setDiaVencimento] = useState('12');
  const [taxaJurosMes, setTaxaJurosMes] = useState('15');

  // Campos do simulador de dívida/empréstimo
  const [descDivida, setDescDivida] = useState('');
  const [valorDivida, setValorDivida] = useState('');
  const [jurosDivida, setJurosDivida] = useState('');
  const [parcelasDivida, setParcelasDivida] = useState('');

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
          cartaoOrigem: dados.cartaoOrigem || '',
          ehParcelado: dados.ehParcelado || false,
          numeroParcelas: dados.numeroParcelas || 1,
          valorParcela: dados.valorParcela || dados.valor || 0,
          diaFechamento: dados.diaFechamento || '',
          diaVencimento: dados.diaVencimento || '',
          taxaJurosMes: dados.taxaJurosMes || 0,
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

  const totalPendente = useMemo(
    () => contas.filter((c) => c.status === 'Pendente').reduce((acc, c) => acc + (c.valorParcela || c.valor), 0),
    [contas]
  );

  const totalPago = useMemo(
    () => contas.filter((c) => c.status === 'Paga').reduce((acc, c) => acc + (c.valorParcela || c.valor), 0),
    [contas]
  );

  const totalGeral = useMemo(() => contas.reduce((acc, c) => acc + (c.valorParcela || c.valor), 0), [contas]);

  const relatorioCartoes = useMemo(() => {
    const mapa: Record<string, { totalFatura: number, parcelamentos: any[], vencimento: string, fechamento: string, jurosEstimado: number }> = {};
    const hoje = new Date();

    contas.forEach((c) => {
      if (c.categoria === 'Fatura de Cartão' || c.categoria === 'Compras Online' || c.categoria === 'Empréstimo') {
        const nomeCartao = c.cartaoOrigem || 'Geral';
        if (!mapa[nomeCartao]) {
          mapa[nomeCartao] = {
            totalFatura: 0,
            parcelamentos: [],
            vencimento: c.diaVencimento || '10',
            fechamento: c.diaFechamento || '03',
            jurosEstimado: 0,
          };
        }

        const valParcela = c.valorParcela || c.valor;
        mapa[nomeCartao].totalFatura += valParcela;

        if (c.ehParcelado && c.numeroParcelas && c.numeroParcelas > 1) {
          mapa[nomeCartao].parcelamentos.push(c);
        }

        if (c.status === 'Pendente' && c.vencimento) {
          const partesVenc = c.vencimento.split('/');
          if (partesVenc.length === 3) {
            const dataVencObj = new Date(parseInt(partesVenc[2]), parseInt(partesVenc[1]) - 1, parseInt(partesVenc[0]));
            if (hoje > dataVencObj) {
              const diffDias = Math.ceil((hoje.getTime() - dataVencObj.getTime()) / (1000 * 60 * 60 * 24));
              const taxaMes = c.taxaJurosMes || 14;
              const jurosDia = (taxaMes / 100) / 30;
              const valorJuros = valParcela * jurosDia * diffDias;
              mapa[nomeCartao].jurosEstimado += valorJuros;
            }
          }
        }
      }
    });

    return mapa;
  }, [contas]);

  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    contas.forEach((c) => {
      const val = c.valorParcela || c.valor;
      mapa[c.categoria] = (mapa[c.categoria] || 0) + val;
    });
    return categoriasConta
      .map((cat) => ({ categoria: cat, valor: mapa[cat] || 0 }))
      .filter((c) => c.valor > 0);
  }, [contas]);

  const salvarConta = async () => {
    if (!descricao.trim() || !valor) return;

    const valorTotalNum = converterParaNumero(valor);
    const parceladoReal = tipoPagamento === 'parcelado';
    const numP = parceladoReal ? parseInt(numeroParcelas, 10) || 1 : 1;
    const valorParcelaCalc = numP > 0 ? valorTotalNum / numP : valorTotalNum;

    const dados = {
      descricao: descricao.trim(),
      categoria,
      valor: valorTotalNum,
      vencimento: vencimento || 'Não informado',
      status: statusConta,
      fixa,
      cartaoOrigem,
      ehParcelado: parceladoReal,
      numeroParcelas: numP,
      valorParcela: valorParcelaCalc,
      diaFechamento,
      diaVencimento,
      taxaJurosMes: converterParaNumero(taxaJurosMes),
    };

    if (editandoContaId) {
      await updateDoc(doc(banco, 'contas', editandoContaId), dados);
    } else {
      await addDoc(collection(banco, 'contas'), dados);
    }

    fecharModalConta();
  };

  const marcarComoPaga = async (conta: Conta) => {
    await updateDoc(doc(banco, 'contas', conta.id), {
      status: conta.status === 'Paga' ? 'Pendente' : 'Paga',
    });
  };

  const removerConta = async (id: string) => {
    await deleteDoc(doc(banco, 'contas', id));
  };

  const editarConta = (conta: Conta) => {
    setEditandoContaId(conta.id);
    setDescricao(conta.descricao);
    setCategoria(conta.categoria);
    setValor(String(conta.valor));
    setVencimento(conta.vencimento);
    setStatusConta(conta.status);
    setFixa(conta.fixa);
    setCartaoOrigem(conta.cartaoOrigem || 'Nubank');
    setTipoPagamento(conta.ehParcelado ? 'parcelado' : 'a-vista');
    setEhParcelado(conta.ehParcelado || false);
    setNumeroParcelas(String(conta.numeroParcelas || 1));
    setDiaFechamento(conta.diaFechamento || '5');
    setDiaVencimento(conta.diaVencimento || '12');
    setTaxaJurosMes(String(conta.taxaJurosMes || 14));
    setModalContaAberto(true);
  };

  const limparFormularioConta = () => {
    setEditandoContaId(null);
    setDescricao('');
    setCategoria('Fatura de Cartão');
    setValor('');
    setVencimento('');
    setStatusConta('Pendente');
    setFixa(false);
    setCartaoOrigem('Nubank');
    setTipoPagamento('a-vista');
    setEhParcelado(false);
    setNumeroParcelas('1');
    setDiaFechamento('5');
    setDiaVencimento('12');
    setTaxaJurosMes('14');
  };

  const fecharModalConta = () => {
    limparFormularioConta();
    setModalContaAberto(false);
  };

  const calcularDivida = () => {
    const pv = converterParaNumero(valorDivida);
    const i = converterParaNumero(jurosDivida) / 100;
    const n = parseInt(parcelasDivida, 10) || 0;

    if (pv <= 0 || n <= 0) return null;

    let pmt: number;
    if (i === 0) {
      pmt = pv / n;
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

    fecharModalDivida();
  };

  const fecharModalDivida = () => {
    setDescDivida('');
    setValorDivida('');
    setJurosDivida('');
    setParcelasDivida('');
    setModalDividaAberto(false);
  };

  const removerDivida = async (id: string) => {
    await deleteDoc(doc(banco, 'dividas', id));
  };

  const gerarPdf = () => {
    const colunas = ['Descrição', 'Categoria', 'Origem', 'Vencimento', 'Status', 'Valor'];
    const linhas = contas.map((c) => [
      c.descricao,
      c.categoria,
      c.cartaoOrigem || '-',
      c.vencimento,
      c.status,
      formatarMoeda(c.valorParcela || c.valor),
    ]);

    gerarPdfGenerico(
      {
        titulo: 'Relatório de Finanças e Cartões',
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="text-primaria-700" />
          Finanças e Faturas de Cartão
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestão inteligente de cartões, fechamento, vencimento, parcelas e juros por atraso.
        </p>
      </div>

      {Object.keys(relatorioCartoes).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(relatorioCartoes).map(([nomeCartao, dados]) => (
            <div key={nomeCartao} className="cartao border-l-4 border-l-teal-600 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CreditCard size={18} className="text-teal-600" /> {nomeCartao}
                </h3>
                <span className="badge bg-teal-50 text-teal-700 text-xs font-semibold">
                  Fatura Atual
                </span>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400">Total da Fatura / Compras</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatarMoeda(dados.totalFatura)}
                </p>
              </div>
              <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Fechamento: Dia {dados.fechamento}</span>
                  <span>Vencimento: Dia {dados.vencimento}</span>
                </div>
                {dados.jurosEstimado > 0 && (
                  <div className="flex items-center gap-1 text-red-600 font-semibold pt-1">
                    <AlertCircle size={14} /> Juros por atraso estimado: {formatarMoeda(dados.jurosEstimado)}
                  </div>
                )}
                {dados.parcelamentos.length > 0 && (
                  <p className="text-teal-600 font-medium pt-1">
                    Possui {dados.parcelamentos.length} compra(s) parcelada(s) ativa(s).
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {gastosPorCategoria.length > 0 && (
        <div className="cartao">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Gastos por categoria</h2>
          <div className="space-y-3">
            {gastosPorCategoria.map((g) => {
              const pct = totalGeral > 0 ? (g.valor / totalGeral) * 100 : 0;
              return (
                <div key={g.categoria}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{g.categoria}</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">{formatarMoeda(g.valor)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${coresCategoria[g.categoria] || 'bg-teal-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            limparFormularioConta();
            setModalContaAberto(true);
          }}
          className="botao-primario"
        >
          <Plus size={18} />
          Adicionar conta ou fatura
        </button>
        <button onClick={() => setModalDividaAberto(true)} className="botao-secundario">
          <Calculator size={18} />
          Simulador empréstimo
        </button>
        <button onClick={gerarPdf} className="botao-secundario">
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      <div className="space-y-3">
        {contas.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma conta ou fatura registrada ainda.</p>
          </div>
        ) : (
          contas.map((c) => (
            <div key={c.id} className="cartao flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animar-entrada p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${coresCategoria[c.categoria] || 'bg-teal-500'} text-white`}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{c.descricao}</h3>
                    {c.cartaoOrigem && <span className="badge bg-teal-50 text-teal-700 text-xs">{c.cartaoOrigem}</span>}
                    {c.ehParcelado && <span className="badge bg-purple-50 text-purple-700 text-xs">Parcelado ({c.numeroParcelas}x)</span>}
                    {!c.ehParcelado && <span className="badge bg-blue-50 text-blue-700 text-xs">À vista</span>}
                    {c.fixa && <span className="badge bg-slate-100 text-slate-600 text-xs">Fixa</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {c.categoria} • Vence: {c.vencimento} • Valor: <strong className="text-slate-800 dark:text-slate-200">{formatarMoeda(c.valorParcela || c.valor)}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => marcarComoPaga(c)}
                  className={`badge px-3 py-1.5 ${
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
                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
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

      {dividas.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-600" />
            Empréstimos e Dívidas Cadastradas
          </h2>
          <div className="space-y-3">
            {dividas.map((d) => (
              <div key={d.id} className="cartao flex items-center gap-3 animar-entrada">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{d.descricao}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {d.parcelas}x de {formatarMoeda(d.valorParcela)} • Juros: {d.jurosMensal}%/mês
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

      {/* === Modal de conta / cartão / compra à vista ou parcelada === */}
      <Modal
        aberto={modalContaAberto}
        onFechar={fecharModalConta}
        titulo={editandoContaId ? 'Editar conta ou fatura' : 'Adicionar conta, cartão ou compra'}
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Compra Shopee / Fatura Nubank / Luz"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Conta['categoria'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                {categoriasConta.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-800 text-white">{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Cartão / Origem</label>
              <select
                value={cartaoOrigem}
                onChange={(e) => setCartaoOrigem(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              >
                <option value="Nubank" className="bg-slate-800 text-white">Nubank</option>
                <option value="Shopee" className="bg-slate-800 text-white">Shopee</option>
                <option value="Itaú" className="bg-slate-800 text-white">Itaú</option>
                <option value="Outros" className="bg-slate-800 text-white">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Valor Total (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 300,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Vencimento (dd/mm/aaaa)</label>
              <input
                type="text"
                placeholder="Ex: 12/09/2026"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Seleção de À vista ou Parcelado */}
          <div className="p-3 bg-slate-800 rounded-xl space-y-3 border border-slate-700">
            <label className="block text-xs font-bold text-white">Tipo de Pagamento</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipoPagamento('a-vista')}
                className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all ${
                  tipoPagamento === 'a-vista'
                    ? 'bg-teal-600 text-white shadow'
                    : 'bg-slate-900 text-slate-300 border border-slate-700'
                }`}
              >
                À vista
              </button>
              <button
                type="button"
                onClick={() => setTipoPagamento('parcelado')}
                className={`flex-1 py-2 rounded-lg font-semibold text-xs transition-all ${
                  tipoPagamento === 'parcelado'
                    ? 'bg-teal-600 text-white shadow'
                    : 'bg-slate-900 text-slate-300 border border-slate-700'
                }`}
              >
                Parcelado
              </button>
            </div>

            {tipoPagamento === 'parcelado' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">Número de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">Valor da Parcela</label>
                  <div className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm font-semibold flex items-center">
                    {formatarMoeda((converterParaNumero(valor) / (parseInt(numeroParcelas, 10) || 1)))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Dia Fechamento</label>
              <input
                type="text"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Dia Vencimento</label>
              <input
                type="text"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Juros Rotativo (%/mês)</label>
              <input
                type="text"
                value={taxaJurosMes}
                onChange={(e) => setTaxaJurosMes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusConta('Pendente')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                statusConta === 'Pendente' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              Pendente
            </button>
            <button
              type="button"
              onClick={() => setStatusConta('Paga')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                statusConta === 'Paga' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              Paga
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer">
            <input
              type="checkbox"
              checked={fixa}
              onChange={(e) => setFixa(e.target.checked)}
              className="w-4 h-4 rounded accent-teal-600"
            />
            Conta fixa mensal
          </label>

          <button onClick={salvarConta} className="botao-primario w-full">
            {editandoContaId ? 'Salvar alterações' : 'Adicionar conta / fatura'}
          </button>
        </div>
      </Modal>

      {/* === Modal de simulador de empréstimo === */}
      <Modal
        aberto={modalDividaAberto}
        onFechar={fecharModalDivida}
        titulo="Simulador de Empréstimo / Fatura Parcelada"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Descrição do Empréstimo / Dívida</label>
            <input
              type="text"
              placeholder="Ex: Empréstimo Pessoal"
              value={descDivida}
              onChange={(e) => setDescDivida(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 5000"
                value={valorDivida}
                onChange={(e) => setValorDivida(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Juros (%/mês)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 3.5"
                value={jurosDivida}
                onChange={(e) => setJurosDivida(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Parcelas</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 12"
                value={parcelasDivida}
                onChange={(e) => setParcelasDivida(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
          {resultadoDivida && (
            <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-300">Valor da parcela:</span>
                <span className="font-bold text-teal-400">{formatarMoeda(resultadoDivida.pmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total a pagar:</span>
                <span className="font-bold text-white">{formatarMoeda(resultadoDivida.total)}</span>
              </div>
            </div>
          )}
          <button onClick={salvarDivida} className="botao-primario w-full">
            Salvar empréstimo no sistema
          </button>
        </div>
      </Modal>
    </div>
  );
}
