/**
 * PaginaCombustivel.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Controle de Combustível do LarControl.
 *
 * Funcionalidades:
 *  1. Formulário de abastecimento: KM atual, preço por litro (R$/L), valor total.
 *  2. Cálculo automático dos litros abastecidos (valorTotal / precoPorLitro).
 *  3. Cálculo automático de consumo médio (KM/L) vs último abastecimento.
 *  4. Registro de data, hora e geolocalização do posto.
 *  5. Upload de comprovante com conversão para Base64 (300x300px).
 *  6. Geração de relatório PDF.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { banco } from '@/firebase';
import type { Abastecimento } from '@/tipos';
import { formatarMoeda, formatarData, formatarNumero } from '@/utils/utilFormato';
import { obterGeolocalizacao } from '@/utils/utilGeolocalizacao';
import { redimensionarImagemBase64 } from '@/utils/utilImagem';
import { gerarPdfGenerico } from '@/utils/utilPdf';
import { Modal } from '@/componentes/Modal';
import {
  Fuel,
  Plus,
  Trash2,
  MapPin,
  FileText,
  Image as ImageIcon,
  Gauge,
  Calendar,
} from 'lucide-react';

export function PaginaCombustivel() {
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  // Campos do formulário.
  const [kmAtual, setKmAtual] = useState('');
  const [precoPorLitro, setPrecoPorLitro] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [comprovante, setComprovante] = useState('');
  const [processandoImg, setProcessandoImg] = useState(false);

  /**
   * Efeito: escuta em tempo real a coleção "combustivel" ordenada por data.
   */
  useEffect(() => {
    const q = query(collection(banco, 'combustivel'), orderBy('data', 'desc'));
    const cancelar = onSnapshot(q, (snapshot) => {
      const lista: Abastecimento[] = [];
      snapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        lista.push({
          id: docSnap.id,
          kmAtual: dados.kmAtual || 0,
          precoPorLitro: dados.precoPorLitro || 0,
          valorTotal: dados.valorTotal || 0,
          litros: dados.litros || 0,
          data: dados.data?.toMillis?.() || 0,
          localizacao: dados.localizacao || '',
          comprovante: dados.comprovante || '',
          consumo: dados.consumo ?? null,
        });
      });
      setAbastecimentos(lista);
    });
    return () => cancelar();
  }, []);

  // Cálculo automático de litros (valorTotal / precoPorLitro).
  const litrosCalc =
    parseFloat(precoPorLitro.replace(',', '.')) > 0
      ? (parseFloat(valorTotal.replace(',', '.')) || 0) /
        (parseFloat(precoPorLitro.replace(',', '.')) || 1)
      : 0;

  /**
   * obterLocal
   * Obtém a geolocalização do navegador.
   */
  const obterLocal = async () => {
    try {
      const geo = await obterGeolocalizacao();
      setLocalizacao(geo.texto);
    } catch {
      // Silencioso se negado.
    }
  };

  /**
   * manipularComprovante
   * Recebe o arquivo de imagem, redimensiona para 300x300px e converte em Base64.
   */
  const manipularComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setProcessandoImg(true);
    try {
      const base64 = await redimensionarImagemBase64(arquivo);
      setComprovante(base64);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
    } finally {
      setProcessandoImg(false);
    }
  };

  /**
   * salvarAbastecimento
   * Salva o registro de abastecimento no Firestore.
   * Suporta submissão via submit do formulário (compatível com mobile).
   */
  const salvarAbastecimento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      const km = parseFloat(kmAtual.replace(',', '.')) || 0;
      const preco = parseFloat(precoPorLitro.replace(',', '.')) || 0;
      const total = parseFloat(valorTotal.replace(',', '.')) || 0;
      const litros = preco > 0 ? total / preco : 0;

      // Calcula consumo (KM/L) comparando com o abastecimento mais recente.
      let consumo: number | null = null;
      if (abastecimentos.length > 0) {
        const ultimo = abastecimentos[0]; // Mais recente (ordenado desc).
        const kmPercorridos = km - ultimo.kmAtual;
        if (kmPercorridos > 0 && litros > 0) {
          consumo = kmPercorridos / litros;
        }
      }

      await addDoc(collection(banco, 'combustivel'), {
        kmAtual: km,
        precoPorLitro: preco,
        valorTotal: total,
        litros,
        data: serverTimestamp(),
        localizacao,
        comprovante,
        consumo,
      });

      // Limpa formulário.
      setKmAtual('');
      setPrecoPorLitro('');
      setValorTotal('');
      setLocalizacao('');
      setComprovante('');

      // Fecha o teclado virtual do celular se algum input estiver focado
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Fecha o modal.
      setModalAberto(false);
    } catch (erro) {
      console.error('Erro ao salvar abastecimento:', erro);
    }
  };

  /**
   * gerarPdf
   * Gera relatório PDF dos abastecimentos.
   */
  const gerarPdf = () => {
    const colunas = ['Data', 'KM', 'R$/L', 'Litros', 'Total', 'KM/L'];
    const linhas = abastecimentos.map((a) => [
      formatarData(a.data),
      a.kmAtual.toString(),
      formatarMoeda(a.precoPorLitro),
      formatarNumero(a.litros, 2),
      formatarMoeda(a.valorTotal),
      a.consumo ? formatarNumero(a.consumo, 2) : '-',
    ]);

    gerarPdfGenerico(
      {
        titulo: 'Relatório de Combustível',
        colunas,
        linhas,
        total: `Total gasto: ${formatarMoeda(
          abastecimentos.reduce((acc, a) => acc + a.valorTotal, 0)
        )}`,
      },
      'relatorio-combustivel-larcontrol.pdf'
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Fuel className="text-primaria-700" />
          Combustível
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Controle de abastecimento e consumo médio do veículo.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="cartao text-center">
          <Gauge className="mx-auto text-primaria-700 mb-1" size={24} />
          <p className="text-2xl font-bold text-slate-900">
            {abastecimentos.length > 0
              ? formatarNumero(abastecimentos[0].consumo || 0, 1)
              : '-'}
          </p>
          <p className="text-xs text-slate-500">Último KM/L</p>
        </div>
        <div className="cartao text-center">
          <Fuel className="mx-auto text-primaria-700 mb-1" size={24} />
          <p className="text-2xl font-bold text-slate-900">
            {formatarNumero(
              abastecimentos.reduce((acc, a) => acc + a.litros, 0),
              1
            )}
          </p>
          <p className="text-xs text-slate-500">Total de litros</p>
        </div>
        <div className="cartao text-center">
          <Calendar className="mx-auto text-primaria-700 mb-1" size={24} />
          <p className="text-2xl font-bold text-slate-900">
            {formatarMoeda(abastecimentos.reduce((acc, a) => acc + a.valorTotal, 0))}
          </p>
          <p className="text-xs text-slate-500">Total gasto</p>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalAberto(true)} className="botao-primario" type="button">
          <Plus size={18} />
          Registrar abastecimento
        </button>
        <button onClick={gerarPdf} className="botao-secundario" type="button">
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      {/* Lista de abastecimentos */}
      <div className="space-y-3">
        {abastecimentos.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <Fuel size={40} className="mx-auto mb-3 opacity-40" />
            <p>Nenhum abastecimento registrado ainda.</p>
          </div>
        ) : (
          abastecimentos.map((a) => (
            <div key={a.id} className="cartao animar-entrada">
              <div className="flex items-start gap-3">
                {/* Comprovante (se houver) */}
                {a.comprovante && (
                  <img
                    src={a.comprovante}
                    alt="Comprovante"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{formatarData(a.data)}</h3>
                    <button
                      onClick={() => deleteDoc(doc(banco, 'combustivel', a.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">KM atual</p>
                      <p className="font-semibold text-slate-700">{formatarNumero(a.kmAtual, 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">R$/litro</p>
                      <p className="font-semibold text-slate-700">{formatarMoeda(a.precoPorLitro)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Litros</p>
                      <p className="font-semibold text-slate-700">{formatarNumero(a.litros, 2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Total</p>
                      <p className="font-semibold text-slate-700">{formatarMoeda(a.valorTotal)}</p>
                    </div>
                  </div>
                  {a.consumo !== null && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-primaria-50 text-primaria-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <Gauge size={14} />
                      Consumo: {formatarNumero(a.consumo, 2)} KM/L
                    </div>
                  )}
                  {a.localizacao && (
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <MapPin size={12} /> {a.localizacao}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de abastecimento */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Registrar abastecimento">
        <form onSubmit={salvarAbastecimento} className="space-y-4">
          <div>
            <label className="rotulo">KM atual do veículo</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 45000"
              value={kmAtual}
              onChange={(e) => setKmAtual(e.target.value)}
              className="campo-entrada"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Preço por litro (R$/L)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 5.79"
                value={precoPorLitro}
                onChange={(e) => setPrecoPorLitro(e.target.value)}
                className="campo-entrada"
                required
              />
            </div>
            <div>
              <label className="rotulo">Valor total pago (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 200.00"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="campo-entrada"
                required
              />
            </div>
          </div>
          {/* Cálculo automático de litros */}
          {litrosCalc > 0 && (
            <div className="bg-primaria-50 rounded-xl p-3 text-sm">
              <span className="text-slate-600">Litros abastecidos: </span>
              <span className="font-bold text-primaria-700">{formatarNumero(litrosCalc, 2)} L</span>
            </div>
          )}
          <div>
            <label className="rotulo">Geolocalização do posto</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="Obter localização"
                value={localizacao}
                className="campo-entrada flex-1"
              />
              <button onClick={obterLocal} className="botao-secundario px-3" type="button">
                <MapPin size={18} />
              </button>
            </div>
          </div>
          {/* Upload do comprovante */}
          <div>
            <label className="rotulo">Comprovante (foto)</label>
            <div className="flex items-center gap-3">
              <label className="botao-secundario cursor-pointer">
                <ImageIcon size={18} />
                {processandoImg ? 'Processando...' : 'Selecionar imagem'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={manipularComprovante}
                  className="hidden"
                />
              </label>
              {comprovante && (
                <img
                  src={comprovante}
                  alt="Comprovante"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
              )}
            </div>
          </div>
          <button type="submit" className="botao-primario w-full">
            Salvar abastecimento
          </button>
        </form>
      </Modal>
    </div>
  );
}
