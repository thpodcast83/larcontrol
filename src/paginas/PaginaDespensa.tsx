/**
 * PaginaDespensa.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Controle de Despensa e Estoque do LarControl.
 *
 * Funcionalidades:
 *  1. Registro de itens em categorias: Geladeira, Armários, Produtos de Limpeza, Higiene Pessoal, Lista de Compras.
 *  2. Envio otimizado de itens da despensa/mercado diretamente para a lista de compras (carrinho) sem estourar o limite Spark.
 *  3. Controle de quantidade restante e status (Fechado / Aberto).
 *  4. Histórico do valor pago e local da última compra.
 *  5. Geração de relatório PDF.
 *  6. Importação em massa de listas.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
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
  Geladeira: 'bg-blue-100 text-blue-700',
  Armários: 'bg-amber-100 text-amber-700',
  'Produtos de Limpeza': 'bg-purple-100 text-purple-700',
  'Higiene Pessoal': 'bg-rose-100 text-rose-700',
  'Lista de Compras': 'bg-teal-100 text-teal-700',
};

export function PaginaDespensa() {
  const [itens, setItens] = useState<ItemDespensa[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas');
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

  /**
   * Efeito: escuta em tempo real a coleção "despensa" no Firestore.
   * Atualiza a lista local sempre que há mudanças (multi-usuário).
   */
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

  /**
   * salvarItem
   * Adiciona um novo item ou atualiza um existente na despensa.
   * Suporta submissão via submit do formulário (compatível com mobile).
   */
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
        // Atualiza item existente.
        await updateDoc(doc(banco, 'despensa', editandoId), dados);
      } else {
        // Adiciona novo item.
        await addDoc(collection(banco, 'despensa'), dados);
      }

      limparFormulario();

      // Desfoca o teclado virtual no mobile
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setModalAberto(false);
    } catch (erro) {
      console.error('Erro ao salvar item na despensa:', erro);
    }
  };

  /**
   * alternarStatus
   * Alterna o status do item entre Aberto e Fechado.
   */
  const alternarStatus = async (item: ItemDespensa) => {
    try {
      await updateDoc(doc(banco, 'despensa', item.id), {
        status: item.status === 'Fechado' ? 'Aberto' : 'Fechado',
      });
    } catch (erro) {
      console.error('Erro ao alternar status:', erro);
    }
  };

  /**
   * removerItem
   * Remove um item da despensa.
   */
  const removerItem = async (id: string) => {
    try {
      await deleteDoc(doc(banco, 'despensa', id));
    } catch (erro) {
      console.error('Erro ao remover item:', erro);
    }
  };

  /**
   * editarItem
   * Carrega os dados do item no formulário para edição.
   */
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

  /**
   * limparFormulario
   * Reseta todos os campos do formulário.
   */
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

  /**
   * enviarParaCarrinho
   * Envia o item diretamente para a lista de compras (carrinho_atual) usando
   * uma escrita sob demanda, mantendo a compatibilidade e evitando leitura
   * desnecessária que pudesse estourar o plano Spark.
   */
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

  /**
   * importarItens
   * Importa itens em massa para a despensa.
   */
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

  /**
   * gerarPdf
   * Gera relatório PDF da despensa.
   */
  const gerarPdf = () => {
    const colunas = ['Item', 'Categoria', 'Qtd', 'Status', 'Último Preço', 'Local'];
    const linhas = itensFiltrados.map((i) => [
      i.nome,
      i.categoria,
      `${i.quantidade} ${i.unidade}`,
      i.status,
      formatarMoeda(i.ultimoPreco),
      i.ultimoLocal,
    ]);

    gerarPdfGenerico(
      { titulo: 'Relatório de Despensa', colunas, linhas },
      'relatorio-despensa-larcontrol.pdf'
    );
  };

  // Filtra itens pela categoria selecionada.
  const itensFiltrados =
    filtroCategoria === 'Todas'
      ? itens
      : itens.filter((i) => i.categoria === filtroCategoria);

  const categorias = ['Todas', 'Geladeira', 'Armários', 'Produtos de Limpeza', 'Higiene Pessoal', 'Lista de Compras'];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="text-primaria-700" />
          Despensa e Higiene
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Controle de estoque doméstico, categorias e reposição para lista de compras[cite: 6].
        </p>
      </div>

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
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
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
          Exportar PDF
        </button>
      </div>

      {/* Lista de itens */}
      <div className="space-y-3">
        {itensFiltrados.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p>Despensa vazia nesta categoria.</p>
          </div>
        ) : (
          itensFiltrados.map((item) => (
            <div key={item.id} className="cartao flex items-center gap-3 animar-entrada">
              <div className={`p-2 rounded-lg ${corCategoria[item.categoria] || 'bg-slate-100 text-slate-700'}`}>
                {iconeCategoria[item.categoria] || <Package size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 truncate">{item.nome}</h3>
                  <span className={`badge ${corCategoria[item.categoria] || 'bg-slate-100 text-slate-700'}`}>{item.categoria}</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {item.quantidade} {item.unidade} • {item.status === 'Aberto' ? 'Aberto' : 'Fechado'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatarMoeda(item.ultimoPreco)} no {item.ultimoLocal} • {formatarDataCurta(item.ultimaCompra)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {/* Botão para enviar para a Lista de Compras (Carrinho) */}
                <button
                  type="button"
                  onClick={() => enviarParaCarrinho(item)}
                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  title="Adicionar à Lista de Compras"
                  aria-label="Adicionar à Lista de Compras"
                >
                  <ShoppingCart size={18} />
                </button>
                {/* Botão de alternar status */}
                <button
                  type="button"
                  onClick={() => alternarStatus(item)}
                  className={`p-2 rounded-lg transition-colors ${
                    item.status === 'Aberto'
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                  aria-label="Alternar status"
                >
                  {item.status === 'Aberto' ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
                {/* Botão de editar */}
                <button
                  type="button"
                  onClick={() => editarItem(item)}
                  className="p-2 rounded-lg text-slate-400 hover:text-primaria-700 hover:bg-primaria-50 transition-colors"
                  aria-label="Editar"
                >
                  <Pencil size={18} />
                </button>
                {/* Botão de remover */}
                <button
                  type="button"
                  onClick={() => removerItem(item.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
                  status === 'Fechado' ? 'bg-primaria-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Lock size={16} className="inline mr-1" /> Fechado
              </button>
              <button
                type="button"
                onClick={() => setStatus('Aberto')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  status === 'Aberto' ? 'bg-primaria-700 text-white' : 'bg-slate-100 text-slate-500'
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
              <input
                type="text"
                placeholder="Ex: Mercado X"
                value={ultimoLocal}
                onChange={(e) => setUltimoLocal(e.target.value)}
                className="campo-entrada"
              />
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
