/**
 * PaginaMercado.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Mercado do LarControl - Compras de Rancho e Gastos Extras.
 *
 * Funcionalidades principais:
 *  1. Dois modos: Rancho (Cartão VR/VA) e Gastos Extras (Pix/Débito/Crédito).
 *  2. Calculadora de Teto de Gastos: usuário declara valor total do ticket,
 *     sistema subtrai conforme itens entram no carrinho (barra de progresso).
 *  3. Cálculo avançado de unidades: por unidade (inteiros), kg e gramas.
 *  4. Integração com Despensa: alerta com dados da última compra e badges
 *     de preço (mais caro = vermelho, mais barato = verde).
 *  5. Metadados: nome do mercado, data/hora e geolocalização.
 *  6. Sincronização realtime via onSnapshot (carrinho compartilhado).
 *  7. Notificações push quando outro membro adiciona item.
 *  8. Geração de relatório PDF.
 *  9. Importação em massa de listas (.txt, .csv, .docx, .xml).
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
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
} from 'lucide-react';

export function PaginaMercado() {
  const { usuario } = useAuth();

  // --- Estados do módulo ---
  const [itens, setItens] = useState<ItemCarrinho[]>([]); // Itens do carrinho (realtime).
  const [despensa, setDespensa] = useState<ItemDespensa[]>([]); // Itens da despensa (para alertas).
  const [modo, setModo] = useState<'rancho' | 'extras'>('rancho'); // Modo ativo.
  const [teto, setTeto] = useState<number>(0); // Valor total declarado do ticket.
  const [tetoInput, setTetoInput] = useState(''); // Input do teto.
  const [mercado, setMercado] = useState(''); // Nome do mercado.
  const [localizacao, setLocalizacao] = useState(''); // Geolocalização.
  const [modalAberto, setModalAberto] = useState(false); // Modal de adicionar item.
  const [alertaDespensa, setAlertaDespensa] = useState<string | null>(null); // Alerta da despensa.

  // Campos do formulário de novo item.
  const [novoNome, setNovoNome] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [novaUnidade, setNovaUnidade] = useState<'un' | 'kg' | 'g'>('un');
  const [novoPreco, setNovoPreco] = useState('');

  /**
   * Efeito: escuta em tempo real (onSnapshot) da coleção "mercado" no Firestore.
   */
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

  /**
   * Efeito: escuta a coleção "despensa" para usar nos alertas inteligentes.
   */
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

  // Solicita permissão de notificação ao montar o componente.
  useEffect(() => {
    solicitarPermissaoNotificacao();
  }, []);

  // --- Cálculos derivados ---

  // Filtra itens pelo modo ativo (rancho ou extras).
  const itensModo = itens.filter((i) => i.modo === modo);

  // Total gasto no modo atual.
  const totalGasto = itensModo.reduce((acc, i) => acc + i.subtotal, 0);

  // Saldo restante do teto.
  const saldo = teto - totalGasto;

  // Percentual usado do teto (para barra de progresso).
  const percentual = teto > 0 ? Math.min((totalGasto / teto) * 100, 100) : 0;

  /**
   * definirTeto
   */
  const definirTeto = () => {
    const valor = parseFloat(tetoInput.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) {
      setTeto(valor);
      setTetoInput('');
    }
  };

  /**
   * obterLocal
   */
  const obterLocal = async () => {
    try {
      const geo = await obterGeolocalizacao();
      setLocalizacao(geo.texto);
    } catch {
      // Silencioso
    }
  };

  /**
   * calcularSubtotal
   */
  const calcularSubtotal = (qtd: number, unidade: string, preco: number): number => {
    if (unidade === 'g') return (qtd / 1000) * preco;
    return qtd * preco;
  };

  /**
   * adicionarItem
   * Suporta submissão por evento de formulário para garantir fechamento em telas touch.
   */
  const adicionarItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novoNome.trim() || !novoPreco) return;

    try {
      const qtd = parseFloat(novaQtd.replace(',', '.')) || 0;
      const preco = parseFloat(novoPreco.replace(',', '.')) || 0;
      const subtotal = calcularSubtotal(qtd, novaUnidade, preco);

      // --- Alerta inteligente da despensa ---
      const itemDespensa = despensa.find(
        (d) => d.nome.toLowerCase() === novoNome.toLowerCase()
      );

      if (itemDespensa) {
        const precoAnterior = itemDespensa.ultimoPreco;
        const status = itemDespensa.status;
        const qtdDespensa = itemDespensa.quantidade;
        const localAnterior = itemDespensa.ultimoLocal;

        let comparacao = '';
        if (precoAnterior > 0) {
          if (preco > precoAnterior) {
            comparacao = `MAIS CARO que a última compra (era ${formatarMoeda(precoAnterior)} no ${localAnterior}).`;
          } else if (preco < precoAnterior) {
            comparacao = `MAIS BARATO que a última compra (era ${formatarMoeda(precoAnterior)} no ${localAnterior}).`;
          } else {
            comparacao = `Mesmo preço da última compra no ${localAnterior}.`;
          }
        }

        setAlertaDespensa(
          `No mês anterior você comprou ${qtdDespensa} ${itemDespensa.unidade} de "${novoNome}" a ${formatarMoeda(precoAnterior)} no ${localAnterior}. ` +
          `Status atual na despensa: ${qtdDespensa} ${itemDespensa.unidade} (${status}). ${comparacao}`
        );
      } else {
        setAlertaDespensa(null);
      }

      // --- Salva no Firestore ---
      await addDoc(collection(banco, 'mercado'), {
        nome: novoNome.trim(),
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

      // --- Notificação ---
      enviarNotificacao(
        'Item adicionado ao carrinho',
        `${usuario?.nome || 'Um membro'} adicionou: ${novoNome} (${formatarMoeda(subtotal)})`
      );

      // --- Limpeza do Formulário ---
      setNovoNome('');
      setNovaQtd('1');
      setNovaUnidade('un');
      setNovoPreco('');

      // Esconde o teclado no celular se ainda estiver focado
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // --- Fechamento do Modal ---
      setModalAberto(false);
    } catch (erro) {
      console.error("Erro ao adicionar produto:", erro);
    }
  };

  /**
   * removerItem
   */
  const removerItem = async (id: string) => {
    await deleteDoc(doc(banco, 'mercado', id));
  };

  /**
   * importarItens
   */
  const importarItens = async (itensImportados: ItemImportado[]) => {
    for (const item of itensImportados) {
      const subtotal = calcularSubtotal(item.quantidade, item.unidade, item.preco);
      await addDoc(collection(banco, 'mercado'), {
        nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        precoUnitario: item.preco,
        subtotal,
        modo,
        mercado: mercado || 'Importado',
        adicionadoPor: usuario?.nome || 'Usuário',
        adicionadoEm: serverTimestamp(),
        localizacao,
      });
    }
  };

  /**
   * gerarPdf
   */
  const gerarPdf = () => {
    const colunas = ['Produto', 'Qtd', 'Un.', 'Preço Unit.', 'Subtotal'];
    const linhas = itensModo.map((i) => [
      i.nome,
      i.quantidade.toString(),
      i.unidade,
      formatarMoeda(i.precoUnitario),
      formatarMoeda(i.subtotal),
    ]);

    gerarPdfGenerico(
      {
        titulo: modo === 'rancho' ? 'Relatório de Rancho (VR/VA)' : 'Relatório de Gastos Extras',
        subtitulo: `Mercado: ${mercado || 'Não informado'} | Local: ${localizacao || 'N/A'}`,
        colunas,
        linhas,
        total: `TOTAL: ${formatarMoeda(totalGasto)}`,
      },
      `relatorio-${modo}-larcontrol.pdf`
    );
  };

  return (
    <div className="space-y-6">
      {/* === Cabeçalho do módulo === */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="text-primaria-700" />
          Mercado
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Compras de rancho e gastos extras com sincronização em tempo real.
        </p>
      </div>

      {/* === Seletor de modo === */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setModo('rancho')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'rancho' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Rancho (VR/VA)
        </button>
        <button
          onClick={() => setModo('extras')}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            modo === 'extras' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Gastos Extras
        </button>
      </div>

      {/* === Calculadora de Teto de Gastos === */}
      <div className="cartao-destaque">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Wallet size={18} className="text-teal-600 dark:text-teal-400" />
            Teto de Gastos
          </h2>
          {teto > 0 && (
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Saldo: <span className={saldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{formatarMoeda(saldo)}</span>
            </span>
          )}
        </div>

        {teto === 0 ? (
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Valor total do ticket (ex: 1500)"
              value={tetoInput}
              onChange={(e) => setTetoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && definirTeto()}
              className="campo-entrada flex-1"
            />
            <button onClick={definirTeto} className="botao-primario">
              Definir
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
              <span className="text-slate-600 dark:text-slate-400">{formatarMoeda(teto)} teto</span>
            </div>
            {percentual >= 100 && (
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold mt-2 flex items-center gap-1">
                <AlertCircle size={16} />
                Teto de gastos ultrapassado!
              </p>
            )}
          </div>
        )}
      </div>

      {/* === Metadados: Mercado e Geolocalização === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Nome do mercado</label>
          <input
            type="text"
            placeholder="Ex: Supermercado Bom Preço"
            value={mercado}
            onChange={(e) => setMercado(e.target.value)}
            className="campo-entrada"
          />
        </div>
        <div>
          <label className="rotulo">Geolocalização</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              placeholder="Toque em obter localização"
              value={localizacao}
              className="campo-entrada flex-1"
            />
            <button onClick={obterLocal} className="botao-secundario px-3" type="button">
              <MapPin size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* === Alerta inteligente da despensa === */}
      {alertaDespensa && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 animar-entrada">
          <Package className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-1">Alerta da Despensa</p>
            <p className="text-amber-700 dark:text-amber-300 text-sm">{alertaDespensa}</p>
          </div>
          <button onClick={() => setAlertaDespensa(null)} className="text-amber-400 hover:text-amber-600 ml-auto">
            ×
          </button>
        </div>
      )}

      {/* === Barra de ações === */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModalAberto(true)} className="botao-primario">
          <Plus size={18} />
          Adicionar item
        </button>
        <BotaoImportar onImportar={importarItens} />
        <button onClick={gerarPdf} className="botao-secundario">
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      {/* === Lista de itens do carrinho === */}
      <div className="space-y-3">
        {itensModo.length === 0 ? (
          <div className="cartao text-center py-12 text-slate-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
            <p>Carrinho vazio. Adicione itens para começar.</p>
          </div>
        ) : (
          itensModo.map((item) => {
            const itemDespensa = despensa.find(
              (d) => d.nome.toLowerCase() === item.nome.toLowerCase()
            );
            const maisCaro = itemDespensa && item.precoUnitario > itemDespensa.ultimoPreco;
            const maisBarato = itemDespensa && item.precoUnitario < itemDespensa.ultimoPreco;

            return (
              <div key={item.id} className="cartao flex items-center gap-3 animar-entrada">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.nome}</h3>
                    {maisCaro && (
                      <span className="badge bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        <TrendingUp size={12} /> Mais caro
                      </span>
                    )}
                    {maisBarato && (
                      <span className="badge bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <TrendingDown size={12} /> Mais barato
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.quantidade} {item.unidade} × {formatarMoeda(item.precoUnitario)} = {' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{formatarMoeda(item.subtotal)}</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Por {item.adicionadoPor} • {formatarData(item.adicionadoEm)}
                  </p>
                </div>
                <button
                  onClick={() => removerItem(item.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  aria-label="Remover item"
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* === Total === */}
      {itensModo.length > 0 && (
        <div className="cartao-destaque flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-100">Total {modo === 'rancho' ? 'do Rancho' : 'dos Gastos Extras'}</span>
          <span className="text-2xl font-bold text-teal-700 dark:text-teal-400">{formatarMoeda(totalGasto)}</span>
        </div>
      )}

      {/* === Modal de adicionar item === */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Adicionar item ao carrinho">
        <form onSubmit={adicionarItem} className="space-y-4">
          <div>
            <label className="rotulo">Nome do produto</label>
            <input
              type="text"
              placeholder="Ex: Arroz 5kg"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="campo-entrada"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Quantidade</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 2 ou 0.450"
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
            <label className="rotulo">
              {novaUnidade === 'un' ? 'Preço unitário (R$)' : 'Preço por kg (R$)'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 49.90"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
              className="campo-entrada"
              required
            />
          </div>
          {/* Preview do subtotal calculado */}
          {novoPreco && novaQtd && (
            <div className="bg-teal-50 dark:bg-slate-800/80 rounded-xl p-3 text-sm border border-teal-100 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Subtotal: </span>
              <span className="font-bold text-teal-700 dark:text-teal-300">
                {formatarMoeda(
                  calcularSubtotal(
                    parseFloat(novaQtd.replace(',', '.')) || 0,
                    novaUnidade,
                    parseFloat(novoPreco.replace(',', '.')) || 0
                  )
                )}
              </span>
            </div>
          )}
          <button type="submit" className="botao-primario w-full">
            <Plus size={18} />
            Adicionar ao carrinho
          </button>
        </form>
      </Modal>
    </div>
  );
}
