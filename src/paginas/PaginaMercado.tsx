/**
 * PaginaMercado.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Mercado do LarControl - Compras de Rancho e Gastos Extras.
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
} from 'firebase/firestore';
import { banco } from '@/firebase';
import { useAuth } from '@/contextos/ContextoAuth';
import type { ItemCarrinho, ItemDespensa } from '@/tipos';
import { formatarMoeda, formatarData } from '@/utils/utilFormato';
import { obterGeolocalizacao } from '@/utils/utilGeolocalizacao';
import { enviarNotificacao, solicitarPermissaoNotificacao } from '@/utils/utilNotificacao';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import { BotaoImportar } from '@/componentes/BotaoImportar';
import type { ItemImportado } from '@/utils/utilParser';
import {
  ShoppingCart,
  Plus,
  Trash2,
  MapPin,
  TrendingUp,
  TrendingDown,
  FileText,
  Package,
  AlertCircle,
  Wallet,
  Search,
  CheckCircle,
  Calendar,
  Edit2,
  Save,
  Tag,
} from 'lucide-react';

/**
 * Componente auxiliar para editar diretamente o item encontrado na busca
 * definindo quantidade, unidade (un, kg, g) e preço antes de adicionar ao carrinho.
 */
function ItemBuscaEditavel({ item }: { item: ItemCarrinho }) {
  const [qtdEditada, setQtdEditada] = useState(item.quantidade ? item.quantidade.toString() : '1');
  const [unidadeEditada, setUnidadeEditada] = useState<'un' | 'kg' | 'g'>(item.unidade || 'un');
  const [precoEditado, setPrecoEditado] = useState(item.precoUnitario ? item.precoUnitario.toString() : '');

  // Converte valores para cálculo em tempo real
  const qNum = parseFloat(qtdEditada.replace(',', '.')) || 0;
  const pNum = parseFloat(precoEditado.replace(',', '.')) || 0;
  
  let subtotalCalculado = qNum * pNum;
  if (unidadeEditada === 'g') {
    subtotalCalculado = (qNum / 1000) * pNum;
  }

  const handleSalvarNoCarrinho = async () => {
    if (pNum <= 0) {
      alert('Informe um preço válido.');
      return;
    }

    await updateDoc(doc(banco, 'mercado', item.id), {
      quantidade: qNum,
      unidade: unidadeEditada,
      precoUnitario: pNum,
      subtotal: subtotalCalculado,
    });
  };

  const removerItem = async () => {
    await deleteDoc(doc(banco, 'mercado', item.id));
  };

  return (
    <div className="cartao flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{item.nome}</h3>
          <p className="text-xs text-slate-400">Adicionado por {item.adicionadoPor}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-teal-600 dark:text-teal-400 font-bold">
            Subtotal: {formatarMoeda(subtotalCalculado)}
          </span>
          <button onClick={removerItem} className="text-slate-400 hover:text-red-600" title="Excluir item">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
        <div>
          <label className="text-[10px] text-slate-400 block">Quantidade / Peso</label>
          <input
            type="text"
            inputMode="decimal"
            placeholder={unidadeEditada === 'kg' ? 'Ex: 0.450' : 'Ex: 1'}
            value={qtdEditada}
            onChange={(e) => setQtdEditada(e.target.value)}
            className="campo-entrada text-sm py-1.5 px-2"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">Unidade</label>
          <select
            value={unidadeEditada}
            onChange={(e) => setUnidadeEditada(e.target.value as 'un' | 'kg' | 'g')}
            className="campo-entrada text-sm py-1.5 px-2"
          >
            <option value="un">Unidade (un)</option>
            <option value="kg">Quilo (kg)</option>
            <option value="g">Grama (g)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block">
            {unidadeEditada === 'un' ? 'Preço Unitário (R$)' : 'Preço por kg (R$)'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={precoEditado}
            onChange={(e) => setPrecoEditado(e.target.value)}
            className="campo-entrada text-sm py-1.5 px-2"
          />
        </div>

        <div className="flex items-end h-full pt-4 sm:pt-0">
          <button
            onClick={handleSalvarNoCarrinho}
            className="botao-primario text-xs w-full py-2"
            type="button"
          >
            Adicionar no Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaginaMercado() {
  const { usuario } = useAuth();

  // --- Estados do módulo ---
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [despensa, setDespensa] = useState<ItemDespensa[]>([]);
  const [modo, setModo] = useState<'rancho' | 'extras'>('rancho');
  
  // Teto de Gastos + Edição
  const [teto, setTeto] = useState<number>(0);
  const [editandoTeto, setEditandoTeto] = useState(false);
  const [tetoInput, setTetoInput] = useState('');

  // Dados da Compra e Desconto Global
  const [dataCompra, setDataCompra] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mercado, setMercado] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [alertaDespensa, setAlertaDespensa] = useState<string | null>(null);
  const [salvandoCompra, setSalvandoCompra] = useState(false);

  // Busca e Performance Mobile
  const [buscaInput, setBuscaInput] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [limiteExibicao, setLimiteExibicao] = useState(30);

  // Form de novo item
  const [novoNome, setNovoNome] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [novaUnidade, setNovaUnidade] = useState<'un' | 'kg' | 'g'>('un');
  const [novoPreco, setNovoPreco] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(buscaInput);
      setLimiteExibicao(30);
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaInput]);

  useEffect(() => {
    const q = query(collection(banco, 'mercado'), orderBy('adicionadoEm', 'desc'));
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
      setItens(lista);
    });
    return () => cancelar();
  }, []);

  useEffect(() => {
    const q = query(collection(banco, 'despensa'));
    const cancelar = onSnapshot(q, (snapshot) => {
      const lista: ItemDespensa[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          categoria: dados.categoria || 'Armários',
          quantidade: dados.quantidade || 0,
          unidade: dados.unidade || 'un',
          status: dados.status || 'Fechado',
          ultimoPreco: dados.ultimoPreco || 0,
          ultimoLocal: dados.ultimoLocal || '',
          ultimaCompra: dados.ultimaCompra?.toMillis?.() || 0,
        });
      });
      setDespensa(lista);
    });
    return () => cancelar();
  }, []);

  const mapaDespensa = useMemo(() => {
    const map = new Map<string, ItemDespensa>();
    despensa.forEach((item) => map.set(item.nome.toLowerCase(), item));
    return map;
  }, [despensa]);

  const itensModo = useMemo(() => itens.filter((i) => i.modo === modo), [itens, modo]);

  const { totalBruto, totalQuantidade } = useMemo(() => {
    return itensModo.reduce(
      (acc, i) => {
        acc.totalBruto += i.subtotal;
        acc.totalQuantidade += i.quantidade;
        return acc;
      },
      { totalBruto: 0, totalQuantidade: 0 }
    );
  }, [itensModo]);

  const dGlobalNum = parseFloat(descontoGlobal.replace(',', '.')) || 0;
  const totalGasto = Math.max(0, totalBruto - dGlobalNum);

  const saldo = teto - totalGasto;
  const percentual = teto > 0 ? Math.min((totalGasto / teto) * 100, 100) : 0;

  // Busca atualizada para filtrar por nome, preço unitário ou subtotal
  const itensFiltrados = useMemo(() => {
    const termo = buscaDebounced.toLowerCase().trim();
    if (!termo) return itensModo;
    return itensModo.filter((item) => {
      const nomeMatch = item.nome.toLowerCase().includes(termo);
      const precoMatch = item.precoUnitario?.toString().includes(termo);
      const subtotalMatch = item.subtotal?.toString().includes(termo);
      return nomeMatch || precoMatch || subtotalMatch;
    });
  }, [itensModo, buscaDebounced]);

  const itensExibidos = useMemo(() => {
    return itensFiltrados.slice(0, limiteExibicao);
  }, [itensFiltrados, limiteExibicao]);

  const salvarTeto = () => {
    const valor = parseFloat(tetoInput.replace(',', '.'));
    if (!isNaN(valor) && valor >= 0) {
      setTeto(valor);
      setEditandoTeto(false);
    }
  };

  const obterLocal = async () => {
    try {
      const geo = await obterGeolocalizacao();
      setLocalizacao(geo.texto);
    } catch {
      // Silencioso
    }
  };

  const calcularSubtotal = (qtd: number, unidade: string, preco: number): number => {
    if (unidade === 'g') return (qtd / 1000) * preco;
    return qtd * preco;
  };

  const adicionarItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoNome.trim() || !novoPreco) return;

    setModalAberto(false);
    const nomeItem = novoNome.trim();
    const qtd = parseFloat(novaQtd.replace(',', '.')) || 0;
    const preco = parseFloat(novoPreco.replace(',', '.')) || 0;
    const subtotal = calcularSubtotal(qtd, novaUnidade, preco);

    setNovoNome('');
    setNovaQtd('1');
    setNovoPreco('');

    await addDoc(collection(banco, 'mercado'), {
      nome: nomeItem,
      quantidade: qtd,
      unidade: novaUnidade,
      precoUnitario: preco,
      subtotal,
      modo,
      mercado: mercado || 'Não informado',
      adicionadoPor: usuario?.nome || 'Usuário',
      adicionadoEm: serverTimestamp(),
      localizacao,
    });
  };

  const removerItem = async (id: string) => {
    await deleteDoc(doc(banco, 'mercado', id));
  };

  // --- AÇÃO: FINALIZAR COMPRA E SALVAR NO HISTÓRICO ---
  const finalizarCompra = async () => {
    if (itensModo.length === 0) return;
    setSalvandoCompra(true);

    try {
      // 1. Grava no histórico de compras finalizadas
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

      // 2. Limpa os itens do carrinho atual
      const lote = writeBatch(banco);
      itensModo.forEach((item) => {
        lote.delete(doc(banco, 'mercado', item.id));
      });
      await lote.commit();

      alert('Compra finalizada e salva no Histórico com sucesso!');
      setMercado('');
      setLocalizacao('');
      setDescontoGlobal('');
    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
      alert('Erro ao finalizar compra. Tente novamente.');
    } finally {
      setSalvandoCompra(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="text-primaria-700" />
          Mercado
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Registre suas compras em tempo real e finalize para guardar o histórico.
        </p>
      </div>

      {/* Card de Total Acumulado com Desconto Global aplicado */}
      <div className="cartao-destaque bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between p-5 rounded-2xl shadow-lg">
        <div>
          <span className="text-teal-200 text-xs font-semibold uppercase tracking-wider">
            Total Líquido {modo === 'rancho' ? 'do Rancho' : 'dos Gastos Extras'}
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-0.5">
            {formatarMoeda(totalGasto)}
          </h2>
          {dGlobalNum > 0 && (
            <p className="text-xs text-teal-200 mt-1">
              Bruto: {formatarMoeda(totalBruto)} | Desconto Global: -{formatarMoeda(dGlobalNum)}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="badge bg-teal-700/60 text-teal-100 text-xs px-3 py-1 rounded-full font-medium">
            {itensModo.length} itens ({totalQuantidade} un/kg)
          </span>
        </div>
      </div>

      {/* Troca de Modo */}
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

      {/* Card de Teto de Gastos Com Alteração/Edição */}
      <div className="cartao-destaque">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Wallet size={18} className="text-teal-600 dark:text-teal-400" />
            Teto de Gastos
          </h2>
          {teto > 0 && !editandoTeto && (
            <button
              onClick={() => {
                setTetoInput(teto.toString());
                setEditandoTeto(true);
              }}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <Edit2 size={14} /> Alterar teto
            </button>
          )}
        </div>

        {teto === 0 || editandoTeto ? (
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Digite o novo valor (ex: 1500)"
              value={tetoInput}
              onChange={(e) => setTetoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvarTeto()}
              className="campo-entrada flex-1"
            />
            <button onClick={salvarTeto} className="botao-primario">
              <Save size={16} /> Salvar
            </button>
          </div>
        ) : (
          <div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentual >= 100 ? 'bg-red-500' : percentual >= 80 ? 'bg-amber-500' : 'bg-teal-600'
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{formatarMoeda(totalGasto)} gastos</span>
              <span className="text-slate-600 dark:text-slate-400">
                Saldo: <strong className={saldo < 0 ? 'text-red-600' : 'text-green-600'}>{formatarMoeda(saldo)}</strong> / {formatarMoeda(teto)} teto
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Informações da Compra: Data, Mercado, Geolocalização e Desconto Global */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="rotulo flex items-center gap-1">
            <Calendar size={14} /> Data da Compra
          </label>
          <input
            type="date"
            value={dataCompra}
            onChange={(e) => setDataCompra(e.target.value)}
            className="campo-entrada"
          />
        </div>
        <div>
          <label className="rotulo">Nome do Mercado</label>
          <input
            type="text"
            placeholder="Ex: Max Center"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            className="campo-entrada"
          />
        </div>
        <div>
          <label className="rotulo flex items-center gap-1">
            <Tag size={14} /> Desconto Global (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 14,42"
            value={descontoGlobal}
            onChange={(e) => setDescontoGlobal(e.target.value)}
            className="campo-entrada"
          />
        </div>
        <div>
          <label className="rotulo">Geolocalização</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Localização"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              className="campo-entrada flex-1"
            />
            <button onClick={obterLocal} className="botao-secundario px-3" type="button">
              <MapPin size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setModalAberto(true)} className="botao-primario">
            <Plus size={18} /> Adicionar item
          </button>
        </div>

        {/* Botão Principal: Finalizar Compra */}
        <button
          onClick={finalizarCompra}
          disabled={salvandoCompra || itensModo.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {salvandoCompra ? 'Salvando...' : 'Finalizar e Guardar Compra'}
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar no carrinho por nome ou preço..."
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          className="campo-entrada pl-10"
        />
      </div>

      {/* Lista do Carrinho Atual com edição de quantidade, peso e preço */}
      <div className="space-y-3">
        {itensExibidos.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <p>Nenhum produto encontrado no carrinho.</p>
          </div>
        ) : (
          itensExibidos.map((item) => (
            <ItemBuscaEditavel key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Modal Adicionar */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Adicionar item">
        <form onSubmit={adicionarItem} className="space-y-4">
          <div>
            <label className="rotulo">Nome do produto</label>
            <input
              type="text"
              list="sugestoes-despensa"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="campo-entrada"
              required
            />
            <datalist id="sugestoes-despensa">
              {despensa.map((d) => (
                <option key={d.id} value={d.nome} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Quantidade</label>
              <input
                type="text"
                value={novaQtd}
                onChange={(e) => setNovaQtd(e.target.value)}
                className="campo-entrada"
                required
              />
            </div>
            <div>
              <label className="rotulo">Unidade</label>
              <select
                value={novaUnidade}
                onChange={(e) => setNovaUnidade(e.target.value as 'un' | 'kg' | 'g')}
                className="campo-entrada"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="g">Grama (g)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="rotulo">Preço Unitário / R$</label>
            <input
              type="text"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              className="campo-entrada"
              required
            />
          </div>
          <button type="submit" className="botao-primario w-full">
            Adicionar
          </button>
        </form>
      </Modal>
    </div>
  );
}
