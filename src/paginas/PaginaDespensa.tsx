/**
 * PaginaDespensa.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Controle de Despensa e Estoque do LarControl (Versão Tabela Limpa).
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import type { ItemDespensa } from '@/tipos';
import { formatarMoeda, formatarDataCurta } from '@/utils/utilFormato';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import { BotaoImportar } from '@/componentes/BotaoImportar';
import type { ItemImportado } from '@/utils/utilParser';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  FileText,
  Refrigerator,
  Archive,
  SprayCan,
  Sparkles,
  Lock,
  Unlock,
  Pencil,
  ShoppingCart,
  ListPlus,
  Search,
} from 'lucide-react';

// Cores para as tags de categoria.
const corCategoria: Record<string, string> = {
  Geladeira: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Armários: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Produtos de Limpeza': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Higiene Pessoal': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'Lista de Compras': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

export function PaginaDespensa() {
  const [itens, setItens] = useState<ItemDespensa[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Campos do formulário.
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<ItemDespensa['categoria'] | 'Lista de Compras'>('Armários');
  const [quantidade, setQuantidade] = useState('1');
  const [unidade, setUnidade] = useState<'un' | 'kg' | 'g'>('un');
  const [status, setStatus] = useState<'Fechado' | 'Aberto'>('Fechado');
  const [ultimoPreco, setUltimoPreco] = useState('');
  const [ultimoLocal, setUltimoLocal] = useState('');

  useEffect(() => {
    const cancelar = onSnapshot(collection(banco, 'despensa'), (snapshot) => {
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
      setItens(lista);
    });
    return () => cancelar();
  }, []);

  const salvarItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nome.trim()) return;

    try {
      const dados = {
        nome: nome.trim(),
        categoria,
        quantidade: parseFloat(quantidade.replace(',', '.')) || 0,
        unidade,
        status,
        ultimoPreco: parseFloat(ultimoPreco.replace(',', '.')) || 0,
        ultimoLocal: ultimoLocal.trim() || 'Não informado',
        ultimaCompra: serverTimestamp(),
      };

      if (editandoId) {
        await updateDoc(doc(banco, 'despensa', editandoId), dados);
      } else {
        await addDoc(collection(banco, 'despensa'), dados);
      }

      limparFormulario();
      setModalAberto(false);
    } catch (erro) {
      console.error('Erro ao salvar item na despensa:', erro);
    }
  };

  const alternarStatus = async (item: ItemDespensa) => {
    try {
      await updateDoc(doc(banco, 'despensa', item.id), {
        status: item.status === 'Fechado' ? 'Aberto' : 'Fechado',
      });
    } catch (erro) {
      console.error('Erro ao alternar status:', erro);
    }
  };

  const alterarQuantidade = async (item: ItemDespensa, delta: number) => {
    const passo = item.unidade === 'g' ? 100 : 1;
    const novaQtd = Math.max(0, Number((item.quantidade + delta * passo).toFixed(2)));
    try {
      await updateDoc(doc(banco, 'despensa', item.id), {
        quantidade: novaQtd,
      });
    } catch (erro) {
      console.error('Erro ao atualizar quantidade:', erro);
    }
  };

  const removerItem = async (id: string) => {
    try {
      await deleteDoc(doc(banco, 'despensa', id));
    } catch (erro) {
      console.error('Erro ao remover item:', erro);
    }
  };

  const editarItem = (item: ItemDespensa) => {
    setEditandoId(item.id);
    setNome(item.nome);
    setCategoria(item.categoria);
    setQuantidade(String(item.quantidade));
    setUnidade(item.unidade);
    setStatus(item.status);
    setUltimoPreco(String(item.ultimoPreco));
    setUltimoLocal(item.ultimoLocal);
    setModalAberto(true);
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setNome('');
    setCategoria('Armários');
    setQuantidade('1');
    setUnidade('un');
    setStatus('Fechado');
    setUltimoPreco('');
    setUltimoLocal('');
  };

  const enviarParaCarrinho = async (item: ItemDespensa) => {
    try {
      const preco = item.ultimoPreco || 0;
      const qtd = item.quantidade || 1;
      let subtotal = qtd * preco;
      if (item.unidade === 'g') {
        subtotal = (qtd / 1000) * preco;
      }

      await addDoc(collection(banco, 'carrinho_atual'), {
        nome: item.nome,
        quantidade: qtd,
        unidade: item.unidade || 'un',
        precoUnitario: preco,
        subtotal,
        modo: 'rancho',
        mercado: item.ultimoLocal || 'Não informado',
        adicionadoPor: 'Reposição Despensa',
        adicionadoEm: serverTimestamp(),
      });

      alert(`"${item.nome}" foi enviado para a lista de compras!`);
    } catch (erro) {
      console.error('Erro ao enviar item para o carrinho:', erro);
    }
  };

  const importarItens = async (itensImportados: ItemImportado[]) => {
    try {
      for (const item of itensImportados) {
        await addDoc(collection(banco, 'despensa'), {
          nome: item.nome,
          categoria: 'Armários',
          quantidade: item.quantidade,
          unidade: item.unidade,
          status: 'Fechado',
          ultimoPreco: item.preco,
          ultimoLocal: 'Importado',
          ultimaCompra: serverTimestamp(),
        });
      }
    } catch (erro) {
      console.error('Erro ao importar itens:', erro);
    }
  };

  const gerarPdf = () => {
    const tituloRelatorio = filtroCategoria === 'Lista de Compras' ? 'Relatório - Lista de Compras' : 'Relatório de Despensa';
    const nomeArquivo = filtroCategoria === 'Lista de Compras' ? 'relatorio-lista-compras.pdf' : 'relatorio-despensa-larcontrol.pdf';

    const colunas = ['Item', 'Categoria', 'Qtd', 'Status', 'Preço', 'Local'];
    const linhas = itensFiltrados.map((i) => [
      i.nome,
      i.categoria,
      `${i.quantidade} ${i.unidade}`,
      i.status,
      formatarMoeda(i.ultimoPreco),
      i.ultimoLocal,
    ]);

    const valorTotal = itensFiltrados.reduce((acc, i) => {
      const preco = i.ultimoPreco || 0;
      const qtd = i.quantidade || 1;
      return acc + (preco * qtd);
    }, 0);

    const totalTexto = `Valor Total: ${formatarMoeda(valorTotal)}`;
    const colWidths = [140, 75, 45, 55, 60, 65];

    gerarPdfGenerico(
      { titulo: tituloRelatorio, colunas, linhas, total: totalTexto, colWidths },
      nomeArquivo
    );
  };

  const itensFiltrados = useMemo(() => {
    return itens.filter((i) => {
      const passaCategoria = filtroCategoria === 'Todas' || i.categoria === filtroCategoria;
      const passaBusca = i.nome.toLowerCase().includes(termoBusca.trim().toLowerCase());
      return passaCategoria && passaBusca;
    });
  }, [itens, filtroCategoria, termoBusca]);

  const categorias = ['Todas', 'Geladeira', 'Armários', 'Produtos de Limpeza', 'Higiene Pessoal', 'Lista de Compras'];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Package className="text-primaria-700 dark:text-primaria-500" />
          Despensa e Higiene
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Controle de estoque doméstico em formato de tabela limpa.
        </p>
      </div>

      {/* Controles: Filtros, Busca e Ações */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filtros de categoria */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                filtroCategoria === cat
                  ? 'bg-primaria-700 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              limparFormulario();
              setModalAberto(true);
            }}
            className="botao-primario text-xs py-2"
          >
            <Plus size={16} />
            Novo Item
          </button>
          <BotaoImportar onImportar={importarItens} />
          <button type="button" onClick={gerarPdf} className="botao-secundario text-xs py-2">
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar produto na despensa..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="campo-entrada pl-10 text-sm py-2"
        />
      </div>

      {/* Tabela Limpa de Produtos */}
      <div className="cartao overflow-hidden p-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-semibold text-slate-700 dark:text-slate-200">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último Preço / Local</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Package size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum produto encontrado.</p>
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {item.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${corCategoria[item.categoria] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item, -1)}
                          className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Diminuir"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 min-w-[45px] text-center">
                          {item.quantidade} {item.unidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item, 1)}
                          className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Aumentar"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => alternarStatus(item)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          item.status === 'Aberto'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.status === 'Aberto' ? <Unlock size={12} /> : <Lock size={12} />}
                        {item.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatarMoeda(item.ultimoPreco)}</span>
                      <span className="block text-[10px] text-slate-400">{item.ultimoLocal} • {formatarDataCurta(item.ultimaCompra)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => enviarParaCarrinho(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                          title="Enviar para Lista de Compras"
                        >
                          <ShoppingCart size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => editarItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primaria-700 hover:bg-primaria-50 dark:hover:bg-primaria-950/40 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adicionar / Editar */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editandoId ? 'Editar item da despensa' : 'Adicionar item à despensa'}
      >
        <form onSubmit={salvarItem} className="space-y-4">
          <div>
            <label className="rotulo">Nome do item</label>
            <input
              type="text"
              placeholder="Ex: Arroz Integral 1kg"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="campo-entrada"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="rotulo">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as any)}
              className="campo-entrada"
            >
              <option value="Geladeira">Geladeira</option>
              <option value="Armários">Armários</option>
              <option value="Produtos de Limpeza">Produtos de Limpeza</option>
              <option value="Higiene Pessoal">Higiene Pessoal</option>
              <option value="Lista de Compras">Lista de Compras</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Quantidade</label>
              <input
                type="text"
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="campo-entrada"
                required
              />
            </div>
            <div>
              <label className="rotulo">Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as 'un' | 'kg' | 'g')}
                className="campo-entrada"
              >
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="g">Grama (g)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="rotulo">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('Fechado')}
                className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all ${
                  status === 'Fechado' ? 'bg-primaria-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Lock size={14} className="inline mr-1" /> Fechado
              </button>
              <button
                type="button"
                onClick={() => setStatus('Aberto')}
                className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all ${
                  status === 'Aberto' ? 'bg-primaria-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Unlock size={14} className="inline mr-1" /> Aberto
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Último preço pago (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 6.99"
                value={ultimoPreco}
                onChange={(e) => setUltimoPreco(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Local da compra</label>
              <select
                value={ultimoLocal}
                onChange={(e) => setUltimoLocal(e.target.value)}
                className="campo-entrada"
              >
                <option value="Não informado">Selecione o mercado</option>
                <option value="Stok Center">Stok Center</option>
                <option value="Guarapari">Guarapari</option>
                <option value="MaxCenter">MaxCenter</option>
                <option value="Atacadão">Atacadão</option>
                <option value="Carrefour">Carrefour</option>
                <option value="Cestto">Cestto</option>
                <option value="Zaffari">Zaffari</option>
                <option value="Gauchão">Gauchão</option>
                <option value="Fort Atacadista">Fort Atacadista</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <button type="submit" className="botao-primario w-full">
            {editandoId ? 'Salvar alterações' : 'Adicionar à despensa'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
