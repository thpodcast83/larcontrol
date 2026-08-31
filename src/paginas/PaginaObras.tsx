/**
 * PaginaObras.tsx (Completa e Atualizada)
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Orçamentos com Dashboard no Topo e Listagem Completa.
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
  Search,
  X,
  Package,
  DollarSign,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

export function PaginaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  
  // Modais
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);
  
  // Filtros e Formulários
  const [termoBuscaObra, setTermoBuscaObra] = useState('');
  const [nomeObra, setNomeObra] = useState('');
  const [tipoObra, setTipoObra] = useState<'area' | 'volume'>('area');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [profundidade, setProfundidade] = useState('');
  const [materiaisEstimados, setMateriaisEstimados] = useState<MaterialEstimado[]>([]);
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState('');

  // Estados para Cadastro de Fornecedor
  const [nomeForn, setNomeForn] = useState('');
  const [telForn, setTelForn] = useState('');
  const [endForn, setEndForn] = useState('');
  const [valorProdForn, setValorProdForn] = useState('');
  const [valorFreteForn, setValorFreteForn] = useState('');
  const [distanciaKmForn, setDistanciaKmForn] = useState('');

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
        const vProd = dados.valorProduto || 0;
        const vFrete = dados.valorFrete || 0;
        lista.push({
          id: docSnap.id,
          nome: dados.nome || '',
          telefone: dados.telefone || '',
          endereco: dados.endereco || '',
          valorProduto: vProd,
          valorFrete: vFrete,
          distanciaKm: dados.distanciaKm || 0,
          custoTotal: vProd + vFrete,
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

  // Cálculos para o Dashboard no Topo
  const fornecedorMaisBarato =
    fornecedores.length > 0
      ? [...fornecedores].sort((a, b) => a.custoTotal - b.custoTotal)[0]
      : null;

  const fornecedorMaisPerto =
    fornecedores.length > 0
      ? [...fornecedores].sort((a, b) => a.distanciaKm - b.distanciaKm)[0]
      : null;

  const orcamentoMaisBarato =
    obras.length > 0
      ? [...obras].sort((a, b) => a.valorTotal - b.valorTotal)[0]
      : null;

  const obrasFiltradas = obras.filter((o) =>
    o.nome.toLowerCase().includes(termoBuscaObra.toLowerCase())
  );

  const salvarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeForn.trim()) return;

    const vProd = parseFloat(valorProdForn.replace(',', '.')) || 0;
    const vFrete = parseFloat(valorFreteForn.replace(',', '.')) || 0;
    const dist = parseFloat(distanciaKmForn.replace(',', '.')) || 0;

    await addDoc(collection(banco, 'fornecedores'), {
      nome: nomeForn.trim(),
      telefone: telForn.trim(),
      endereco: endForn.trim(),
      valorProduto: vProd,
      valorFrete: vFrete,
      distanciaKm: dist,
      custoTotal: vProd + vFrete,
      criadoEm: serverTimestamp(),
    });

    setModalFornecedorAberto(false);
    setNomeForn('');
    setTelForn('');
    setEndForn('');
    setValorProdForn('');
    setValorFreteForn('');
    setDistanciaKmForn('');
  };

  const deletarObra = async (id: string) => {
    if (confirm('Deseja realmente excluir este orçamento?')) {
      await deleteDoc(doc(banco, 'obras', id));
    }
  };

  const deletarFornecedor = async (id: string) => {
    if (confirm('Deseja realmente excluir este fornecedor?')) {
      await deleteDoc(doc(banco, 'fornecedores', id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Hammer className="text-teal-600" />
          Orçamento de Materiais e Obras
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe os melhores preços e distâncias diretamente no painel de controle.
        </p>
      </div>

      {/* === DASHBOARD NO TOPO DA PÁGINA === */}
      <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Truck size={18} className="text-teal-600" />
          Dashboard de Inteligência e Comparativos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Menor Valor de Orçamento (Materiais) */}
          <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow">
              <DollarSign size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Orçamento Mais Barato
              </span>
              {orcamentoMaisBarato ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {orcamentoMaisBarato.nome}
                  </h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 font-bold mt-1">
                    {formatarMoeda(orcamentoMaisBarato.valorTotal)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Fornecedor: {orcamentoMaisBarato.fornecedorNome || 'Não vinculado'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Nenhum orçamento salvo.</p>
              )}
            </div>
          </div>

          {/* Card 2: Fornecedor com Menor Preço Geral */}
          <div className="bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/50 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow">
              <Award size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Madeireira Mais Barata (Geral)
              </span>
              {fornecedorMaisBarato ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {fornecedorMaisBarato.nome}
                  </h3>
                  <p className="text-sm text-teal-800 dark:text-teal-300 font-bold mt-1">
                    {formatarMoeda(fornecedorMaisBarato.custoTotal)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    (Produto + Frete)
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>

          {/* Card 3: Menor Distância */}
          <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow">
              <Navigation size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Madeireira Mais Perto
              </span>
              {fornecedorMaisPerto ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {fornecedorMaisPerto.nome}
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-bold mt-1">
                    {formatarNumero(fornecedorMaisPerto.distanciaKm, 0)} km de distância
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {fornecedorMaisPerto.endereco || 'Endereço não informado'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button onClick={() => setModalOrcamentoAberto(true)} className="botao-primario">
          <Plus size={18} />
          Novo orçamento de materiais
        </button>
        <button onClick={() => setModalFornecedorAberto(true)} className="botao-secundario">
          <Truck size={18} />
          Cadastrar fornecedor
        </button>
      </div>

      {/* === LISTAGEM DE ORÇAMENTOS E FORNECEDORES === */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Orçamentos Salvos ({obras.length})
          </h2>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar orçamento..."
              value={termoBuscaObra}
              onChange={(e) => setTermoBuscaObra(e.target.value)}
              className="campo-entrada pl-9 text-xs py-2"
            />
          </div>
        </div>

        {obrasFiltradas.length === 0 ? (
          <div className="cartao text-center py-10 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <p>Nenhum orçamento cadastrado ou encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {obrasFiltradas.map((obra) => (
              <div key={obra.id} className="cartao p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{obra.nome}</h3>
                    <p className="text-xs text-slate-400">Criado em {formatarData(obra.data)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setObraDetalhe(obra)}
                      className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Ver Detalhes"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => deletarObra(obra.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Excluir Orçamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 text-xs">Fornecedor: <strong className="text-slate-700 dark:text-slate-300">{obra.fornecedorNome || 'Não vinculado'}</strong></span>
                  <span className="font-extrabold text-teal-600 dark:text-teal-400">{formatarMoeda(obra.valorTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Fornecedores Cadastrados */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Fornecedores Cadastrados ({fornecedores.length})
        </h2>
        {fornecedores.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum fornecedor cadastrado no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fornecedores.map((forn) => (
              <div key={forn.id} className="cartao p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{forn.nome}</h3>
                  <button onClick={() => deletarFornecedor(forn.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={12} /> {forn.endereco || 'Endereço não informado'} ({formatarNumero(forn.distanciaKm, 0)} km)
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone size={12} /> {forn.telefone || 'Sem telefone'}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">Total (Prod + Frete):</span>
                  <span className="font-bold text-teal-600">{formatarMoeda(forn.custoTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Cadastro de Fornecedor */}
      <Modal aberto={modalFornecedorAberto} onFechar={() => setModalFornecedorAberto(false)} titulo="Cadastrar Fornecedor / Madeireira">
        <form onSubmit={salvarFornecedor} className="space-y-4">
          <div>
            <label className="rotulo">Nome do Fornecedor</label>
            <input type="text" value={nomeForn} onChange={(e) => setNomeForn(e.target.value)} className="campo-entrada" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Telefone</label>
              <input type="text" value={telForn} onChange={(e) => setTelForn(e.target.value)} className="campo-entrada" />
            </div>
            <div>
              <label className="rotulo">Distância (km)</label>
              <input type="text" inputMode="decimal" value={distanciaKmForn} onChange={(e) => setDistanciaKmForn(e.target.value)} className="campo-entrada" />
            </div>
          </div>
          <div>
            <label className="rotulo">Endereço</label>
            <input type="text" value={endForn} onChange={(e) => setEndForn(e.target.value)} className="campo-entrada" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Valor dos Produtos (R$)</label>
              <input type="text" inputMode="decimal" value={valorProdForn} onChange={(e) => setValorProdForn(e.target.value)} className="campo-entrada" />
            </div>
            <div>
              <label className="rotulo">Valor do Frete (R$)</label>
              <input type="text" inputMode="decimal" value={valorFreteForn} onChange={(e) => setValorFreteForn(e.target.value)} className="campo-entrada" />
            </div>
          </div>
          <button type="submit" className="botao-primario w-full">Salvar Fornecedor</button>
        </form>
      </Modal>
    </div>
  );
}
