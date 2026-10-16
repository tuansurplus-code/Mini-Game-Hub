import "server-only";
import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "./supabase-admin";
export function getClientIp(request:Request) {
  const trusted=request.headers.get("x-vercel-forwarded-for");
  const forwarded=request.headers.get("x-forwarded-for");
  return (trusted||forwarded||request.headers.get("x-real-ip")||"unknown").split(",")[0].trim().slice(0,128);
}
export async function rateLimit(key:string,limit:number,windowMs:number) {
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret) throw new Error("Rate limiting unavailable");
  const digest=createHmac("sha256",secret).update("mgh:rate:v1:"+key).digest("hex");
  const {data,error}=await createSupabaseAdminClient().rpc("consume_request_rate_limit",{p_key:digest,p_limit:limit,p_window_ms:windowMs});
  if(error||typeof data?.allowed!=="boolean") { console.error("Shared rate limiter unavailable",error?.code); throw new Error("Rate limiting unavailable"); }
  return {allowed:data.allowed,retryAfter:Math.max(1,Number(data.retry_after)||1)};
}
export function tooManyRequests(retryAfter:number) {
  return new Response(JSON.stringify({error:"Too many requests. Please wait a moment and try again.",error_title:"Please Slow Down",error_code:"RATE_LIMITED"}),{status:429,headers:{"Content-Type":"application/json","Retry-After":String(retryAfter),"Cache-Control":"no-store"}});
}
