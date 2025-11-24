export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string;
  responsible: string;
  start_date: string;
  end_date: string;
  status: 'Pendente' | 'Andamento' | 'Análise' | 'Concluído' | 'Cancelado';
  process: string;
  result: string;
  notes: string[] | null;
  image_url?: string | null;
  images?: string[] | null;
  created_at: string;
}

export type ServiceStatus = Service['status'];

export const STATUS_OPTIONS: ServiceStatus[] = [
  'Pendente',
  'Andamento',
  'Análise',
  'Concluído',
  'Cancelado'
];