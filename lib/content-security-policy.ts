export function contentSecurityPolicy(nonce:string,development=false){
 return ["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${development?" 'unsafe-eval'":""}`,"style-src 'self' 'unsafe-inline' https:","img-src 'self' https: data: blob:","font-src 'self' https: data:","connect-src 'self' https: wss:","frame-src https:","worker-src 'self' blob:","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'",...(development?[]:["upgrade-insecure-requests"])].join("; ");
}
