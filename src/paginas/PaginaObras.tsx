/**
 * PaginaObras.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Obras, Reformas e Cálculo de Materiais do LarControl.
 *
 * Funcionalidades:
 *  1. Calculadora estrutural de metragem: área (m²) e volume (m³).
 *  2. Estimador automático de materiais (tijolos, cimento, areia, tinta, argamassa)
 *     baseado nos metros informados e valor total consolidado.
 *  3. Comparador inteligente de fornecedores (matriz de decisão):
 *     cadastro de fornecedor com valor do produto, frete e distância.
 *     Cálculo de custo-benefício: (valorProduto + frete) / distância.
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
  Ruler,
  Box,
  Truck,
  Award,
  Phone,
  MapPin,
  Calculator,
} from 'lucide-react';

/**
 * Tabela de consumo de materiais por m² e m³.
 * Estes são valores aproximados baseados em práticas comuns de construção civil.
 */
const consumoMateriais = {
  // Por m² de parede (área):
  tijolo: { porArea: 25, unidade: 'un', precoUnit: 1.5 }, // 25 tijolos por m²
  cimento: { porArea: 0.5, porVolume: 5, unidade: 'saco', precoUnit: 35 }, // 0.5 saco/m² ou 5 sacos/m³
  areia: { porArea: 0.04, porVolume: 0.5, unidade: 'm³', precoUnit: 120 }, // 0.04 m³/m² ou 0.5 m³/m³
  tinta: { porArea: 0.1, unidade: 'L', precoUnit: 45 }, // 0.1 L por m² (1 demão)
  argamassa: { porArea: 1.5, unidade: 'kg', precoUnit: 3 }, // 1.5 kg por m²
};

/**
 * estimarMateriais
 * Calcula os materiais necessários e seus custos com base na área ou volume.
 *
 * @param tipo - 'area' para m², 'volume' para m³.
 * @param valor - O valor em m² ou m³.
 * @returns Lista de materiais estimados com quantidades e subtotais.
 */
function estimarMateriais(tipo: 'area' | 'volume', valor: number): MaterialEstimado[] {
  const materiais: MaterialEstimado[] = [];

  if (tipo === 'area') {
    // Cálculo para área (m²).
    const qtdTijolo = Math.ceil(valor * consumoMateriais.tijolo.porArea);
    materiais.push({
      nome: 'Tijolo',
      quantidade: qtdTijolo,
      unidade: 'un',
      precoUnitario: consumoMateriais.tijolo.precoUnit,
      subtotal: qtdTijolo * consumoMateriais.tijolo.precoUnit,
    });

    const qtdCimento = Math.ceil(valor * consumoMateriais.cimento.porArea);
    materiais.push({
      nome: 'Cimento',
      quantidade: qtdCimento,
      unidade: 'saco',
      precoUnitario: consumoMateriais.cimento.precoUnit,
      subtotal: qtdCimento * consumoMateriais.cimento.precoUnit,
    });

    const qtdAreia = valor * consumoMateriais.areia.porArea;
    materiais.push({
      nome: 'Areia',
      quantidade: qtdAreia,
      unidade: 'm³',
      precoUnitario: consumoMateriais.areia.precoUnit,
      subtotal: qtdAreia * consumoMateriais.areia.precoUnit,
    });

    const qtdTinta = valor * consumoMateriais.tinta.porArea;
    materiais.push({
      nome: 'Tinta',
      quantidade: qtdTinta,
      unidade: 'L',
      precoUnitario: consumoMateriais.tinta.precoUnit,
      subtotal: qtdTinta * consumoMateriais.tinta.precoUnit,
    });

    const qtdArgamassa = valor * consumoMateriais.argamassa.porArea;
    materiais.push({
      nome: 'Argamassa',
      quantidade: qtdArgamassa,
      unidade: 'kg',
      precoUnitario: consumoMateriais.argamassa.precoUnit,
      subtotal: qtdArgamassa * consumoMateriais.argamassa.precoUnit,
    });
  } else {
    // Cálculo para volume (m³).
    const qtdCimento = Math.ceil(valor * consumoMateriais.cimento.porVolume);
    materiais.push({
      nome: 'Cimento',
      quantidade: qtdCimento,
      unidade: 'saco',
      precoUnitario: consumoMateriais.cimento.precoUnit,
      subtotal: qtdCimento * consumoMateriais.cimento.precoUnit,
    });

    const qtdAreia = valor * consumoMateriais.areia.porVolume;
    materiais.push({
      nome: 'Areia',
      quantidade: qtdAreia,
      unidade: 'm³',
      precoUnitario: consumoMateriais.areia.precoUnit,
      subtotal: qtdAreia * consumoMateriais.areia.precoUnit,
    });

    // Para volume, também estimamos brita (1:1 com areia para concreto).
    const qtdBrita = valor * 0.5;
    materiais.push({
      nome: 'Brita',
      quantidade: qtdBrita,
      unidade: 'm³',
      precoUnitario: 90,
      subtotal: qtdBrita * 90,
    });
  }

  return materiais;
}

