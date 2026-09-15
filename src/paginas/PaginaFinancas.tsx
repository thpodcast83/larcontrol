/**
 * PaginaFinancas.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Finanças com Controle de Usuário (vinculado ao Firebase Auth).
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
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { banco, auth } from '@/firebase';
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
  Search,
  X,
  Info,
  Settings,
  Upload,
  RefreshCw,
  UserCheck,
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

interface RegraCartao {
  id: string;
  nome: string;
  fechamento: string;
  vencimento: string;
  jurosMes: number;
  descricaoRegra: string;
}

const regrasPadraoIniciais: Record<string, Omit<RegraCartao, 'id'>> = {
  Nubank: {
    nome: 'Nubank',
    fechamento: '03',
    vencimento: '10',
    jurosMes: 2.75,
    descricaoRegra: 'Rotativo padrão de 2,75% a.m.',
  },
  Shopee: {
    nome: 'Shopee',
    fechamento: '10',
    vencimento: '20',
    jurosMes: 5.9,
    descricaoRegra: 'Cartão co-branded.',
  },
  Itaú: {
    nome: 'Itaú',
    fechamento: '1',
    vencimento: '10',
    jurosMes: 9.9,
    descricaoRegra: 'Rotativo padrão de mercado.',
  },
  Outros: {
    nome: 'Outros',
    fechamento: '10',
    vencimento: '20',
    jurosMes: 10.0,
    descricaoRegra: 'Condições gerais.',
  },
};

function converterParaNumero(val: string): number {
  if (!val) return 0;
  const limpo = val.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

export function PaginaFinancas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [configCartoes, setConfigCartoes] = useState<Record<string, RegraCartao>>({});
  const [responsaveisBanco, setResponsaveisBanco] = useState<string[]>([]);
  
  // Controle de filtro por usuário
  const [apenasMinhasFinancas, setApenasMinhasFinancas] = useState(false);
  const usuarioAtual = auth.currentUser;

  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [modalDividaAberto, setModalDividaAberto] = useState(false);
  const [modalRegrasAberto, setModalRegrasAberto] = useState(false);
  const [modalConfigCartaoAberto, setModalConfigCartaoAberto] = useState(false);

  const [editandoContaId, setEditandoContaId] = useState<string | null>(null);
  const [cartaoEditandoConfig, setCartaoEditandoConfig] = useState<string>('Nubank');

  const [novoFechamento, setNovoFechamento] = useState('3');
  const [novoVencimento, setNovoVencimento] = useState('10');
  const [novoJuros, setNovoJuros] = useState('2.75');

  const [termoBusca, setTermoBusca] = useState('');

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Conta['categoria']>('Fatura de Cartão');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [statusConta, setStatusConta] = useState<'Paga' | 'Pendente'>('Pendente');
  const [fixa, setFixa] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState(usuarioAtual?.email || '');

  const [cartaoOrigem, setCartaoOrigem] = useState('Nubank');
  const [tipoPagamento, setTipoPagamento] = useState<'a-vista' | 'parcelado'>('a-vista');
  const [numeroParcelas, setNumeroParcelas] = useState('1');
  const [parcelaAtual, setParcelaAtual] = useState('1');

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
          parcelaAtual: dados.parcelaAtual || 1,
          valorParcela: dados.valorParcela || dados.valor || 0,
          diaFechamento: dados.diaFechamento || '',
          diaVencimento: dados.diaVencimento || '',
          taxaJurosMes: dados.taxaJurosMes || 0,
          responsavelId: dados.responsavelId || '',
          responsavelNome: dados.responsavelNome || '',
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

    const cancelarConfig = onSnapshot(collection(banco, 'config_cartoes'), (snapshot) => {
      const configsMap: Record<string, RegraCartao> = {};
      Object.entries(regrasPadraoIniciais).forEach(([k, v]) => {
        configsMap[k] = { id: k, ...v };
      });

      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        if (dados.nome) {
          configsMap[dados.nome] = {
            id: docSnap.id,
            nome: dados.nome,
            fechamento: dados.fechamento || '3',
            vencimento: dados.vencimento || '10',
            jurosMes: dados.jurosMes ?? 2.75,
            descricaoRegra: dados.descricaoRegra || '',
          };
        }
      });
      setConfigCartoes(configsMap);
    });

    const cancelarUsuarios = onSnapshot(collection(banco, 'users'), (snapshot) => {
      const nomes: string[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        const identificadorUsuario = dados.email || dados.nome || dados.displayName;
        if (identificadorUsuario && !nomes.includes(identificadorUsuario)) {
          nomes.push(identificadorUsuario);
        }
      });
      setResponsaveisBanco(nomes);
    });

    return () => {
      cancelarContas();
      cancelarDividas();
      cancelarConfig();
      cancelarUsuarios();
    };
  }, []);

  // Filtragem considerando busca textual e restrição por usuário logado (se ativado)
  const contasFiltradas = useMemo(() => {
    let resultado = contas;

    if (apenasMinhasFinancas && usuarioAtual) {
      resultado = resultado.filter(
        (c) => c.responsavelId === usuarioAtual.uid || c.responsavelNome === usuarioAtual.email
      );
    }

    if (termoBusca.trim()) {
      const buscaLower = termoBusca.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          c.descricao.toLowerCase().includes(buscaLower) ||
          c.categoria.toLowerCase().includes(buscaLower) ||
          (c.cartaoOrigem && c.cartaoOrigem.toLowerCase().includes(buscaLower)) ||
          (c.responsavelNome && c.responsavelNome.toLowerCase().includes(buscaLower))
      );
    }

    return resultado;
  }, [contas, termoBusca, apenasMinhasFinancas, usuarioAtual]);

  const contasDespesasReais = useMemo(() => {
    return contasFiltradas.filter((c) => !c.descricao.toLowerCase().includes('pagamento de fatura'));
  }, [contasFiltradas]);

  const totalPendente = useMemo(
    () => contasDespesasReais.filter((c) => c.status === 'Pendente').reduce((acc, c) => acc + (c.valorParcela || c.valor), 0),
    [contasDespesasReais]
  );

  const totalPago = useMemo(
    () => contasFiltradas.filter((c) => c.status === 'Paga').reduce((acc, c) => acc + (c.valorParcela || c.valor), 0),
    [contasFiltradas]
  );

  const totalGeral = useMemo(() => contasDespesasReais.reduce((acc, c) => acc + (c.valorParcela || c.valor), 0), [contasDespesasReais]);

  const relatorioCartoes = useMemo(() => {
    const mapa: Record<string, { totalFatura: number, parcelamentos: any[], vencimento: string, fechamento: string, jurosEstimado: number }> = {};
    const hoje = new Date();

    contasDespesasReais.forEach((c) => {
      const nomeCartao = c.cartaoOrigem || 'Geral';
      const regraGlobal = configCartoes[nomeCartao] || configCartoes['Outros'] || { fechamento: '3', vencimento: '10', jurosMes: 2.75 };

      if (!mapa[nomeCartao]) {
        mapa[nomeCartao] = {
          totalFatura: 0,
          parcelamentos: [],
          vencimento: regraGlobal.vencimento,
          fechamento: regraGlobal.fechamento,
          jurosEstimado: 0,
        };
      }

      const valParcela = c.valorParcela || c.valor;
      mapa[nomeCartao].totalFatura += valParcela;

      if (c.ehParcelado && c.numeroParcelas && c.numeroParcelas > 1) {
        mapa[nomeCartao].parcelamentos.push(c);
      }
    });

    return mapa;
  }, [contasDespesasReais, configCartoes]);

  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    contasDespesasReais.forEach((c) => {
      const val = c.valorParcela || c.valor;
      mapa[c.categoria] = (mapa[c.categoria] || 0) + val;
    });
    return categoriasConta
      .map((cat) => ({ categoria: cat, valor: mapa[cat] || 0 }))
      .filter((c) => c.valor > 0);
  }, [contasDespesasReais]);

  const salvarConta = async () => {
    if (!descricao.trim() || !valor) return;

    const valorTotalNum = converterParaNumero(valor);
    const parceladoReal = tipoPagamento === 'parcelado';
    const numP = parceladoReal ? parseInt(numeroParcelas, 10) || 1 : 1;
    const atualP = parceladoReal ? parseInt(parcelaAtual, 10) || 1 : 1;
    const valorParcelaCalc = numP > 0 ? valorTotalNum / numP : valorTotalNum;

    const regraGlobal = configCartoes[cartaoOrigem] || configCartoes['Outros'] || { fechamento: '3', vencimento: '10', jurosMes: 2.75 };

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
      parcelaAtual: atualP,
      valorParcela: valorParcelaCalc,
      diaFechamento: regraGlobal.fechamento,
      diaVencimento: regraGlobal.vencimento,
      taxaJurosMes: regraGlobal.jurosMes,
      responsavelId: usuarioAtual?.uid || '',
      responsavelNome: responsavelNome || usuarioAtual?.email || 'Não atribuído',
    };

    if (editandoContaId) {
      await updateDoc(doc(banco, 'contas', editandoContaId), dados);
    } else {
      await addDoc(collection(banco, 'contas'), dados);
    }

    fecharModalConta();
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
    setNumeroParcelas('1');
    setParcelaAtual('1');
    setResponsavelNome(usuarioAtual?.email || '');
  };

  const fecharModalConta = () => {
    limparFormularioConta();
    setModalContaAberto(false);
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
    setNumeroParcelas(String(conta.numeroParcelas || 1));
    setParcelaAtual(String(conta.parcelaAtual || 1));
    setResponsavelNome(conta.responsavelNome || '');
    setModalContaAberto(true);
  };

  const abrirConfigCartao = (nomeCartao: string) => {
    setCartaoEditandoConfig(nomeCartao);
    const atual = configCartoes[nomeCartao] || regrasPadraoIniciais[nomeCartao] || { fechamento: '3', vencimento: '10', jurosMes: 2.75 };
    setNovoFechamento(atual.fechamento);
    setNovoVencimento(atual.vencimento);
    setNovoJuros(String(atual.jurosMes));
    setModalConfigCartaoAberto(true);
  };

  const salvarConfigCartao = async () => {
    const dadosRegra = {
      nome: cartaoEditandoConfig,
      fechamento: novoFechamento.trim(),
      vencimento: novoVencimento.trim(),
      jurosMes: converterParaNumero(novoJuros),
      descricaoRegra: configCartoes[cartaoEditandoConfig]?.descricaoRegra || 'Regras personalizadas do cartão.',
    };

    await setDoc(doc(banco, 'config_cartoes', cartaoEditandoConfig), dadosRegra);
    setModalConfigCartaoAberto(false);
  };

  const gerarPdf = () => {
    const colunas = ['Descrição', 'Categoria', 'Responsável', 'Origem', 'Vencimento', 'Status', 'Valor'];
    const linhas = contasFiltradas.map((c) => [
      c.descricao,
      c.categoria,
      c.responsavelNome || '-',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="text-primaria-700" />
            Finanças e Faturas de Cartão
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestão inteligente de cartões, importação de extratos, parcelas e encargos por morador.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setApenasMinhasFinancas(!apenasMinhasFinancas)}
            className={`botao-secundario flex items-center gap-1.5 text-xs ${
              apenasMinhasFinancas ? 'bg-teal-50 dark:bg-slate-800 border-teal-500 text-teal-700 dark:text-teal-400' : ''
            }`}
          >
            <UserCheck size={16} className="text-teal-600" />
            {apenasMinhasFinancas ? 'Exibindo Apenas Minhas Finanças' : 'Exibir Todas da Residência'}
          </button>
          <button
            onClick={() => setModalRegrasAberto(true)}
            className="botao-secundario flex items-center gap-1.5 text-xs"
          >
            <Info size={16} className="text-teal-600" />
            Regras e Taxas
          </button>
        </div>
      </div>

      {Object.keys(relatorioCartoes).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(relatorioCartoes).map(([nomeCartao, dados]) => (
            <div key={nomeCartao} className="cartao border-l-4 border-l-teal-600 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CreditCard size={18} className="text-teal-600" /> {nomeCartao}
                </h3>
                <button
                  onClick={() => abrirConfigCartao(nomeCartao)}
                  className="badge bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Settings size={12} /> Regras Gerais
                </button>
              </div>
              <div className="pt-2">
                <span className="text-xs text-slate-400">Total da Fatura / Compras</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatarMoeda(dados.totalFatura)}
                </p>
              </div>
              <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between font-medium text-slate-600 dark:text-slate-300">
                  <span>Fechamento: Dia {dados.fechamento}</span>
                  <span>Vencimento: Dia {dados.vencimento}</span>
                </div>
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
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatarMoeda(totalGeral)}</p>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
            Simulador
          </button>
          <button onClick={gerarPdf} className="botao-secundario">
            <FileText size={18} />
            PDF
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar compra, cartão, responsável..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm"
          />
          {termoBusca && (
            <button
              onClick={() => setTermoBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {contasFiltradas.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Wallet size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhuma conta encontrada para os filtros atuais.</p>
          </div>
        ) : (
          contasFiltradas.map((c) => (
            <div key={c.id} className="cartao flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animar-entrada p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${coresCategoria[c.categoria] || 'bg-teal-500'} text-white`}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{c.descricao}</h3>
                    {c.cartaoOrigem && <span className="badge bg-teal-50 text-teal-700 text-xs">{c.cartaoOrigem}</span>}
                    {c.responsavelNome && <span className="badge bg-indigo-50 text-indigo-700 text-xs">👤 {c.responsavelNome}</span>}
                    {c.ehParcelado && (
                      <span className="badge bg-purple-50 text-purple-700 text-xs">
                        Parcela {c.parcelaAtual || 1}/{c.numeroParcelas}
                      </span>
                    )}
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
                    c.status === 'Paga' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
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

      {/* Modal Adicionar/Editar Conta */}
      <Modal
        aberto={modalContaAberto}
        onFechar={fecharModalConta}
        titulo={editandoContaId ? 'Editar conta' : 'Adicionar conta ou compra'}
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Fatura Nubank / Luz"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Conta['categoria'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
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
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
              >
                {Object.keys(configCartoes).map((nomeC) => (
                  <option key={nomeC} value={nomeC} className="bg-slate-800 text-white">
                    {nomeC}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Responsável pela despesa</label>
            <select
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
            >
              <option value="">Selecione um responsável...</option>
              {responsaveisBanco.map((resp: string) => (
                <option key={resp} value={resp} className="bg-slate-800 text-white">{resp}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white mb-1">Valor (R$)</label>
              <input
                type="text"
                placeholder="Ex: 150,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white mb-1">Vencimento</label>
              <input
                type="text"
                placeholder="Ex: 10/10/2026"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusConta('Pendente')}
              className={`flex-1 py-2 rounded-xl font-semibold text-sm ${statusConta === 'Pendente' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              Pendente
            </button>
            <button
              type="button"
              onClick={() => setStatusConta('Paga')}
              className={`flex-1 py-2 rounded-xl font-semibold text-sm ${statusConta === 'Paga' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              Paga
            </button>
          </div>

          <button onClick={salvarConta} className="botao-primario w-full">
            {editandoContaId ? 'Salvar alterações' : 'Adicionar conta'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
