/**
 * Modal.tsx
 * -----------------------------------------------------------------------------
 * Componente de modal reutilizável para diálogos, formulários e confirmações.
 *
 * Renderiza uma sobreposição escura com um cartão centralizado que contém
 * o conteúdo passado como children. Fecha ao clicar fora ou no botão de fechar.
 * -----------------------------------------------------------------------------
 */

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
  maxLargura?: string; // Classe Tailwind para largura máxima (ex: 'max-w-md').
}

export function Modal({
  aberto,
  onFechar,
  titulo,
  children,
  maxLargura = 'max-w-lg',
}: ModalProps) {
  // Fecha o modal ao pressionar a tecla Escape.
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${maxLargura} max-h-[90vh] overflow-y-auto animar-entrada`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do modal com título e botão de fechar. */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-lg text-slate-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        {/* Conteúdo do modal. */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
