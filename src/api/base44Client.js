import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

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
  console.log("Base44 down, fallback active");
  client = null;
}

export const base44 = client || {
  auth: { me: async () => null, logout: async () => {} },
  entities: new Proxy({}, { get: () => ({ list: async () => [], get: async () => null, create: async () => null }) }),
  functions: new Proxy({}, { get: () => async () => ({ data: null }) })
};

export const isBase44Down = !client;
