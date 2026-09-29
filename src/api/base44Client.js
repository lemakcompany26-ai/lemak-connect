import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabase } from './fallback-backend';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

let client;

try {
  client = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    appBaseUrl
  });
} catch (e) {
  console.error("Base44 init failed, using supabase fallback");
  client = null;
}

// SAFE wrapper - never brakes
export const base44 = new Proxy(client || {}, {
  get(target, prop) {
    if (target && target[prop]) return target[prop];

    // Fallback to supabase if base44 fails
    console.warn(`Using fallback for ${prop}`);
    return supabase;
  }
});

// Export a hook to check status
export const useBackendStatus = () => {
  return {
    isBase44:!!client,
    isFallback:!client
  }
};
