// Trusted Types policy for the built page, whose CSP says
// `require-trusted-types-for 'script'; trusted-types default`.
//
// With that CSP, assigning a plain string to a DOM injection sink (innerHTML,
// script src, new Worker(url)…) throws unless a policy converts it. The only
// conversion this app needs is the blob: URL of its own inline parse worker,
// so that is all the default policy allows. It defines no createHTML or
// createScript: any attempt to inject HTML or script text is blocked.

interface TrustedTypePolicyFactory {
  createPolicy(name: string, rules: { createScriptURL?: (url: string) => string }): unknown;
}

const factory = (globalThis as { trustedTypes?: TrustedTypePolicyFactory }).trustedTypes;

if (factory) {
  try {
    factory.createPolicy("default", {
      createScriptURL: (url) => {
        if (url.startsWith("blob:")) return url;
        throw new TypeError(`Blocked script URL: ${url.slice(0, 40)}`);
      },
    });
  } catch {
    /* already created (hot reload) */
  }
}
