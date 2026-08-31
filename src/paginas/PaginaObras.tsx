/**
 * PaginaObras.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Orçamentos de Materiais e Comparador de Fornecedores
 * do LarControl.
 *
 * Funcionalidades:
 *  1. Orçamento para compra de materiais com vinculação direta de fornecedores.
 *  2. Comparação automática de custo-benefício por fornecedor (valor dos itens + frete / distância).
 *  3. Seleção de itens por unidade ou metro.
 *  4. Geração de relatório PDF.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import type { Obra, Fornecedor, MaterialEstimado } from '@/tipos';
import { formatarMoeda, formatarData, formatarNumero } from '@/utils/utilFormato';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import {
  Hammer,
  Plus,
  Trash2,
  FileText,
  Truck,
  Award,
  Phone,
  MapPin,
  Calculator,
  Search,
  X,
  Package,
} from 'lucide-react';

/**
 * Lista pré-definida de materiais comuns para facilitar a seleção no orçamento.
 */
const materiaisPreDefinidos = [
  { nome: 'Tijolo', tipoPadrao: 'unidade' as const, precoSugerido: 1.5 },
  { nome: 'Telha', tipoPadrao: 'unidade' as const, precoSugerido: 3.0 },
  { nome: 'Bloco de Concreto', tipoPadrao: 'unidade' as const, precoSugerido: 4.5 },
  { nome: 'Saco de Cimento (50kg)', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Piso / Cerâmica', tipoPadrao: 'metro' as const, precoSugerido: 45.0 },
  { nome: 'Areia', tipoPadrao: 'metro' as const, precoSugerido: 120.0 },
  { nome: 'Brita', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Tinta (Lata)', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 },
  { nome: 'Argamassa (20kg)', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
];

export function PaginaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);
  const [termoBuscaObra, setTermoBuscaObra] = useState('');

  // Campos do formulário de orçamento de materiais
  const [nomeOrcamento, setNomeOrcamento] = useState('');
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState('');
  const [itensOrcamento, setItensOrcamento] = useState<
    { nome: string; quantidade: string; tipo: 'unidade' | 'metro'; precoUnitario: string }[]
  >([]);

  // Estado temporário para adicionar item na lista do orçamento
  const [materialSelecionado, setMaterialSelecionado] = useState(materiaisPreDefinidos[0].nome);
  const [qtdItem, setQtdItem] = useState('');
  const [tipoItem, setTipoItem] = useState<'unidade' | 'metro'>('unidade');
  const [precoItem, setPrecoItem] = useState(materiaisPreDefinidos[0].precoSugerido.toString());

  // Campos do formulário de fornecedor.
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorProduto, setValorProduto] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [distanciaKm, setDistanciaKm] = useState('');

  /**
   * Efeito: escuta em tempo real as coleções "obras" (orçamentos) e "fornecedores".
   */
  useEffect(() => {
    const cancelarObras = onSnapshot(collection(banco, 'obras'), (snapshot) => {
      const lista: Obra[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          tipo: dados.tipo || 'area',
          largura: dados.largura || 0,
          altura: dados.altura || 0,
          profundidade: dados.profundidade || 0,
          area: dados.area || 0,
          volume: dados.volume || 0,
          materiais: dados.materiais || [],
          valorTotal: dados.valorTotal || 0,
          fornecedorId: dados.fornecedorId || '',
          fornecedorNome: dados.fornecedorNome || '',
          data: dados.data?.toMillis?.() || 0,
        });
      });
      setObras(lista);
    });

    const cancelarFornecedores = onSnapshot(collection(banco, 'fornecedores'), (snapshot) => {
      const lista: Fornecedor[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          telefone: dados.telefone || '',
          endereco: dados.endereco || '',
          valorProduto: dados.valorProduto || 0,
          valorFrete: dados.valorFrete || 0,
          distanciaKm: dados.distanciaKm || 0,
          custoTotal: dados.custoTotal || 0,
          custoBeneficio: dados.custoBeneficio || 0,
        });
      });
      setFornecedores(lista);
    });

    return () => {
      cancelarObras();
      cancelarFornecedores();
    };
  }, []);

  /**
   * Atualiza os campos padrão ao trocar o material pré-selecionado
   */
  const handleTrocarMaterialPreDefinido = (nomeMat: string) => {
    setMaterialSelecionado(nomeMat);
    const encontrado = materiaisPreDefinidos.find((m) => m.nome === nomeMat);
    if (encontrado) {
      setTipoItem(encontrado.tipoPadrao);
      setPrecoItem(encontrado.precoSugerido.toString());
    }
  };

  /**
   * Adiciona um item à lista temporária do orçamento atual
   */
  const adicionarItemAoOrcamento = () => {
    const qtd = parseFloat(qtdItem.replace(',', '.')) || 0;
    const preco = parseFloat(precoItem.replace(',', '.')) || 0;
    if (qtd <= 0) return;

    setItensOrcamento([
      ...itensOrcamento,
      {
        nome: materialSelecionado,
        quantidade: qtdItem,
        tipo: tipoItem,
        precoUnitario: precoItem,
      },
    ]);
    setQtdItem('');
  };

  const removerItemDoOrcamento = (index: number) => {
    const novaLista = [...itensOrcamento];
    novaLista.splice(index, 1);
    setItensOrcamento(novaLista);
  };

  /**
   * Salva o orçamento de materiais no Firestore vinculando o fornecedor selecionado.
   */
  const salvarOrcamento = async () => {
    if (!nomeOrcamento.trim() || itensOrcamento.length === 0) return;

    let valorTotalGeral = 0;
    const materiaisFormatados: MaterialEstimado[] = itensOrcamento.map((item) => {
      const q = parseFloat(item.quantidade.replace(',', '.')) || 0;
      const p = parseFloat(item.precoUnitario.replace(',', '.')) || 0;
      const sub = q * p;
      valorTotalGeral += sub;

      return {
        nome: item.nome,
        quantidade: q,
        unidade: item.tipo === 'unidade' ? 'un' : 'm',
        precoUnitario: p,
        subtotal: sub,
      };
    });

    const fornecedorObj = fornecedores.find((f) => f.id === fornecedorSelecionadoId);

    await addDoc(collection(banco, 'obras'), {
      nome: nomeOrcamento.trim(),
      tipo: 'area',
      largura: 0,
      altura: 0,
      profundidade: 0,
      area: 0,
      volume: 0,
      materiais: materiaisFormatados,
      valorTotal: valorTotalGeral,
      fornecedorId: fornecedorSelecionadoId || '',
      fornecedorNome: fornecedorObj ? fornecedorObj.nome : 'Não vinculado',
      data: serverTimestamp(),
    });

    setNomeOrcamento('');
    setFornecedorSelecionadoId('');
    setItensOrcamento([]);
    setModalOrcamentoAberto(false);
  };

  /**
   * Salva um fornecedor no Firestore calculando custo-benefício.
   * Custo-benefício = (valorProduto + valorFrete) / distanciaKm.
   */
  const salvarFornecedor = async () => {
    if (!nomeFornecedor.trim()) return;

    const vProduto = parseFloat(valorProduto.replace(',', '.')) || 0;
    const vFrete = parseFloat(valorFrete.replace(',', '.')) || 0;
    const dist = parseFloat(distanciaKm.replace(',', '.')) || 1;

    const custoTotal = vProduto + vFrete;
    const custoBeneficio = custoTotal / dist;

    await addDoc(collection(banco, 'fornecedores'), {
      nome: nomeFornecedor.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      valorProduto: vProduto,
      valorFrete: vFrete,
      distanciaKm: dist,
      custoTotal,
      custoBeneficio,
    });

    setNomeFornecedor('');
    setTelefone('');
    setEndereco('');
    setValorProduto('');
    setValorFrete('');
    setDistanciaKm('');
    setModalFornecedorAberto(false);
  };

  const removerObra = async (id: string) => {
    await deleteDoc(doc(banco, 'obras', id));
  };

  const removerFornecedor = async (id: string) => {
    await deleteDoc(doc(banco, 'fornecedores', id));
  };

  /**
   * Gera relatório PDF de um orçamento específico com seus materiais e fornecedor.
   */
  const gerarPdfObra = (obra: Obra) => {
    const colunas = ['Material', 'Qtd', 'Un.', 'Preço Unit.', 'Subtotal'];
    const linhas = obra.materiais.map((m) => [
      m.nome,
      formatarNumero(m.quantidade, 0),
      m.unidade,
      formatarMoeda(m.precoUnitario),
      formatarMoeda(m.subtotal),
    ]);

    gerarPdfGenerico(
      {
        titulo: `Orçamento: ${obra.nome}`,
        subtitulo: `Fornecedor: ${obra.fornecedorNome || 'Não vinculado'} | Data: ${formatarData(obra.data)}`,
        colunas,
        linhas,
        total: `Valor total dos materiais: ${formatarMoeda(obra.valorTotal)}`,
      },
      `orcamento-materiais-${obra.nome}.pdf`
    );
  };

  // Filtragem de orçamentos por termo de busca
  const obrasFiltradas = obras.filter((obra) =>
    obra.nome.toLowerCase().includes(termoBuscaObra.toLowerCase())
  );

  // Encontra o fornecedor com melhor custo-benefício (menor valor).
  const melhorFornecedor =
    fornecedores.length > 0
      ? fornecedores.reduce((melhor, f) =>
          f.custoBeneficio < melhor.custoBeneficio ? f : melhor
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Hammer className="text-primaria-700" />
          Orçamento de Materiais e Obras
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Monte listas de compras por unidade ou metro, vincule fornecedores e compare opções.
        </p>
      </div>

      {/* === Barra de ações === */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalOrcamentoAberto(true)} className="botao-primario">
          <Plus size={18} />
          Novo orçamento de materiais
        </button>
        <button onClick={() => setModalFornecedorAberto(true)} className="botao-secundario">
          <Truck size={18} />
          Cadastrar fornecedor
        </button>
      </div>

      {/* === Lista de orçamentos salvos === */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-primaria-700" />
            Orçamentos salvos
          </h2>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar orçamento..."
              value={termoBuscaObra}
              onChange={(e) => setTermoBuscaObra(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primaria-500 text-sm shadow-sm"
            />
            {termoBuscaObra && (
              <button
                onClick={() => setTermoBuscaObra('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {obrasFiltradas.length === 0 ? (
            <div className="cartao text-center py-12 text-slate-400">
              <Hammer size={40} className="mx-auto mb-3 opacity-40" />
              <p>
                {obras.length === 0
                  ? 'Nenhum orçamento cadastrado ainda.'
                  : 'Nenhum orçamento encontrado para a busca.'}
              </p>
            </div>
          ) : (
            obrasFiltradas.map((obra) => (
              <div key={obra.id} className="cartao animar-entrada">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{obra.nome}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Fornecedor: <span className="font-medium text-slate-700">{obra.fornecedorNome || 'Não vinculado'}</span> • {formatarData(obra.data)}
                    </p>
                    <p className="text-lg font-bold text-primaria-700 mt-1">
                      {formatarMoeda(obra.valorTotal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setObraDetalhe(obra)}
                      className="botao-secundario text-sm py-1.5 px-3"
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() => gerarPdfObra(obra)}
                      className="p-2 rounded-lg text-slate-400 hover:text-primaria-700 hover:bg-primaria-50 transition-colors"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => removerObra(obra.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* === Comparador de fornecedores === */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Truck size={20} className="text-primaria-700" />
          Comparador de fornecedores (Custo-Benefício)
        </h2>

        {melhorFornecedor && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3 flex items-start gap-3">
            <Award className="text-green-600 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-green-800 text-sm">Melhor fornecedor geral</p>
              <p className="text-green-700 text-sm">
                {melhorFornecedor.nome} - Custo total {formatarMoeda(melhorFornecedor.custoTotal)} (com frete e distância de {formatarNumero(melhorFornecedor.distanciaKm, 0)} km)
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {fornecedores.length === 0 ? (
            <div className="cartao text-center py-12 text-slate-400">
              <Truck size={40} className="mx-auto mb-3 opacity-40" />
              <p>Nenhum fornecedor cadastrado.</p>
            </div>
          ) : (
            fornecedores
              .slice()
              .sort((a, b) => a.custoBeneficio - b.custoBeneficio)
              .map((f, idx) => (
                <div
                  key={f.id}
                  className={`cartao animar-entrada ${
                    idx === 0 ? 'border-l-4 border-green-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {idx === 0 && (
                      <div className="p-2 rounded-lg bg-green-100 text-green-700">
                        <Award size={18} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">{f.nome}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Produto base</p>
                          <p className="font-semibold text-slate-700">
                            {formatarMoeda(f.valorProduto)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Frete</p>
                          <p className="font-semibold text-slate-700">
                            {formatarMoeda(f.valorFrete)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Distância</p>
                          <p className="font-semibold text-slate-700">
                            {formatarNumero(f.distanciaKm, 0)} km
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Custo total</p>
                          <p className="font-semibold text-slate-700">
                            {formatarMoeda(f.custoTotal)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {f.telefone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {f.endereco}
                        </span>
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 bg-primaria-50 text-primaria-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <Calculator size={14} />
                        Índice custo-benefício: {formatarNumero(f.custoBeneficio, 2)}
                      </div>
                    </div>
                    <button
                      onClick={() => removerFornecedor(f.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* === Modal de Novo Orçamento de Materiais com Vínculo de Fornecedor === */}
      <Modal
        aberto={modalOrcamentoAberto}
        onFechar={() => setModalOrcamentoAberto(false)}
        titulo="Orçamento para compra de materiais"
      >
        <div className="space-y-4">
          <div>
            <label className="rotulo">Nome do Orçamento / Cômodo</label>
            <input
              type="text"
              placeholder="Ex: Reforma da Cozinha"
              value={nomeOrcamento}
              onChange={(e) => setNomeOrcamento(e.target.value)}
              className="campo-entrada"
              autoFocus
            />
          </div>

          <div>
            <label className="rotulo">Vincular Fornecedor para este Orçamento</label>
            <select
              value={fornecedorSelecionadoId}
              onChange={(e) => setFornecedorSelecionadoId(e.target.value)}
              className="campo-entrada text-sm py-2"
            >
              <option value="">Selecione um fornecedor (opcional)</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} (Frete: {formatarMoeda(f.valorFrete)} - {formatarNumero(f.distanciaKm, 0)} km)
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h3 className="font-semibold text-slate-800 text-sm mb-2">Adicionar materiais à lista</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="rotulo text-xs">Material</label>
                <select
                  value={materialSelecionado}
                  onChange={(e) => handleTrocarMaterialPreDefinido(e.target.value)}
                  className="campo-entrada text-sm py-2"
                >
                  {materiaisPreDefinidos.map((mat) => (
                    <option key={mat.nome} value={mat.nome}>
                      {mat.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rotulo text-xs">Tipo de Medida</label>
                <select
                  value={tipoItem}
                  onChange={(e) => setTipoItem(e.target.value as 'unidade' | 'metro')}
                  className="campo-entrada text-sm py-2"
                >
                  <option value="unidade">Por Unidade (un)</option>
                  <option value="metro">Por Metro (m / m² / m³)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="rotulo text-xs">Quantidade</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 100"
                  value={qtdItem}
                  onChange={(e) => setQtdItem(e.target.value)}
                  className="campo-entrada text-sm py-2"
                />
              </div>
              <div>
                <label className="rotulo text-xs">Preço Unitário (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.50"
                  value={precoItem}
                  onChange={(e) => setPrecoItem(e.target.value)}
                  className="campo-entrada text-sm py-2"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={adicionarItemAoOrcamento}
              className="botao-secundario w-full text-sm py-2"
            >
              <Plus size={16} /> Incluir item na lista
            </button>
          </div>

          {/* Listagem temporária dos itens adicionados */}
          {itensOrcamento.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-600">Itens adicionados:</p>
              {itensOrcamento.map((item, index) => {
                const q = parseFloat(item.quantidade.replace(',', '.')) || 0;
                const p = parseFloat(item.precoUnitario.replace(',', '.')) || 0;
                const sub = q * p;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{item.nome}</span>
                      <span className="text-slate-500 ml-1">
                        ({q} {item.tipo === 'unidade' ? 'un' : 'm'} × {formatarMoeda(p)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primaria-700">{formatarMoeda(sub)}</span>
                      <button
                        onClick={() => removerItemDoOrcamento(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={salvarOrcamento}
            disabled={itensOrcamento.length === 0}
            className="botao-primario w-full disabled:opacity-50"
          >
            Salvar orçamento completo
          </button>
        </div>
      </Modal>

      {/* === Modal de cadastro de fornecedor === */}
      <Modal
        aberto={modalFornecedorAberto}
        onFechar={() => setModalFornecedorAberto(false)}
        titulo="Cadastrar fornecedor"
      >
        <div className="space-y-4">
          <div>
            <label className="rotulo">Nome do fornecedor</label>
            <input
              type="text"
              placeholder="Ex: Casa do Construtor"
              value={nomeFornecedor}
              onChange={(e) => setNomeFornecedor(e.target.value)}
              className="campo-entrada"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Telefone</label>
              <input
                type="text"
                placeholder="(00) 0000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Endereço</label>
              <input
                type="text"
                placeholder="Rua, número"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="campo-entrada"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="rotulo">Valor produto (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 500"
                value={valorProduto}
                onChange={(e) => setValorProduto(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Frete (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 30"
                value={valorFrete}
                onChange={(e) => setValorFrete(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Distância (km)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 5"
                value={distanciaKm}
                onChange={(e) => setDistanciaKm(e.target.value)}
                className="campo-entrada"
              />
            </div>
          </div>
          <button onClick={salvarFornecedor} className="botao-primario w-full">
            Cadastrar fornecedor
          </button>
        </div>
      </Modal>

      {/* === Modal de detalhes do orçamento === */}
      <Modal
        aberto={!!obraDetalhe}
        onFechar={() => setObraDetalhe(null)}
        titulo={obraDetalhe?.nome || ''}
      >
        {obraDetalhe && (
          <div className="space-y-4">
            <div className="bg-primaria-50 rounded-xl p-3 text-sm">
              <span className="text-slate-600">Fornecedor vinculado: </span>
              <span className="font-bold text-primaria-700">{obraDetalhe.fornecedorNome || 'Não vinculado'}</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">Lista de materiais do orçamento</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {obraDetalhe.materiais.map((m, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-slate-100 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{m.nome}</p>
                      <p className="text-xs text-slate-400">
                        {formatarNumero(m.quantidade, 0)} {m.unidade} × {formatarMoeda(m.precoUnitario)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-700">{formatarMoeda(m.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-800">Valor total geral</span>
              <span className="text-xl font-bold text-primaria-700">
                {formatarMoeda(obraDetalhe.valorTotal)}
              </span>
            </div>
            <button onClick={() => gerarPdfObra(obraDetalhe)} className="botao-primario w-full">
              <FileText size={18} />
              Exportar PDF deste orçamento
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
