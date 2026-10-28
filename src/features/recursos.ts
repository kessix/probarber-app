import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type Recurso = {
  id: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Recursos prontos têm rota própria; os demais usam /recurso/[id] ("em breve"). */
  href?: '/servicos' | '/meu-link' | '/configuracoes';
};

/**
 * Itens do menu Recursos, na ordem em que aparecem (a Configuração da agenda vem antes, em destaque).
 * Os que não têm `href` ainda não existem e abrem /recurso/[id] como "em breve". Textos da landpage.
 */
export const RECURSOS: Recurso[] = [
  {
    id: 'servicos',
    title: 'Serviços',
    description: 'O catálogo que seu cliente vê ao agendar, com foto, duração e preço.',
    icon: 'cut-outline',
    href: '/servicos',
  },
  {
    id: 'meu-link',
    title: 'Meu link',
    description: 'Seu link de agendamento para divulgar no Instagram e no WhatsApp.',
    icon: 'link-outline',
    href: '/meu-link',
  },
  {
    id: 'equipe',
    title: 'Equipe',
    description: 'Cada barbeiro com sua agenda, comissões e histórico de atendimentos.',
    icon: 'people-outline',
  },
  {
    id: 'estoque',
    title: 'Estoque',
    description: 'Entradas e saídas de produtos, com alerta quando algo estiver acabando.',
    icon: 'cube-outline',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Entradas, saídas e faturamento por dia, serviço ou profissional.',
    icon: 'wallet-outline',
  },
  {
    id: 'lembretes',
    title: 'Lembretes',
    description: 'Confirmações e lembretes automáticos que reduzem faltas.',
    icon: 'notifications-outline',
  },
  {
    id: 'suporte',
    title: 'Suporte',
    description: 'Fale com gente de verdade por chat ou WhatsApp.',
    icon: 'headset-outline',
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    description: 'Dados da barbearia, clientes bloqueados e informações da conta.',
    icon: 'settings-outline',
    href: '/configuracoes',
  },
];
