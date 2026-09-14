/**
 * PaginaDespensa.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Controle de Despensa e Estoque do LarControl.
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
  Layers,
} from 'lucide-react';

// Mapeamento de categoria para ícone correspondente.
const iconeCategoria: Record<string, React.ReactNode> = {
  Geladeira: <Refrigerator size={18} />,
  Armários: <Archive size={18} />,
  'Produtos de Limpeza': <SprayCan size={18} />,
  'Higiene Pessoal': <Sparkles size={18} />,
  'Lista de Compras': <ListPlus size={18} />,
};

// Cores para cada categoria (badge).
const corCategoria: Record<string, string> = {
  Geladeira: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Armários: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Produtos de Limpeza': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Higiene Pessoal': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'Lista de Compras': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

// Normaliza o nome para agrupar contextos similares (remove marcas, pesos e detalhes do final)
const normalizarContexto = (nome: string) => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[0-9]+([.,][0-9]+)?\s*(kg|g|ml|l|un|pack|c\/[0-9]+)/gi, '') // Remove medidas comuns
    .replace(/[^a-z\s]/g, '') // Mantém apenas letras e espaços
    .trim()
    .split(/\s+/)[0] || nome.trim(); // Pega a primeira palavra principal (ex: "arroz", "acucar", "leite")
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
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
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

      alert(`"${item.nome}" foi enviado para a lista de compras (Carrinho)!`);
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

    const totalTexto = `Valor Total dos Itens Listados: ${formatarMoeda(valorTotal)}`;
    const colWidths = [140, 75, 45, 55, 60, 65];

    gerarPdfGenerico(
      { titulo: tituloRelatorio, colunas, linhas, total: totalTexto, colWidths },
      nomeArquivo
    );
  };

  // Agrupamento inteligente por contexto (mostrando apenas os que se repetem ou totalizando)
  const itensAgrupados = useMemo(() => {
    const mapa: Record<string, { termo: number; registros: string[]; qtdTotal: number; unidade: string }> = {};

    itens.forEach((item) => {
      const chave = normalizarContexto(item.nome);
      if (!mapa[chave]) {
        mapa[chave] = {
          termo: 0,
          registros: [],
          qtdTotal: 0,
          unidade: item.unidade,
        };
      }
      mapa[chave].termo += 1;
      mapa[chave].registros.push(item.nome);
      mapa[chave].qtdTotal += Number(item.quantidade) || 0;
    });

    // Filtra para exibir apenas os que aparecem mais de 1 vez (ou ajuste conforme preferência)
    return Object.entries(mapa)
      .filter(([_, dados]) => dados.termo > 1)
      .map(([chave, dados]) => ({
        contexto: chave.toUpperCase(),
        ocorrencias: dados.termo,
        qtdTotal: Number(dados.qtdTotal.toFixed(2)),
        unidade: dados.unidade,
        exemplos: dados.registros.join(', '),
      }));
  }, [itens]);

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
          Controle de estoque doméstico, categorias e reposição para lista de compras.
        </p>
      </div>

      {/* Resumo Compacto de Itens Repetidos por Contexto */}
      {itensAgrupados.length > 0 && (
        <div className="cartao p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Layers size={16} className="text-primaria-700 dark:text-primaria-500" />
            Itens com Variações e Repetições na Despensa
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="pb-2">Contexto / Produto</th>
                  <th className="pb-2">Vezes Encontrado</th>
                  <th className="pb-2">Quantidade Total Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {itensAgrupados.map((grupo, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                      {grupo.contexto} <span className="text-[10px] text-slate-400 font-normal block">({grupo.exemplos})</span>
                    </td>
                    <td className="py-2.5">
                      <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                        {grupo.ocorrencias}x cadastros
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-primaria-700 dark:text-primaria-400">
                      {grupo.qtdTotal} {grupo.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtros de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categorias.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFiltroCategoria(cat)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              filtroCategoria === cat
                ? 'bg-primaria-700 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Barra de Busca de Produtos */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar produto na lista..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="campo-entrada pl-10"
        />
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            limparFormulario();
            setModalAberto(true);
          }}
          className="botao-primario"
        >
          <Plus size={18} />
          Adicionar item
        </button>
        <BotaoImportar onImportar={importarItens} />
        <button type="button" onClick={gerarPdf} className="botao-secundario">
          <FileText size={18} />
          {filtroCategoria === 'Lista de Compras' ? 'Exportar Lista PDF' : 'Exportar PDF'}
        </button>
      </div>

      {/* Lista de itens */}
      <div className="space-y-3">
        {itensFiltrados.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          itensFiltrados.map((item) => (
            <div key={item.id} className="cartao flex items-center justify-between gap-3 animar-entrada">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${corCategoria[item.categoria] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {iconeCategoria[item.categoria] || <Package size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.nome}</h3>
                    <span className={`badge ${corCategoria[item.categoria] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{item.categoria}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item, -1)}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        {item.quantidade} {item.unidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item, 1)}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">• {item.status === 'Aberto' ? 'Aberto' : 'Fechado'}</span>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {formatarMoeda(item.ultimoPreco)} no {item.ultimoLocal} • {formatarDataCurta(item.ultimaCompra)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => enviarParaCarrinho(item)}
                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                  title="Adicionar à Lista de Compras"
                  aria-label="Adicionar à Lista de Compras"
                >
                  <ShoppingCart size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => alternarStatus(item)}
                  className={`p-2 rounded-lg transition-colors ${
                    item.status === 'Aberto'
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label="Alternar status"
                >
                  {item.status === 'Aberto' ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => editarItem(item)}
                  className="p-2 rounded-lg text-slate-400 hover:text-primaria-700 hover:bg-primaria-50 dark:hover:bg-primaria-950/40 transition-colors"
                  aria-label="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => removerItem(item.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  aria-label="Remover"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de adicionar/editar item */}
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
              placeholder="Ex: Leite integral ou Papel Higiênico"
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
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  status === 'Fechado' ? 'bg-primaria-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Lock size={16} className="inline mr-1" /> Fechado
              </button>
              <button
                type="button"
                onClick={() => setStatus('Aberto')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  status === 'Aberto' ? 'bg-primaria-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Unlock size={16} className="inline mr-1" /> Aberto
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
