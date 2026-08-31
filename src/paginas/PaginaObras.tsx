/**
 * PaginaObras.tsx
 * -----------------------------------------------------------------------------
 * Módulo de Gestão de Orçamentos de Materiais e Comparador de Fornecedores
 * do LarControl.
 *
 * Funcionalidades:
 *  1. Orçamento para compra de materiais com vinculação direta de fornecedores.
 *  2. Comparação automática de custo-benefício por fornecedor (valor dos itens + frete / distância).
 *  3. Seleção de itens por unidade ou metro a partir de uma lista completa de construção.
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
 * Lista completa consolidada e sem duplicidades de materiais de construção,
 * divididos entre unidade e metro/medida para seleção nos orçamentos.
 */
const materiaisPreDefinidos = [
  // Estrutura, Fundações e Alvenaria
  { nome: 'Pedra gres', tipoPadrao: 'metro' as const, precoSugerido: 130.0 },
  { nome: 'Cimento', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Areia', tipoPadrao: 'metro' as const, precoSugerido: 120.0 },
  { nome: 'Brita', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Cal', tipoPadrao: 'unidade' as const, precoSugerido: 22.0 },
  { nome: 'Água', tipoPadrao: 'metro' as const, precoSugerido: 5.0 },
  { nome: 'Vergalhões de aço', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Arame recozido', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Estribos', tipoPadrao: 'unidade' as const, precoSugerido: 1.0 },
  { nome: 'Tela soldada', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },
  { nome: 'Blocos de concreto', tipoPadrao: 'unidade' as const, precoSugerido: 4.5 },
  { nome: 'Tijolos', tipoPadrao: 'unidade' as const, precoSugerido: 1.5 },
  { nome: 'Pedra britada', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Pedra de mão', tipoPadrao: 'metro' as const, precoSugerido: 110.0 },
  { nome: 'Lona plástica', tipoPadrao: 'metro' as const, precoSugerido: 4.0 },
  { nome: 'Impermeabilizante', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 },
  { nome: 'Manta asfáltica', tipoPadrao: 'metro' as const, precoSugerido: 35.0 },
  { nome: 'Aditivos para concreto', tipoPadrao: 'unidade' as const, precoSugerido: 50.0 },
  { nome: 'Madeira para formas', tipoPadrao: 'metro' as const, precoSugerido: 15.0 },
  { nome: 'Compensado para formas', tipoPadrao: 'unidade' as const, precoSugerido: 70.0 },
  { nome: 'Pregos', tipoPadrao: 'unidade' as const, precoSugerido: 18.0 },
  { nome: 'Parafusos', tipoPadrao: 'unidade' as const, precoSugerido: 0.5 },
  { nome: 'Escoras', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Espaçadores para armadura', tipoPadrao: 'unidade' as const, precoSugerido: 0.2 },
  { nome: 'Tubos para drenagem', tipoPadrao: 'metro' as const, precoSugerido: 18.0 },
  { nome: 'Geotêxtil', tipoPadrao: 'metro' as const, precoSugerido: 8.0 },
  { nome: 'Terra', tipoPadrao: 'metro' as const, precoSugerido: 70.0 },
  { nome: 'Saibro', tipoPadrao: 'metro' as const, precoSugerido: 80.0 },
  { nome: 'Rachão', tipoPadrao: 'metro' as const, precoSugerido: 95.0 },
  { nome: 'Desmoldante', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Tela de aço', tipoPadrao: 'metro' as const, precoSugerido: 22.0 },
  { nome: 'Escoras metálicas ou de madeira', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Perfis metálicos', tipoPadrao: 'metro' as const, precoSugerido: 60.0 },
  { nome: 'Tubos metálicos', tipoPadrao: 'metro' as const, precoSugerido: 50.0 },
  { nome: 'Chapas metálicas', tipoPadrao: 'unidade' as const, precoSugerido: 150.0 },
  { nome: 'Cantoneiras', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },
  { nome: 'Parafusos estruturais', tipoPadrao: 'unidade' as const, precoSugerido: 1.2 },
  { nome: 'Porcas', tipoPadrao: 'unidade' as const, precoSugerido: 0.4 },
  { nome: 'Arruelas', tipoPadrao: 'unidade' as const, precoSugerido: 0.2 },
  { nome: 'Solda', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Primer anticorrosivo', tipoPadrao: 'unidade' as const, precoSugerido: 65.0 },
  { nome: 'Tinta para metal', tipoPadrao: 'unidade' as const, precoSugerido: 75.0 },
  { nome: 'Tijolos cerâmicos', tipoPadrao: 'unidade' as const, precoSugerido: 1.6 },
  { nome: 'Blocos cerâmicos', tipoPadrao: 'unidade' as const, precoSugerido: 3.2 },
  { nome: 'Argamassa', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Vergas', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Contravergas', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Canaletas', tipoPadrao: 'unidade' as const, precoSugerido: 5.0 },
  { nome: 'Graute', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Tela para amarração', tipoPadrao: 'metro' as const, precoSugerido: 10.0 },
  { nome: 'Elementos de fixação', tipoPadrao: 'unidade' as const, precoSugerido: 0.8 },
  { nome: 'Drywall', tipoPadrao: 'metro' as const, precoSugerido: 45.0 },
  { nome: 'Perfis metálicos para drywall', tipoPadrao: 'metro' as const, precoSugerido: 12.0 },
  { nome: 'Parafusos para drywall', tipoPadrao: 'unidade' as const, precoSugerido: 0.1 },
  { nome: 'Fita para juntas', tipoPadrao: 'metro' as const, precoSugerido: 1.5 },
  { nome: 'Massa para juntas', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Lã mineral ou lã de vidro', tipoPadrao: 'metro' as const, precoSugerido: 20.0 },

  // Instalações Hidráulicas, Gás e Esgoto
  { nome: 'Tubos PVC', tipoPadrao: 'metro' as const, precoSugerido: 15.0 },
  { nome: 'Conexões PVC', tipoPadrao: 'unidade' as const, precoSugerido: 6.0 },
  { nome: 'Joelhos', tipoPadrao: 'unidade' as const, precoSugerido: 4.0 },
  { nome: 'Tês', tipoPadrao: 'unidade' as const, precoSugerido: 5.0 },
  { nome: 'Luvas', tipoPadrao: 'unidade' as const, precoSugerido: 3.5 },
  { nome: 'Adaptadores', tipoPadrao: 'unidade' as const, precoSugerido: 7.0 },
  { nome: 'Buchas de redução', tipoPadrao: 'unidade' as const, precoSugerido: 3.0 },
  { nome: 'Registros', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Registro geral', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 },
  { nome: 'Caixa d\'água', tipoPadrao: 'unidade' as const, precoSugerido: 450.0 },
  { nome: 'Boia', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Flanges', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Válvulas', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Abraçadeiras', tipoPadrao: 'unidade' as const, precoSugerido: 2.0 },
  { nome: 'Fita veda-rosca', tipoPadrao: 'unidade' as const, precoSugerido: 5.0 },
  { nome: 'Cola para PVC', tipoPadrao: 'unidade' as const, precoSugerido: 18.0 },
  { nome: 'Tubos para água quente', tipoPadrao: 'metro' as const, precoSugerido: 30.0 },
  { nome: 'Isolamento térmico', tipoPadrao: 'metro' as const, precoSugerido: 12.0 },
  { nome: 'Aquecedor', tipoPadrao: 'unidade' as const, precoSugerido: 1200.0 },
  { nome: 'Tubos PVC para esgoto', tipoPadrao: 'metro' as const, precoSugerido: 22.0 },
  { nome: 'Junções', tipoPadrao: 'unidade' as const, precoSugerido: 8.0 },
  { nome: 'Reduções', tipoPadrao: 'unidade' as const, precoSugerido: 6.0 },
  { nome: 'Caixas sifonadas', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Caixas de inspeção', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Ralos', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Sifões', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Anéis de vedação', tipoPadrao: 'unidade' as const, precoSugerido: 8.0 },
  { nome: 'Caixa de gordura', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 },
  { nome: 'Tubulação de ventilação', tipoPadrao: 'metro' as const, precoSugerido: 14.0 },

  // Instalações Elétricas, Redes e Segurança
  { nome: 'Cabos elétricos', tipoPadrao: 'metro' as const, precoSugerido: 4.5 },
  { nome: 'Fios elétricos', tipoPadrao: 'metro' as const, precoSugerido: 3.5 },
  { nome: 'Eletrodutos', tipoPadrao: 'metro' as const, precoSugerido: 5.0 },
  { nome: 'Caixas de passagem', tipoPadrao: 'unidade' as const, precoSugerido: 10.0 },
  { nome: 'Caixas 4x2', tipoPadrao: 'unidade' as const, precoSugerido: 3.0 },
  { nome: 'Caixas 4x4', tipoPadrao: 'unidade' as const, precoSugerido: 5.0 },
  { nome: 'Quadro de distribuição', tipoPadrao: 'unidade' as const, precoSugerido: 110.0 },
  { nome: 'Disjuntores', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'DR', tipoPadrao: 'unidade' as const, precoSugerido: 130.0 },
  { nome: 'DPS', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Barramentos', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Conectores', tipoPadrao: 'unidade' as const, precoSugerido: 2.5 },
  { nome: 'Terminais', tipoPadrao: 'unidade' as const, precoSugerido: 1.5 },
  { nome: 'Interruptores', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Tomadas', tipoPadrao: 'unidade' as const, precoSugerido: 16.0 },
  { nome: 'Espelhos', tipoPadrao: 'unidade' as const, precoSugerido: 8.0 },
  { nome: 'Soquetes', tipoPadrao: 'unidade' as const, precoSugerido: 6.0 },
  { nome: 'Lâmpadas', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Luminárias', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Fita isolante', tipoPadrao: 'unidade' as const, precoSugerido: 7.0 },
  { nome: 'Canaletas', tipoPadrao: 'metro' as const, precoSugerido: 8.0 },
  { nome: 'Haste de aterramento', tipoPadrao: 'unidade' as const, precoSugerido: 55.0 },
  { nome: 'Cabo de aterramento', tipoPadrao: 'metro' as const, precoSugerido: 6.0 },
  { nome: 'Caixa de aterramento', tipoPadrao: 'unidade' as const, precoSugerido: 50.0 },
  { nome: 'Cabos de rede', tipoPadrao: 'metro' as const, precoSugerido: 3.0 },
  { nome: 'Cabos coaxiais', tipoPadrao: 'metro' as const, precoSugerido: 3.5 },
  { nome: 'Tomadas de rede', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Keystone', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Patch panel', tipoPadrao: 'unidade' as const, precoSugerido: 150.0 },
  { nome: 'Rack', tipoPadrao: 'unidade' as const, precoSugerido: 450.0 },
  { nome: 'Cabos de telefone/interfone', tipoPadrao: 'metro' as const, precoSugerido: 2.5 },
  { nome: 'Campainha', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Interfone', tipoPadrao: 'unidade' as const, precoSugerido: 200.0 },
  { nome: 'Portões', tipoPadrao: 'unidade' as const, precoSugerido: 1200.0 },
  { nome: 'Grades', tipoPadrao: 'metro' as const, precoSugerido: 180.0 },
  { nome: 'Travas', tipoPadrao: 'unidade' as const, precoSugerido: 50.0 },
  { nome: 'Câmeras', tipoPadrao: 'unidade' as const, precoSugerido: 250.0 },
  { nome: 'Central de alarme', tipoPadrao: 'unidade' as const, precoSugerido: 600.0 },
  { nome: 'Sensores', tipoPadrao: 'unidade' as const, precoSugerido: 70.0 },
  { nome: 'Sirene', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Cerca elétrica', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },

  // Esquadrias, Portas e Janelas
  { nome: 'Portas externas', tipoPadrao: 'unidade' as const, precoSugerido: 450.0 },
  { nome: 'Portas internas', tipoPadrao: 'unidade' as const, precoSugerido: 250.0 },
  { nome: 'Batentes', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Marcos', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 },
  { nome: 'Guarnições', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Dobradiças', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Fechaduras', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 },
  { nome: 'Maçanetas', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Trincos', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Puxadores', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Soleiras', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Janelas de alumínio', tipoPadrao: 'unidade' as const, precoSugerido: 350.0 },
  { nome: 'Janelas de PVC', tipoPadrao: 'unidade' as const, precoSugerido: 450.0 },
  { nome: 'Janelas de madeira', tipoPadrao: 'unidade' as const, precoSugerido: 400.0 },
  { nome: 'Vidros', tipoPadrao: 'metro' as const, precoSugerido: 120.0 },
  { nome: 'Contramarcos', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Peitoris', tipoPadrao: 'unidade' as const, precoSugerido: 55.0 },
  { nome: 'Ferragens', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Fechos', tipoPadrao: 'unidade' as const, precoSugerido: 18.0 },
  { nome: 'Borrachas de vedação', tipoPadrao: 'metro' as const, precoSugerido: 5.0 },
  { nome: 'Silicone', tipoPadrao: 'unidade' as const, precoSugerido: 22.0 },

  // Cobertura e Telhado
  { nome: 'Madeira para tesouras', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },
  { nome: 'Caibros', tipoPadrao: 'metro' as const, precoSugerido: 10.0 },
  { nome: 'Ripas', tipoPadrao: 'metro' as const, precoSugerido: 5.0 },
  { nome: 'Terças', tipoPadrao: 'metro' as const, precoSugerido: 18.0 },
  { nome: 'Conectores metálicos', tipoPadrao: 'unidade' as const, precoSugerido: 8.0 },
  { nome: 'Telhas metálicas', tipoPadrao: 'metro' as const, precoSugerido: 45.0 },
  { nome: 'Telhas cerâmicas', tipoPadrao: 'unidade' as const, precoSugerido: 2.5 },
  { nome: 'Telhas de concreto', tipoPadrao: 'unidade' as const, precoSugerido: 4.0 },
  { nome: 'Telhas de fibrocimento', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Telhas termoacústicas', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Cumeeiras', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Rufos', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },
  { nome: 'Calhas', tipoPadrao: 'metro' as const, precoSugerido: 30.0 },
  { nome: 'Condutores de água', tipoPadrao: 'metro' as const, precoSugerido: 20.0 },
  { nome: 'Manta térmica', tipoPadrao: 'metro' as const, precoSugerido: 8.0 },
  { nome: 'Parafusos com vedação', tipoPadrao: 'unidade' as const, precoSugerido: 1.0 },

  // Revestimentos, Pisos e Acabamentos
  { nome: 'Cerâmica', tipoPadrao: 'metro' as const, precoSugerido: 40.0 },
  { nome: 'Porcelanato', tipoPadrao: 'metro' as const, precoSugerido: 75.0 },
  { nome: 'Pastilhas', tipoPadrao: 'metro' as const, precoSugerido: 90.0 },
  { nome: 'Pedras naturais', tipoPadrao: 'metro' as const, precoSugerido: 130.0 },
  { nome: 'Argamassa colante', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Rejunte', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Espaçadores', tipoPadrao: 'unidade' as const, precoSugerido: 0.1 },
  { nome: 'Niveladores', tipoPadrao: 'unidade' as const, precoSugerido: 0.3 },
  { nome: 'Contrapiso', tipoPadrao: 'metro' as const, precoSugerido: 25.0 },
  { nome: 'Piso vinílico', tipoPadrao: 'metro' as const, precoSugerido: 85.0 },
  { nome: 'Piso laminado', tipoPadrao: 'metro' as const, precoSugerido: 70.0 },
  { nome: 'Madeira', tipoPadrao: 'metro' as const, precoSugerido: 140.0 },
  { nome: 'Pedra', tipoPadrao: 'metro' as const, precoSugerido: 110.0 },
  { nome: 'Rodapés', tipoPadrao: 'metro' as const, precoSugerido: 18.0 },
  { nome: 'Perfis de acabamento', tipoPadrao: 'metro' as const, precoSugerido: 15.0 },

  // Pintura e Tratamento de Superfícies
  { nome: 'Selador', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Fundo preparador', tipoPadrao: 'unidade' as const, precoSugerido: 70.0 },
  { nome: 'Massa corrida', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Massa acrílica', tipoPadrao: 'unidade' as const, precoSugerido: 65.0 },
  { nome: 'Lixa', tipoPadrao: 'unidade' as const, precoSugerido: 2.0 },
  { nome: 'Fita crepe', tipoPadrao: 'unidade' as const, precoSugerido: 8.0 },
  { nome: 'Tela para fissuras', tipoPadrao: 'metro' as const, precoSugerido: 4.0 },
  { nome: 'Calafetador', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Primer', tipoPadrao: 'unidade' as const, precoSugerido: 55.0 },
  { nome: 'Tinta acrílica', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 },
  { nome: 'Tinta látex', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Tinta esmalte', tipoPadrao: 'unidade' as const, precoSugerido: 75.0 },
  { nome: 'Tinta para piso', tipoPadrao: 'unidade' as const, precoSugerido: 140.0 },
  { nome: 'Tinta impermeabilizante', tipoPadrao: 'unidade' as const, precoSugerido: 180.0 },
  { nome: 'Verniz', tipoPadrao: 'unidade' as const, precoSugerido: 85.0 },
  { nome: 'Textura', tipoPadrao: 'unidade' as const, precoSugerido: 95.0 },
  { nome: 'Grafiato', tipoPadrao: 'unidade' as const, precoSugerido: 100.0 },
  { nome: 'Rolos', tipoPadrao: 'unidade' as const, precoSugerido: 18.0 },
  { nome: 'Pincéis', tipoPadrao: 'unidade' as const, precoSugerido: 10.0 },
  { nome: 'Trinchas', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Bandejas', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Extensores', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Espátulas', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Desempenadeiras', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Misturadores', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },

  // Louças, Metais, Equipamentos e Complementos
  { nome: 'Vaso sanitário', tipoPadrao: 'unidade' as const, precoSugerido: 350.0 },
  { nome: 'Caixa acoplada', tipoPadrao: 'unidade' as const, precoSugerido: 180.0 },
  { nome: 'Assento sanitário', tipoPadrao: 'unidade' as const, precoSugerido: 50.0 },
  { nome: 'Pia/cuba', tipoPadrao: 'unidade' as const, precoSugerido: 250.0 },
  { nome: 'Bancada', tipoPadrao: 'unidade' as const, precoSugerido: 400.0 },
  { nome: 'Torneira', tipoPadrao: 'unidade' as const, precoSugerido: 90.0 },
  { nome: 'Chuveiro', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 },
  { nome: 'Espelho', tipoPadrao: 'unidade' as const, precoSugerido: 150.0 },
  { nome: 'Porta-toalha', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Porta-papel', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Cabide', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Box', tipoPadrao: 'unidade' as const, precoSugerido: 600.0 },
  { nome: 'Perfis do box', tipoPadrao: 'unidade' as const, precoSugerido: 120.0 },
  { nome: 'Armários', tipoPadrao: 'unidade' as const, precoSugerido: 800.0 },
  { nome: 'Prateleiras', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Coifa/exaustor', tipoPadrao: 'unidade' as const, precoSugerido: 700.0 },
  { nome: 'Tanque', tipoPadrao: 'unidade' as const, precoSugerido: 220.0 },
  { nome: 'Rodabanca', tipoPadrao: 'metro' as const, precoSugerido: 45.0 },
  { nome: 'Grelhas', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Tampas', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Tubos de cobre', tipoPadrao: 'metro' as const, precoSugerido: 45.0 },
  { nome: 'Tubulação para dreno', tipoPadrao: 'metro' as const, precoSugerido: 10.0 },
  { nome: 'Suportes', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Equipamentos de ar-condicionado', tipoPadrao: 'unidade' as const, precoSugerido: 2200.0 },
  { nome: 'Calçada', tipoPadrao: 'metro' as const, precoSugerido: 60.0 },
  { nome: 'Piso externo', tipoPadrao: 'metro' as const, precoSugerido: 50.0 },
  { nome: 'Meio-fio', tipoPadrao: 'metro' as const, precoSugerido: 35.0 },
  { nome: 'Muros', tipoPadrao: 'metro' as const, precoSugerido: 150.0 },
  { nome: 'Tinta externa', tipoPadrao: 'unidade' as const, precoSugerido: 150.0 },
  { nome: 'Iluminação externa', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 },

  // Ferramentas e Equipamentos de Obra
  { nome: 'Betoneira', tipoPadrao: 'unidade' as const, precoSugerido: 2500.0 },
  { nome: 'Carrinho de mão', tipoPadrao: 'unidade' as const, precoSugerido: 180.0 },
  { nome: 'Pá', tipoPadrao: 'unidade' as const, precoSugerido: 45.0 },
  { nome: 'Enxada', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Picareta', tipoPadrao: 'unidade' as const, precoSugerido: 50.0 },
  { nome: 'Colher de pedreiro', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Desempenadeira', tipoPadrao: 'unidade' as const, precoSugerido: 20.0 },
  { nome: 'Régua de alumínio', tipoPadrao: 'unidade' as const, precoSugerido: 70.0 },
  { nome: 'Prumo', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Nível', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Mangueira de nível', tipoPadrao: 'metro' as const, precoSugerido: 3.0 },
  { nome: 'Trena', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Esquadro', tipoPadrao: 'unidade' as const, precoSugerido: 25.0 },
  { nome: 'Linha de pedreiro', tipoPadrao: 'unidade' as const, precoSugerido: 15.0 },
  { nome: 'Baldes', tipoPadrao: 'unidade' as const, precoSugerido: 12.0 },
  { nome: 'Masseiras', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Peneiras', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Martelo', tipoPadrao: 'unidade' as const, precoSugerido: 35.0 },
  { nome: 'Marreta', tipoPadrao: 'unidade' as const, precoSugerido: 70.0 },
  { nome: 'Alicates', tipoPadrao: 'unidade' as const, precoSugerido: 30.0 },
  { nome: 'Chaves', tipoPadrao: 'unidade' as const, precoSugerido: 40.0 },
  { nome: 'Furadeira', tipoPadrao: 'unidade' as const, precoSugerido: 250.0 },
  { nome: 'Parafusadeira', tipoPadrao: 'unidade' as const, precoSugerido: 300.0 },
  { nome: 'Serra', tipoPadrao: 'unidade' as const, precoSugerido: 350.0 },
  { nome: 'Extensão elétrica', tipoPadrao: 'unidade' as const, precoSugerido: 60.0 },
  { nome: 'Escada', tipoPadrao: 'unidade' as const, precoSugerido: 200.0 },
  { nome: 'Andaime', tipoPadrao: 'unidade' as const, precoSugerido: 450.0 },
  { nome: 'Compactador', tipoPadrao: 'unidade' as const, precoSugerido: 3500.0 },
  { nome: 'Equipamentos de proteção individual', tipoPadrao: 'unidade' as const, precoSugerido: 80.0 }
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
