/**
 * PaginaMercado.tsx (Estilo Calculadora / PDV Rápido)
 * -----------------------------------------------------------------------------
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import { useAuth } from '@/contextos/ContextoAuth';
import type { ItemCarrinho } from '@/tipos';
import { formatarMoeda } from '@/utils/utilFormato';
import { obterGeolocalizacao } from '@/utils/utilGeolocalizacao';
import { Modal } from '@/componentes/Modal';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Wallet,
  Search,
  CheckCircle,
  Calendar,
  Edit2,
  Save,
  Tag,
  PlusCircle,
  Delete,
  Percent,
} from 'lucide-react';

function ItemCarrinhoCard({ item }: { item: ItemCarrinho }) {
  const [qtdEditada, setQtdEditada] = useState(item.quantidade ? item.quantidade.toString() : '1');
  const [unidadeEditada, setUnidadeEditada] = useState<'un' | 'kg' | 'g'>(item.unidade || 'un');
  const [precoEditado, setPrecoEditado] = useState(item.precoUnitario ? item.precoUnitario.toString() : '');

  useEffect(() => {
    setQtdEditada(item.quantidade?.toString() || '1');
    setUnidadeEditada(item.unidade || 'un');
    setPrecoEditado(item.precoUnitario?.toString() || '');
  }, [item]);

  const qNum = parseFloat(qtdEditada.replace(',', '.')) || 0;
  const pNum = parseFloat(precoEditado.replace(',', '.')) || 0;

  let subtotalCalculado = qNum * pNum;
  if (unidadeEditada === 'g') {
    subtotalCalculado = (qNum / 1000) * pNum;
  }

  const handleSalvarNoCarrinho = async (novaQtdValor: number, novoPrecoValor: number, novaUnidadeValor: 'un' | 'kg' | 'g') => {
    let novoSubtotal = novaQtdValor * novoPrecoValor;
    if (novaUnidadeValor === 'g') {
      novoSubtotal = (novaQtdValor / 1000) * novoPrecoValor;
    }

    try {
      await updateDoc(doc(banco, 'carrinho_atual', item.id), {
        quantidade: novaQtdValor,
        unidade: novaUnidadeValor,
        precoUnitario: novoPrecoValor,
        subtotal: novoSubtotal,
      });
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
    }
  };

  const alterarQuantidade = (delta: number) => {
    const passo = unidadeEditada === 'kg' ? 0.1 : 1;
    const novaQtd = Math.max(0, parseFloat((qNum + delta * passo).toFixed(2)));
    setQtdEditada(novaQtd.toString());
    handleSalvarNoCarrinho(novaQtd, pNum, unidadeEditada);
  };

  const salvarManual = async () => {
    await handleSalvarNoCarrinho(qNum, pNum, unidadeEditada);
  };

  const removerItem = async () => {
    await deleteDoc(doc(banco, 'carrinho_atual', item.id));
  };

  return (
    <div className="flex flex-col gap-3 border border-slate-700/60 p-4 rounded-xl bg-slate-800/90 text-slate-100 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-100">{item.nome}</h3>
          <p className="text-xs text-slate-400">Adicionado por {item.adicionadoPor}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-teal-400 font-bold">
            Subtotal: {formatarMoeda(subtotalCalculado)}
          </span>
          <button onClick={removerItem} className="text-slate-400 hover:text-red-400 transition-colors" title="Excluir item">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
        <div>
          <label className="text-[10px] text-slate-400 block">Quantidade / Peso</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => alterarQuantidade(-1)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg border border-slate-600 transition-all"
              title="Diminuir"
            >
              <Minus size={14} />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={qtdEditada}
              onChange={(e) => setQtdEditada(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg py-1.5 px-2 text-center w-full focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => alterarQuantidade(1)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg border border-slate-600 transition-all"
              title="Aumentar"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">Unidade</label>
          <select
            value={unidadeEditada}
            onChange={(e) => {
              const novaUn = e.target.value as 'un' | 'kg' | 'g';
              setUnidadeEditada(novaUn);
              handleSalvarNoCarrinho(qNum, pNum, novaUn);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg py-1.5 px-2 w-full focus:outline-none focus:border-teal-500"
          >
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilo (kg)</option>
            <option value="g">Grama (g)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">Preço Unitário (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={precoEditado}
            onChange={(e) => setPrecoEditado(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-lg py-1.5 px-2 w-full focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-end h-full pt-2 sm:pt-0">
          <button
            onClick={salvarManual}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs w-full py-2.5 rounded-lg transition-all"
            type="button"
          >
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaginaMercado() {
  const { usuario } = useAuth();

  const [itensCarrinho, setItensCarrinho] = useState<ItemCarrinho[]>([]);
  const [modo, setModo] = useState<'rancho' | 'extras'>('rancho');

  const [teto, setTeto] = useState<number>(() => {
    const salvo = localStorage.getItem('@mercado_teto');
    return salvo ? parseFloat(salvo) : 0;
  });
  const [editandoTeto, setEditandoTeto] = useState(false);
  const [tetoInput, setTetoInput] = useState('');

  const [dataCompra, setDataCompra] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mercado, setMercado] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  
  const [descontoGlobal, setDescontoGlobal] = useState<string>(() => {
    return localStorage.getItem('@mercado_desconto') || '';
  });
  
  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [salvandoCompra, setSalvandoCompra] = useState(false);

  const [catalogoGeral, setCatalogoGeral] = useState<any[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Estados estilo Calculadora PDV
  const [focoAtivo, setFocoAtivo] = useState<'quantidade' | 'preco'>('quantidade');
  const [calcQuantidade, setCalcQuantidade] = useState('0');
  const [calcPreco, setCalcPreco] = useState('');
  const [modoKg, setModoKg] = useState(false);

  // Estados para Modais de Atalho da Calculadora
  const [modalNomeAberto, setModalNomeAberto] = useState(false);
  const [calcNomeItem, setCalcNomeItem] = useState('');

  const [modalDescontoAberto, setModalDescontoAberto] = useState(false);
  const [tipoDesconto, setTipoDesconto] = useState<'percent' | 'real'>('percent');
  const [valorDescontoModal, setValorDescontoModal] = useState('0,00');

  // Salvar teto e desconto no localStorage
  useEffect(() => {
    localStorage.setItem('@mercado_teto', teto.toString());
  }, [teto]);

  useEffect(() => {
    localStorage.setItem('@mercado_desconto', descontoGlobal);
  }, [descontoGlobal]);

  useEffect(() => {
    const q = query(collection(banco, 'carrinho_atual'), orderBy('adicionadoEm', 'desc'));
    const cancelar = onSnapshot(q, (snapshot) => {
      const lista: ItemCarrinho[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          quantidade: dados.quantidade || 0,
          unidade: dados.unidade || 'un',
          precoUnitario: dados.precoUnitario || 0,
          subtotal: dados.subtotal || 0,
          modo: dados.modo || 'rancho',
          mercado: dados.mercado || '',
          adicionadoPor: dados.adicionadoPor || '',
          adicionadoEm: dados.adicionadoEm?.toMillis?.() || 0,
        });
      });
      setItensCarrinho(lista);
    });
    return () => cancelar();
  }, []);

  useEffect(() => {
    async function carregarCatalogo() {
      try {
        const lista: any[] = [];
        const idsVistos = new Set<string>();

        const snapDespensa = await getDocs(collection(banco, 'despensa'));
        snapDespensa.forEach((docSnap) => {
          const dados = docSnap.data();
          const nomeItem = (dados.nome || '').trim();
          const chaveUnica = `${nomeItem.toLowerCase()}_${dados.quantidade || 1}`;

          if (nomeItem && !idsVistos.has(chaveUnica)) {
            idsVistos.add(chaveUnica);
            lista.push({ id: docSnap.id, ...dados });
          }
        });

        const snapMercado = await getDocs(collection(banco, 'mercado'));
        snapMercado.forEach((docSnap) => {
          const dados = docSnap.data();
          const nomeItem = (dados.nome || '').trim();
          const chaveUnica = `${nomeItem.toLowerCase()}_${dados.quantidade || 1}`;

          if (nomeItem && !idsVistos.has(chaveUnica)) {
            idsVistos.add(chaveUnica);
            lista.push({ id: docSnap.id, ...dados });
          }
        });

        setCatalogoGeral(lista);
      } catch (err) {
        console.error('Erro ao carregar catálogo:', err);
      } finally {
        setCarregandoCatalogo(false);
      }
    }
    carregarCatalogo();
  }, []);

  const resultadosBusca = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();
    if (!termo) return [];
    return catalogoGeral
      .filter((item) => (item.nome || '').toLowerCase().includes(termo))
      .slice(0, 15);
  }, [catalogoGeral, termoBusca]);

  const itensModo = useMemo(() => itensCarrinho.filter((i) => i.modo === modo), [itensCarrinho, modo]);

  const totalBruto = useMemo(() => {
    return itensModo.reduce((acc, i) => acc + (i.subtotal || 0), 0);
  }, [itensModo]);

  // Cálculo da soma atual do item sendo digitado na calculadora
  const qCalcNum = parseFloat(calcQuantidade.replace(',', '.')) || 0;
  const pCalcNum = parseFloat(calcPreco.replace(',', '.')) || 0;
  let somaItemAtual = modoKg ? (qCalcNum / 1000) * pCalcNum : qCalcNum * pCalcNum;

  const dGlobalNum = parseFloat(descontoGlobal.replace(',', '.')) || 0;
  const totalGasto = Math.max(0, totalBruto - dGlobalNum);
  const saldo = teto - totalGasto;

  const buscarGPS = async () => {
    try {
      const resultado = await obterGeolocalizacao();
      setLocalizacao(resultado.texto);
    } catch (erro) {
      console.error(erro);
      alert('Não foi possível obter a localização atual.');
    }
  };

  const adicionarAoCarrinhoDoBanco = async (prod: any) => {
    const qtd = prod.quantidade || 1;
    const preco = prod.precoUnitario || prod.ultimoPreco || 0;
    const unidade = prod.unidade || 'un';
    const subtotal = unidade === 'g' ? (qtd / 1000) * preco : qtd * preco;

    await addDoc(collection(banco, 'carrinho_atual'), {
      nome: prod.nome || 'Produto',
      quantidade: qtd,
      unidade,
      precoUnitario: preco,
      subtotal,
      modo,
      mercado: mercado || 'Não informado',
      adicionadoPor: usuario?.nome || 'Usuário',
      adicionadoEm: serverTimestamp(),
    });

    setTermoBusca('');
  };

  // Teclado da Calculadora: Inserir Dígito ou Botão
  const handleDigitoCalc = (digito: string) => {
    if (focoAtivo === 'quantidade') {
      if (digito === 'C') {
        setCalcQuantidade('0');
      } else if (digito === 'DEL') {
        setCalcQuantidade((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      } else {
        setCalcQuantidade((prev) => (prev === '0' && digito !== ',' ? digito : prev + digito));
      }
    } else {
      if (digito === 'C') {
        setCalcPreco('0');
      } else if (digito === 'DEL') {
        setCalcPreco((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      } else {
        setCalcPreco((prev) => (prev === '0' && digito !== ',' ? digito : prev + digito));
      }
    }
  };

  // Confirmar adição do item via Calculadora PDV
  const confirmarItemCalculadora = async () => {
    if (!calcNomeItem.trim()) {
      setModalNomeAberto(true);
      return;
    }

    const qtd = parseFloat(calcQuantidade.replace(',', '.')) || 1;
    const preco = parseFloat(calcPreco.replace(',', '.')) || 0;
    const unidade = modoKg ? 'kg' : 'un';
    const subtotal = unidade === 'kg' ? (qtd / 1000) * preco : qtd * preco;

    await addDoc(collection(banco, 'carrinho_atual'), {
      nome: calcNomeItem.trim(),
      quantidade: qtd,
      unidade,
      precoUnitario: preco,
      subtotal,
      modo,
      mercado: mercado || 'Não informado',
      adicionadoPor: usuario?.nome || 'Usuário',
      adicionadoEm: serverTimestamp(),
    });

    // Resetar campos da calculadora para o próximo item
    setCalcNomeItem('');
    setCalcQuantidade('0');
    setCalcPreco('');
    setFocoAtivo('quantidade');
  };

  const limparCarrinho = async () => {
    if (!confirm('Deseja limpar todos os itens do carrinho atual?')) return;
    const lote = writeBatch(banco);
    itensModo.forEach((item) => {
      lote.delete(doc(banco, 'carrinho_atual', item.id));
    });
    await lote.commit();
  };

  const finalizarCompra = async () => {
    if (itensModo.length === 0) return;
    setSalvandoCompra(true);

    try {
      await addDoc(collection(banco, 'historico_compras'), {
        dataCompra,
        mercado: mercado.trim() || 'Mercado não informado',
        localizacao: localizacao.trim() || 'Localização não informada',
        tetoGasto: teto,
        totalBruto,
        descontoGlobal: dGlobalNum,
        totalGasto,
        modo,
        totalItens: itensModo.length,
        compradoPor: usuario?.nome || 'Usuário',
        finalizadoEm: serverTimestamp(),
        produtos: itensModo.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
          precoUnitario: i.precoUnitario,
          subtotal: i.subtotal,
        })),
      });

      const lote = writeBatch(banco);
      itensModo.forEach((item) => {
        lote.delete(doc(banco, 'carrinho_atual', item.id));
      });
      await lote.commit();

      alert('Compra guardada com sucesso no histórico!');
      setMercado('');
      setLocalizacao('');
      setDescontoGlobal('');
      localStorage.removeItem('@mercado_desconto');
    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
      alert('Erro ao finalizar compra.');
    } finally {
      setSalvandoCompra(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShoppingCart className="text-teal-600" />
          Mercado / Calculadora PDV
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Faça suas compras usando o teclado rápido estilo PDV com visor de soma em tempo real.
        </p>
      </div>

      {/* Configurações Iniciais da Compra */}
      <div className="cartao p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Calendar size={14} /> Data da Compra
            </label>
            <input
              type="date"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
              className="campo-entrada text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <Tag size={14} /> Nome do Mercado
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado X"
              value={mercado}
              onChange={(e) => setMercado(e.target.value)}
              className="campo-entrada text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
              <MapPin size={14} /> Localização
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Centro"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="campo-entrada text-sm"
              />
              <button
                onClick={buscarGPS}
                type="button"
                className="bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                title="Obter localização atual"
              >
                <MapPin size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Wallet size={14} /> Teto de Gasto (R$)
              </label>
              {!editandoTeto ? (
                <button
                  onClick={() => {
                    setTetoInput(teto ? teto.toString() : '');
                    setEditandoTeto(true);
                  }}
                  className="text-teal-600 text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <Edit2 size={12} /> {teto > 0 ? 'Editar Teto' : 'Definir Teto'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTeto(parseFloat(tetoInput.replace(',', '.')) || 0);
                    setEditandoTeto(false);
                  }}
                  className="text-emerald-600 text-xs font-bold hover:underline flex items-center gap-1"
                >
                  <Save size={12} /> Salvar Teto
                </button>
              )}
            </div>

            {editandoTeto ? (
              <input
                type="text"
                inputMode="decimal"
                value={tetoInput}
                onChange={(e) => setTetoInput(e.target.value)}
                placeholder="0.00"
                className="campo-entrada text-sm"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 py-2">
                {teto > 0 ? formatarMoeda(teto) : 'Nenhum teto definido'}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Desconto Global no Caixa (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 10,00"
              value={descontoGlobal}
              onChange={(e) => setDescontoGlobal(e.target.value)}
              className="campo-entrada text-sm"
            />
          </div>
        </div>
      </div>

      {/* Visor Geral da Compra */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl shadow-lg gap-4 border border-slate-800">
        <div>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            SOMA TOTAL ({modo === 'rancho' ? 'Rancho' : 'Gastos Extras'})
          </span>
          <h2 className="text-4xl font-extrabold text-white mt-0.5">
            {formatarMoeda(totalGasto)}
          </h2>
          {dGlobalNum > 0 && (
            <p className="text-xs text-teal-300 mt-1">
              Bruto: {formatarMoeda(totalBruto)} | Desconto: -{formatarMoeda(dGlobalNum)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {teto > 0 && (
            <div className="text-right bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block">Saldo Restante</span>
              <span className={`text-sm font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatarMoeda(saldo)}
              </span>
            </div>
          )}

          <span className="bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl font-medium border border-slate-700">
            {itensModo.length} itens
          </span>

          {itensModo.length > 0 && (
            <button
              onClick={limparCarrinho}
              className="bg-red-900/60 hover:bg-red-800 text-red-200 p-2.5 rounded-xl text-xs transition-all border border-red-700/50"
              title="Limpar carrinho"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setModo('rancho')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'rancho' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
          }`}
        >
          Rancho (VR/VA)
        </button>
        <button
          onClick={() => setModo('extras')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'extras' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500'
          }`}
        >
          Gastos Extras
        </button>
      </div>

      {/* --- ESTILO CALCULADORA PDV --- */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 space-y-4">
        
        {/* Topo do Bloco da Calculadora: Nome do Item Atual e Toggle R$/kg */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">Item:</span>
            <button
              onClick={() => setModalNomeAberto(true)}
              className="text-teal-400 hover:underline font-semibold text-sm bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              {calcNomeItem ? calcNomeItem : '+ Adicionar um nome'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">R$/kg</span>
            <button
              type="button"
              onClick={() => setModoKg(!modoKg)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${modoKg ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${modoKg ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Campos de Quantidade e Preço Selecionáveis */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => setFocoAtivo('quantidade')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              focoAtivo === 'quantidade' ? 'border-teal-400 bg-slate-800/80 shadow-md' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <span className="text-[11px] text-slate-400 block">Quantidade {modoKg ? 'g' : 'un'}</span>
            <div className="text-xl font-bold text-teal-300 flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const qNum = parseFloat(calcQuantidade.replace(',', '.')) || 0;
                    const passo = modoKg ? 100 : 1;
                    const novaQtd = Math.max(0, qNum - passo);
                    setCalcQuantidade(novaQtd.toString());
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded-lg text-sm border border-slate-600 transition-all"
                  title="Diminuir"
                >
                  -
                </button>
                <span>{calcQuantidade}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const qNum = parseFloat(calcQuantidade.replace(',', '.')) || 0;
                    const passo = modoKg ? 100 : 1;
                    const novaQtd = qNum + passo;
                    setCalcQuantidade(novaQtd.toString());
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded-lg text-sm border border-slate-600 transition-all"
                  title="Aumentar"
                >
                  +
                </button>
              </div>
              <span className="text-xs font-normal text-slate-400">{modoKg ? 'g' : 'un'}</span>
            </div>
          </div>

          <div
            onClick={() => setFocoAtivo('preco')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              focoAtivo === 'preco' ? 'border-teal-400 bg-slate-800/80 shadow-md' : 'border-slate-800 bg-slate-900'
            }`}
          >
            <span className="text-[11px] text-slate-400 block">Preço Unitário</span>
            <div className="text-xl font-bold text-slate-100 flex items-center justify-between mt-1">
              <span>{calcPreco ? formatarMoeda(parseFloat(calcPreco.replace(',', '.')) || 0) : 'R$ 0,00'}</span>
            </div>
          </div>
        </div>

        {/* Subtotal Parcial do Item Atual */}
        <div className="text-center bg-slate-800/50 py-2 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Subtotal do item: </span>
          <span className="text-sm font-bold text-emerald-400">{formatarMoeda(somaItemAtual)}</span>
        </div>

        {/* Botões de Atalho Rápido Superior na Calculadora */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setModalNomeAberto(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all h-14"
          >
            <Plus size={16} className="text-teal-400 mb-0.5" />
            <span>Nome</span>
          </button>

          <button
            onClick={() => alert('Função de foto em breve')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all h-14"
          >
            <Plus size={16} className="text-teal-400 mb-0.5" />
            <span>📷 Foto</span>
          </button>

          <button
            onClick={() => setModalDescontoAberto(true)}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all h-14"
          >
            <Plus size={16} className="text-teal-400 mb-0.5" />
            <span>Desconto</span>
          </button>

          <button
            onClick={confirmarItemCalculadora}
            className="flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all h-14 shadow-lg border border-emerald-500"
            title="Confirmar e Adicionar Item"
          >
            <CheckCircle size={24} />
          </button>
        </div>

        {/* Grade do Teclado Numérico da Calculadora */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {['1', '2', '3', 'DEL', '4', '5', '6', 'C', '7', '8', '9', '-', ',', '0', ',99'].map((tecla) => (
            <button
              key={tecla}
              onClick={() => {
                if (tecla === 'DEL') {
                  handleDigitoCalc('DEL');
                } else if (tecla === ',99') {
                  if (focoAtivo === 'preco') {
                    const parteInteira = calcPreco.includes(',') ? calcPreco.split(',')[0] : (calcPreco || '0');
                    setCalcPreco(parteInteira === '0' || !parteInteira ? '0,99' : `${parteInteira},99`);
                  } else {
                    const parteInteiraQtd = calcQuantidade.includes(',') ? calcQuantidade.split(',')[0] : (calcQuantidade || '0');
                    setCalcQuantidade(parteInteiraQtd === '0' || !parteInteiraQtd ? '0,99' : `${parteInteiraQtd},99`);
                  }
                } else {
                  handleDigitoCalc(tecla);
                }
              }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-lg py-3.5 rounded-xl transition-all flex items-center justify-center shadow-sm active:scale-95"
            >
              {tecla === 'DEL' ? <Delete size={20} /> : tecla}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Busca de Produtos do Banco de Dados */}
      <div className="relative pt-2">
        <label className="text-xs font-semibold text-slate-500 mb-1 block">
          Ou buscar no banco de dados para colocar no carrinho:
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={carregandoCatalogo ? 'Carregando base de dados...' : 'Digite o nome do produto (ex: leite, arroz)...'}
            disabled={carregandoCatalogo}
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="campo-entrada pl-10"
          />
        </div>

        {termoBusca.trim() !== '' && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {resultadosBusca.length === 0 ? (
              <p className="p-3 text-xs text-slate-400 text-center">Nenhum produto encontrado com esse nome.</p>
            ) : (
              resultadosBusca.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => adicionarAoCarrinhoDoBanco(prod)}
                  className="flex items-center justify-between p-3 hover:bg-teal-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{prod.nome}</p>
                    <p className="text-xs text-slate-400">
                      {prod.quantidade || 1} {prod.unidade || 'un'} — {formatarMoeda(prod.precoUnitario || prod.ultimoPreco || 0)}
                    </p>
                  </div>
                  <button className="text-teal-600 dark:text-teal-400 flex items-center gap-1 text-xs font-bold" type="button">
                    <PlusCircle size={16} /> Adicionar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={finalizarCompra}
          disabled={salvandoCompra || itensModo.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center"
          type="button"
        >
          <CheckCircle size={20} />
          {salvandoCompra ? 'Salvando...' : 'Finalizar e Guardar Compra'}
        </button>
      </div>

      {/* Lista de Itens no Carrinho */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Itens no Carrinho ({itensModo.length})
        </h2>
        {itensModo.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <p>Nenhum produto no carrinho no momento.</p>
            <p className="text-xs mt-1">Use a calculadora acima ou o teclado para registrar seus itens.</p>
          </div>
        ) : (
          itensModo.map((item) => <ItemCarrinhoCard key={item.id} item={item} />)
        )}
      </div>

      {/* Modal para Adicionar Nome do Item */}
      <Modal aberto={modalNomeAberto} onFechar={() => setModalNomeAberto(false)} titulo="Adicionar um nome">
        <div className="space-y-4">
          <div>
            <label className="rotulo">Nome do produto</label>
            <input
              type="text"
              value={calcNomeItem}
              onChange={(e) => setCalcNomeItem(e.target.value)}
              placeholder="Ex: Arroz Tio João 5kg"
              className="campo-entrada"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalNomeAberto(false)}
              className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 rounded-xl font-semibold"
            >
              Cancela
            </button>
            <button
              type="button"
              onClick={() => setModalNomeAberto(false)}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-semibold"
            >
              Confirma
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para Desconto do Item */}
      <Modal aberto={modalDescontoAberto} onFechar={() => setModalDescontoAberto(false)} titulo="Desconto do item">
        <div className="space-y-4">
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setTipoDesconto('percent')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${tipoDesconto === 'percent' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}
            >
              %
            </button>
            <button
              onClick={() => setTipoDesconto('real')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${tipoDesconto === 'real' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500'}`}
            >
              R$
            </button>
          </div>

          <div>
            <input
              type="text"
              value={valorDescontoModal}
              onChange={(e) => setValorDescontoModal(e.target.value)}
              className="campo-entrada text-center text-xl font-bold"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalDescontoAberto(false)}
              className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 rounded-xl font-semibold"
            >
              Cancela
            </button>
            <button
              type="button"
              onClick={() => setModalDescontoAberto(false)}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-semibold"
            >
              Confirma
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
