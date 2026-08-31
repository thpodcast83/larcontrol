/**
 * PaginaObras.tsx (Atualizado)
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Orçamentos com Dashboard no Topo e Comparativo de Preços.
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
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);
  const [termoBuscaObra, setTermoBuscaObra] = useState('');

  // Demais estados omitidos para foco na alteração estrutural...

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Hammer className="text-primaria-700" />
          Orçamento de Materiais e Obras
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe os melhores preços e distâncias diretamente no painel de controle.
        </p>
      </div>

      {/* === DASHBOARD NO TOPO DA PÁGINA === */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          <Truck size={18} className="text-primaria-700" />
          Dashboard de Inteligência e Comparativos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Menor Valor de Orçamento (Materiais) */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow">
              <DollarSign size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Orçamento Mais Barato
              </span>
              {orcamentoMaisBarato ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                    {orcamentoMaisBarato.nome}
                  </h3>
                  <p className="text-sm text-emerald-800 font-bold mt-1">
                    {formatarMoeda(orcamentoMaisBarato.valorTotal)}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    Fornecedor: {orcamentoMaisBarato.fornecedorNome || 'Não vinculado'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Nenhum orçamento salvo.</p>
              )}
            </div>
          </div>

          {/* Card 2: Fornecedor com Menor Preço Geral */}
          <div className="bg-white border border-teal-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow">
              <Award size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Madeireira Mais Barata (Geral)
              </span>
              {fornecedorMaisBarato ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                    {fornecedorMaisBarato.nome}
                  </h3>
                  <p className="text-sm text-teal-800 font-bold mt-1">
                    {formatarMoeda(fornecedorMaisBarato.custoTotal)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    (Produto + Frete)
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Nenhum fornecedor cadastrado.</p>
              )}
            </div>
          </div>

          {/* Card 3: Menor Distância */}
          <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow">
              <Navigation size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Madeireira Mais Perto
              </span>
              {fornecedorMaisPerto ? (
                <>
                  <h3 className="text-base font-bold text-slate-900 truncate mt-0.5">
                    {fornecedorMaisPerto.nome}
                  </h3>
                  <p className="text-sm text-blue-800 font-bold mt-1">
                    {formatarNumero(fornecedorMaisPerto.distanciaKm, 0)} km de distância
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
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

      {/* Restante da listagem de orçamentos e fornecedores abaixo... */}
    </div>
  );
}
