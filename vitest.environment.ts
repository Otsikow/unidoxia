import { builtinEnvironments } from 'vitest/environments';

export default {
  name: 'jsdom',
  transformMode: 'web',
  async setup(global, options) {
    // jsdom supplies AbortController/AbortSignal but no Request. Keep Node's
    // matching constructors together: undici rejects jsdom signals on Node 24.
    const { Request, AbortController, AbortSignal } = global;
    const environment = await builtinEnvironments.jsdom.setup(global, options);
    Object.assign(global, { Request, AbortController, AbortSignal });
    return environment;
  },
} satisfies typeof builtinEnvironments.jsdom;
