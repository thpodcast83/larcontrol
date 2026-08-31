/**
 * PaginaObras.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Orçamentos de Materiais e Comparador de Fornecedores
 * do LarControl.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
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
import type { Obra, Fornecedor, MaterialEstimado } from '@/tipos';
import { formatarMoeda, formatarData, formatarNumero } from '@/utils/utilFormato';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import {
  Hammer,
  Plus,
  Trash2,
  Edit,
  FileText,
  Truck,
  Award,
  Phone,
  MapPin,
  Calculator,
  Search,
  X,
  Package,
  DollarSign,
  Navigation,
} from 'lucide-react';

const materiaisPreDefinidos = [
  { nome: 'Pedra gres', tipoPadrao: 'metro' as const, precoSugerido: 130.0 },
  { nome: 'Cimento', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Areia', tipoPadrao: 'metro' as const, precoSugerido: 120.0 },
  { nome: 'Brita', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Cal', tipoPadrao: 'unidade' as const, precoSugerido: 22.0 },
  { nome: 'Água', tipoPadrao: 'metro' as const, precoSugerido: 5.0 },
  { nome: 'Vergalhões de aço', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Arame recozido', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Tijolos', tipoPadrao: 'unidade' as const, precoSugerido: 1.5 },
  { nome: 'Tijolos cerâmicos', tipoPadrao: 'unidade' as const, precoSugerido: 1.6 },
  { nome: 'Blocos cerâmicos', tipoPadrao: 'unidade' as const, precoSugerido: 3.2 },
  { nome: 'Argamassa', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Porcelanato', tipoPadrao: 'metro' as const, precoSugerido: 75.0 },
  { nome: 'Cerâmica', tipoPadrao: 'metro' as const, precoSugerido: 40.0 },
  { nome: 'Tinta acrílica', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 }
];

export function PaginaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);
  const [termoBuscaObra, setTermoBuscaObra] = useState('');

  const [orcamentoEmEdicaoId, setOrcamentoEmEdicaoId] = useState<string | null>(null);
  const [fornecedorEmEdicaoId, setFornecedorEmEdicaoId] = useState<string | null>(null);

  const [nomeOrcamento, setNomeOrcamento] = useState('');
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState('');
  const [itensOrcamento, setItensOrcamento] = useState<
    { nome: string; quantidade: string; tipo: 'unidade' | 'metro'; precoUnitario: string }[]
  >([]);

  const [materialSelecionado, setMaterialSelecionado] = useState(materiaisPreDefinidos[0].nome);
  const [qtdItem, setQtdItem] = useState('');
  const [tipoItem, setTipoItem] = useState<'unidade' | 'metro'>('unidade');
  const [precoItem, setPrecoItem] = useState(materiaisPreDefinidos[0].precoSugerido.toString());

  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorProduto, setValorProduto] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [distanciaKm, setDistanciaKm] = useState('');

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

  const handleTrocarMaterialPreDefinido = (nomeMat: string) => {
    setMaterialSelecionado(nomeMat);
    const encontrado = materiaisPreDefinidos.find((m) => m.nome === nomeMat);
    if (encontrado) {
      setTipoItem(encontrado.tipoPadrao);
      setPrecoItem(encontrado.precoSugerido.toString());
    }
  };

  const adicionarItemAoOrcamento = () => {
    const qtd = parseFloat(qtdItem.replace(',', '.')) || 0;
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

  const abrirModalNovoOrcamento = () => {
    setOrcamentoEmEdicaoId(null);
    setNomeOrcamento('');
    setFornecedorSelecionadoId('');
    setItensOrcamento([]);
    setModalOrcamentoAberto(true);
  };

  const abrirModalEditarOrcamento = (obra: Obra) => {
    setOrcamentoEmEdicaoId(obra.id);
    setNomeOrcamento(obra.nome);
    setFornecedorSelecionadoId(obra.fornecedorId || '');
    setItensOrcamento(
      obra.materiais.map((m) => ({
        nome: m.nome,
        quantidade: m.quantidade.toString(),
        tipo: m.unidade === 'un' ? 'unidade' : 'metro',
        precoUnitario: m.precoUnitario.toString(),
      }))
    );
    setModalOrcamentoAberto(true);
  };

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

    if (orcamentoEmEdicaoId) {
      await updateDoc(doc(banco, 'obras', orcamentoEmEdicaoId), {
        nome: nomeOrcamento.trim(),
        materiais: materiaisFormatados,
        valorTotal: valorTotalGeral,
        fornecedorId: fornecedorSelecionadoId || '',
        fornecedorNome: fornecedorObj ? fornecedorObj.nome : 'Não vinculado',
      });
    } else {
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
    }

    setNomeOrcamento('');
    setFornecedorSelecionadoId('');
    setItensOrcamento([]);
    setOrcamentoEmEdicaoId(null);
    setModalOrcamentoAberto(false);
  };

  const abrirModalNovoFornecedor = () => {
    setFornecedorEmEdicaoId(null);
    setNomeFornecedor('');
    setTelefone('');
    setEndereco('');
    setValorProduto('');
    setValorFrete('');
    setDistanciaKm('');
    setModalFornecedorAberto(true);
  };

  const abrirModalEditarFornecedor = (f: Fornecedor) => {
    setFornecedorEmEdicaoId(f.id);
    setNomeFornecedor(f.nome);
    setTelefone(f.telefone);
    setEndereco(f.endereco);
    setValorProduto(f.valorProduto ? f.valorProduto.toString() : '');
    setValorFrete(f.valorFrete ? f.valorFrete.toString() : '');
    setDistanciaKm(f.distanciaKm ? f.distanciaKm.toString() : '');
    setModalFornecedorAberto(true);
  };

  const salvarFornecedor = async () => {
    if (!nomeFornecedor.trim()) return;

    const vProduto = parseFloat(valorProduto.replace(',', '.')) || 0;
    const vFrete = parseFloat(valorFrete.replace(',', '.')) || 0;
    const dist = parseFloat(distanciaKm.replace(',', '.')) || 1;

    const custoTotal = vProduto + vFrete;
    const custoBeneficio = custoTotal / dist;

    if (fornecedorEmEdicaoId) {
      await updateDoc(doc(banco, 'fornecedores', fornecedorEmEdicaoId), {
        nome: nomeFornecedor.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        valorProduto: vProduto,
        valorFrete: vFrete,
        distanciaKm: dist,
        custoTotal,
        custoBeneficio,
      });
    } else {
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
    }

    setNomeFornecedor('');
    setTelefone('');
    setEndereco('');
    setValorProduto('');
    setValorFrete('');
    setDistanciaKm('');
    setFornecedorEmEdicaoId(null);
    setModalFornecedorAberto(false);
  };

  const removerObra = async (id: string) => {
    await deleteDoc(doc(banco, 'obras', id));
  };

  const removerFornecedor = async (id: string) => {
    await deleteDoc(doc(banco, 'fornecedores', id));
  };

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

  const obrasFiltradas = obras.filter((obra) =>
    obra.nome.toLowerCase().includes(termoBuscaObra.toLowerCase())
  );

  // Cálculos para o Dashboard de Comparação Direta
  const fornecedorMaisBarato =
    fornecedores.length > 0
      ? [...fornecedores].sort((a, b) => a.custoTotal - b.custoTotal)[0]
      : null;

  const fornecedorMaisPerto =
    fornecedores.length > 0
      ? [...fornecedores].sort((a, b) => a.distanciaKm - b.distanciaKm)[0]
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Hammer className="text-primaria-700" />
          Orçamento de Materiais e Obras
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Monte listas de compras, vincule fornecedores e analise o comparativo inteligente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={abrirModalNovoOrcamento} className="botao-primario">
          <Plus size={18} />
          Novo orçamento de materiais
        </button>
        <button onClick={abrirModalNovoFornecedor} className="botao-secundario">
          <Truck size={18} />
          Cadastrar fornecedor
        </button>
      </div>

      {/* === Seção de Orçamentos Salvos === */}
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
              <p>Nenhum orçamento encontrado.</p>
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
                      title="Gerar PDF"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => abrirModalEditarOrcamento(obra)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => removerObra(obra.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Excluir"
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

      {/* === DASHBOARD DE COMPARAÇÃO: Melhor Valor e Mais Perto === */}
      <div className="space-y-3 pt-4">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Truck size={20} className="text-primaria-700" />
          Dashboard Comparativo de Madeireiras e Fornecedores
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Melhor Preço / Mais Barata */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow">
              <DollarSign size={22} />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Melhor Preço (Mais Barata)
              </span>
              {fornecedorMaisBarato ? (
                <>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {fornecedorMaisBarato.nome}
                  </h3>
                  <p className="text-sm text-emerald-800 font-medium mt-1">
                    Custo Total: {formatarMoeda(fornecedorMaisBarato.custoTotal)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    (Produto: {formatarMoeda(fornecedorMaisBarato.valorProduto)} + Frete: {formatarMoeda(fornecedorMaisBarato.valorFrete)})
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>

          {/* Card: Menor Distância / Mais Perto */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow">
              <Navigation size={22} />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Menor Distância (Mais Perto)
              </span>
              {fornecedorMaisPerto ? (
                <>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {fornecedorMaisPerto.nome}
                  </h3>
                  <p className="text-sm text-blue-800 font-medium mt-1">
                    Distância: {formatarNumero(fornecedorMaisPerto.distanciaKm, 0)} km
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Endereço: {fornecedorMaisPerto.endereco || 'Não informado'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Lista Detalhada de Fornecedores */}
        <div className="space-y-3 pt-2">
          {fornecedores.length === 0 ? (
            <div className="cartao text-center py-8 text-slate-400">
              <p>Nenhum fornecedor cadastrado para comparação detalhada.</p>
            </div>
          ) : (
            fornecedores
              .slice()
              .sort((a, b) => a.custoBeneficio - b.custoBeneficio)
              .map((f, idx) => (
                <div key={f.id} className="cartao">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{f.nome}</h3>
                        {idx === 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Award size={10} /> Melhor Custo-Benefício
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Produto base</p>
                          <p className="font-semibold text-slate-700">{formatarMoeda(f.valorProduto)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Frete</p>
                          <p className="font-semibold text-slate-700">{formatarMoeda(f.valorFrete)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Distância</p>
                          <p className="font-semibold text-slate-700">{formatarNumero(f.distanciaKm, 0)} km</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Custo total</p>
                          <p className="font-semibold text-slate-700">{formatarMoeda(f.custoTotal)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Phone size={12} /> {f.telefone || 'S/tel'}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {f.endereco || 'S/endereço'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirModalEditarFornecedor(f)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => removerFornecedor(f.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
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

      {/* Modais omitidos aqui por brevidade, mantendo os originais do componente */}
    </div>
  );
}
