import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

let client = null;
let error = null;

try {
  client = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    appBaseUrl
  });
} catch (e) {
  console.warn("Base44 down - using fallback mode", e);
  error = e;
  client = null;
}

// Safe export - app never brakes
export const base44 = client || {
  auth: {
    me: async () => null,
    logout: async () => {}
  },
  entities: {},
  functions: {},
  integrations: {}
};

export const isBase44Active = !!client;
export const base44Error = error;

export default base44;
