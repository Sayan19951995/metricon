import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
  proto,
} from '@whiskeysockets/baileys';
import { supabase } from './supabase.js';

/**
 * Baileys auth state adapter backed by Supabase.
 * Replaces useMultiFileAuthState — credentials survive Railway restarts/deploys.
 */
export async function useSupabaseAuthState(storeId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  // Load existing row
  const { data: row } = await supabase
    .from('whatsapp_sessions')
    .select('creds, keys')
    .eq('store_id', storeId)
    .single();

  const creds: AuthenticationCreds = row?.creds
    ? JSON.parse(JSON.stringify(row.creds), BufferJSON.reviver)
    : initAuthCreds();

  // keys stored as flat object: { "pre-key-1": <value>, "session-xxx": <value>, ... }
  let keysCache: Record<string, any> = row?.keys ?? {};

  const saveCreds = async () => {
    await supabase.from('whatsapp_sessions').upsert({
      store_id: storeId,
      creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
      keys: keysCache,
      updated_at: new Date().toISOString(),
    });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
        for (const id of ids) {
          const key = `${type}-${id}`;
          let value = keysCache[key] != null
            ? JSON.parse(JSON.stringify(keysCache[key]), BufferJSON.reviver)
            : undefined;
          if (value && type === 'app-state-sync-key') {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          result[id] = value;
        }
        return result;
      },

      set: async (data) => {
        let dirty = false;
        for (const category in data) {
          for (const id in (data as any)[category]) {
            const value = (data as any)[category][id];
            const key = `${category}-${id}`;
            if (value) {
              keysCache[key] = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
            } else {
              delete keysCache[key];
            }
            dirty = true;
          }
        }
        if (dirty) {
          await supabase.from('whatsapp_sessions').upsert({
            store_id: storeId,
            creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
            keys: keysCache,
            updated_at: new Date().toISOString(),
          });
        }
      },
    },
  };

  return { state, saveCreds };
}

/**
 * Remove all session data for a store from Supabase.
 */
export async function deleteSupabaseAuthState(storeId: string): Promise<void> {
  await supabase.from('whatsapp_sessions').delete().eq('store_id', storeId);
}

/**
 * Check whether credentials exist for a store.
 */
export async function hasSupabaseAuthState(storeId: string): Promise<boolean> {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('store_id')
    .eq('store_id', storeId)
    .not('creds', 'is', null)
    .single();
  return !!data;
}
