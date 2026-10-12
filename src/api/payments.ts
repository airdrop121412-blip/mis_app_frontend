import apiClient from './client';

export interface PaymentRegisterRow {
  affected_person_id: number;
  hh_id: string | null;
  ep_id: string | null;
  name: string;
  father_name: string | null;
  nid_number: string;
  mobile: string;
  mouza: string | null;
  union_name: string | null;
  upazila: string | null;
  district: string | null;
  category_of_loss: string | null;
  compensation_amount: string;
  status: 'PAID' | 'PAID & ADDITIONAL';
  has_additional?: boolean;
}

export async function listPaymentRegister(params: {
  project_id?: number;
  q?: string;
} = {}): Promise<PaymentRegisterRow[]> {
  const { data } = await apiClient.get('/payments', { params });
  return data.data ?? data;
}
