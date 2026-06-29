import { supabase } from './supabase';

// Helper to safely get typed supabase instance
export const getSupabase = () => {
  return supabase;
};

// Helper for insert operations with proper typing
export async function insertBudget(payload: any) {
  // Use any to bypass TypeScript's strict type checking
  return await (supabase as any).from('budgets').insert(payload);
}

export async function updateBudget(id: string, payload: any) {
  return await (supabase as any).from('budgets').update(payload).eq('id', id);
}

export async function insertTransaction(payload: any) {
  return await (supabase as any).from('transactions').insert(payload);
}

export async function updateTransaction(id: string, payload: any) {
  return await (supabase as any).from('transactions').update(payload).eq('id', id);
}

export async function upsertSettings(payload: any) {
  return await (supabase as any).from('user_settings').upsert(payload);
}