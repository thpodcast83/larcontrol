/**
 * BotaoImportar.tsx
 * -----------------------------------------------------------------------------
 * Componente reutilizável para importação em massa de arquivos.
 *
 * Permite ao usuário selecionar arquivos (.txt, .csv, .docx, .xml) e os
 * processa usando o utilitário utilParser, retornando os itens normalizados
 * ao componente pai via callback.
 * -----------------------------------------------------------------------------
 */

import { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { processarArquivoImportacao, ItemImportado } from '@/utils/utilParser';

interface BotaoImportarProps {
  onImportar: (itens: ItemImportado[]) => void;
}

export function BotaoImportar({ onImportar }: BotaoImportarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  /**
   * Manipula a seleção de arquivo, processa e chama o callback.
   */
  const manipularArquivo = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setCarregando(true);
    setErro('');

    try {
      const itens = await processarArquivoImportacao(arquivo);
      onImportar(itens);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar arquivo.');
    } finally {
      setCarregando(false);
      // Limpa o input para permitir re-selecionar o mesmo arquivo.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv,.docx,.xml"
        onChange={manipularArquivo}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={carregando}
        className="botao-secundario text-sm"
      >
        {carregando ? (
          <>
            <FileUp size={16} className="animate-pulse" />
            Processando...
          </>
        ) : (
          <>
            <Upload size={16} />
            Importar lista
          </>
        )}
      </button>
      {erro && <p className="text-red-600 text-xs mt-1.5">{erro}</p>}
    </div>
  );
}