export function PaginaObras() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [modalObraAberto, setModalObraAberto] = useState(false);
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);

  // Campos do formulário de obra.
  const [nomeObra, setNomeObra] = useState('');
  const [tipoObra, setTipoObra] = useState<'area' | 'volume'>('area');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [profundidade, setProfundidade] = useState('');

  // Campos do formulário de fornecedor.
  const [nomeFornecedor, setNomeFornecedor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [valorProduto, setValorProduto] = useState('');
  const [valorFrete, setValorFrete] = useState('');
  const [distanciaKm, setDistanciaKm] = useState('');

  /**
   * Efeito: escuta em tempo real as coleções "obras" e "fornecedores".
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

  // --- Cálculo em tempo real do formulário de obra ---
  const larg = parseFloat(largura.replace(',', '.')) || 0;
  const alt = parseFloat(altura.replace(',', '.')) || 0;
  const prof = parseFloat(profundidade.replace(',', '.')) || 0;

  // Calcula área (m²) ou volume (m³) conforme o tipo.
  const areaCalc = larg * alt;
  const volumeCalc = larg * alt * prof;

  // Estima materiais em tempo real para preview.
  const materiaisPreview =
    tipoObra === 'area' && areaCalc > 0
      ? estimarMateriais('area', areaCalc)
      : tipoObra === 'volume' && volumeCalc > 0
      ? estimarMateriais('volume', volumeCalc)
      : [];

  const valorTotalPreview = materiaisPreview.reduce((acc, m) => acc + m.subtotal, 0);

  /**
   * salvarObra
   * Salva a obra calculada no Firestore.
   */
  const salvarObra = async () => {
    if (!nomeObra.trim()) return;

    const area = tipoObra === 'area' ? areaCalc : 0;
    const volume = tipoObra === 'volume' ? volumeCalc : 0;
    const materiais = estimarMateriais(tipoObra, tipoObra === 'area' ? area : volume);
    const valorTotal = materiais.reduce((acc, m) => acc + m.subtotal, 0);

    await addDoc(collection(banco, 'obras'), {
      nome: nomeObra.trim(),
      tipo: tipoObra,
      largura: larg,
      altura: alt,
      profundidade: prof,
      area,
      volume,
      materiais,
      valorTotal,
      data: serverTimestamp(),
    });

    setNomeObra('');
    setLargura('');
    setAltura('');
    setProfundidade('');
    setModalObraAberto(false);
  };

  /**
   * salvarFornecedor
   * Salva um fornecedor no Firestore calculando custo-benefício.
   * Custo-benefício = (valorProduto + valorFrete) / distanciaKm.
   * Quanto menor, melhor.
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
   * gerarPdfObra
   * Gera relatório PDF de uma obra específica com seus materiais.
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
        titulo: `Obra: ${obra.nome}`,
        subtitulo: `${obra.tipo === 'area' ? `${formatarNumero(obra.area, 2)} m²` : `${formatarNumero(obra.volume, 2)} m³`} • ${formatarData(obra.data)}`,
        colunas,
        linhas,
        total: `Valor total: ${formatarMoeda(obra.valorTotal)}`,
      },
      `relatorio-obra-${obra.nome}.pdf`
    );
  };

  // Encontra o fornecedor com melhor custo-benefício (menor valor).
  const melhorFornecedor = fornecedores.length > 0
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
          Obras e Reformas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cálculo de materiais e comparação de fornecedores.
        </p>
      </div>

      {/* === Barra de ações === */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalObraAberto(true)} className="botao-primario">
          <Plus size={18} />
          Nova obra
        </button>
        <button onClick={() => setModalFornecedorAberto(true)} className="botao-secundario">
          <Truck size={18} />
          Cadastrar fornecedor
        </button>
      </div>

      {/* === Lista de obras === */}
      <div>
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Ruler size={20} className="text-primaria-700" />
          Obras cadastradas
        </h2>
        <div className="space-y-3">
          {obras.length === 0 ? (
            <div className="cartao text-center py-12 text-slate-400">
              <Hammer size={40} className="mx-auto mb-3 opacity-40" />
              <p>Nenhuma obra cadastrada ainda.</p>
            </div>
          ) : (
            obras.map((obra) => (
              <div key={obra.id} className="cartao animar-entrada">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{obra.nome}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {obra.tipo === 'area' ? (
                        <span className="flex items-center gap-1">
                          <Ruler size={14} /> {formatarNumero(obra.area, 2)} m²
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Box size={14} /> {formatarNumero(obra.volume, 2)} m³
                        </span>
                      )}
                      {' • '}
                      {formatarData(obra.data)}
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
          Comparador de fornecedores
        </h2>

        {melhorFornecedor && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3 flex items-start gap-3">
            <Award className="text-green-600 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-green-800 text-sm">Melhor custo-benefício</p>
              <p className="text-green-700 text-sm">
                {melhorFornecedor.nome} - {formatarMoeda(melhorFornecedor.custoTotal)} (índice: {formatarNumero(melhorFornecedor.custoBeneficio, 2)})
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
                          <p className="text-slate-400 text-xs">Produto</p>
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
                        <span className="flex items-center gap-1"><Phone size={12} /> {f.telefone}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {f.endereco}</span>
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

      {/* === Modal de nova obra === */}
      <Modal aberto={modalObraAberto} onFechar={() => setModalObraAberto(false)} titulo="Nova obra / reforma">
        <div className="space-y-4">
          <div>
            <label className="rotulo">Nome da obra</label>
            <input
              type="text"
              placeholder="Ex: Piso da sala"
              value={nomeObra}
              onChange={(e) => setNomeObra(e.target.value)}
              className="campo-entrada"
              autoFocus
            />
          </div>
          <div>
            <label className="rotulo">Tipo de cálculo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipoObra('area')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  tipoObra === 'area' ? 'bg-primaria-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Ruler size={16} className="inline mr-1" /> Área (m²)
              </button>
              <button
                onClick={() => setTipoObra('volume')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  tipoObra === 'volume' ? 'bg-primaria-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Box size={16} className="inline mr-1" /> Volume (m³)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Largura (m)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 4.5"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                className="campo-entrada"
              />
            </div>
            <div>
              <label className="rotulo">Altura (m)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 2.8"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="campo-entrada"
              />
            </div>
          </div>
          {tipoObra === 'volume' && (
            <div>
              <label className="rotulo">Profundidade (m)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 0.2"
                value={profundidade}
                onChange={(e) => setProfundidade(e.target.value)}
                className="campo-entrada"
              />
            </div>
          )}
          {/* Preview do cálculo em tempo real */}
          {(areaCalc > 0 || volumeCalc > 0) && (
            <div className="bg-primaria-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {tipoObra === 'area' ? 'Área calculada:' : 'Volume calculado:'}
                </span>
                <span className="font-bold text-primaria-700">
                  {tipoObra === 'area' ? `${formatarNumero(areaCalc, 2)} m²` : `${formatarNumero(volumeCalc, 2)} m³`}
                </span>
              </div>
              {materiaisPreview.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">Materiais estimados:</p>
                  {materiaisPreview.map((m) => (
                    <div key={m.nome} className="flex justify-between text-xs">
                      <span className="text-slate-600">
                        {m.nome}: {formatarNumero(m.quantidade, 0)} {m.unidade}
                      </span>
                      <span className="font-semibold text-slate-700">{formatarMoeda(m.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-primaria-200">
                    <span className="font-semibold text-slate-700">Valor total:</span>
                    <span className="font-bold text-primaria-700">{formatarMoeda(valorTotalPreview)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={salvarObra} className="botao-primario w-full">
            Salvar obra
          </button>
        </div>
      </Modal>

      {/* === Modal de fornecedor === */}
      <Modal aberto={modalFornecedorAberto} onFechar={() => setModalFornecedorAberto(false)} titulo="Cadastrar fornecedor">
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

      {/* === Modal de detalhes da obra === */}
      <Modal aberto={!!obraDetalhe} onFechar={() => setObraDetalhe(null)} titulo={obraDetalhe?.nome || ''}>
        {obraDetalhe && (
          <div className="space-y-4">
            <div className="bg-primaria-50 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Dimensões:</span>
                <span className="font-bold text-primaria-700">
                  {obraDetalhe.largura}m × {obraDetalhe.altura}m
                  {obraDetalhe.tipo === 'volume' && ` × ${obraDetalhe.profundidade}m`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {obraDetalhe.tipo === 'area' ? 'Área:' : 'Volume:'}
                </span>
                <span className="font-bold text-primaria-700">
                  {obraDetalhe.tipo === 'area'
                    ? `${formatarNumero(obraDetalhe.area, 2)} m²`
                    : `${formatarNumero(obraDetalhe.volume, 2)} m³`}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Materiais estimados</h3>
              <div className="space-y-2">
                {obraDetalhe.materiais.map((m) => (
                  <div key={m.nome} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{m.nome}</p>
                      <p className="text-xs text-slate-400">
                        {formatarNumero(m.quantidade, 0)} {m.unidade} × {formatarMoeda(m.precoUnitario)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-700">{formatarMoeda(m.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-slate-800">Valor total</span>
              <span className="text-xl font-bold text-primaria-700">{formatarMoeda(obraDetalhe.valorTotal)}</span>
            </div>
            <button
              onClick={() => gerarPdfObra(obraDetalhe)}
              className="botao-primario w-full"
            >
              <FileText size={18} />
              Exportar PDF desta obra
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
