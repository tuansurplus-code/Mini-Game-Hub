import { createSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { readJsonBody,RequestBodyError } from "../../../../../lib/request-body";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase-server";
import { getClientIp,rateLimit,tooManyRequests } from "../../../../../lib/rate-limit";
type RouteContext={params:Promise<{slug:string}>};
function normalizeSriLankanMobile(mobile:string){const cleaned=mobile.trim().replace(/\s+/g,"");if(/^07\d{8}$/.test(cleaned))return`+94${cleaned.slice(1)}`;if(/^947\d{8}$/.test(cleaned))return`+${cleaned}`;if(/^\+947\d{8}$/.test(cleaned))return cleaned;return null}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):null}
export async function POST(request:Request,context:RouteContext){
 try{
  const{slug}=await context.params;if(!slug||slug.length>160)return NextResponse.json({error:"Invalid prize claim request."},{status:400});
  const ipLimit=await rateLimit(`claim:ip:${getClientIp(request)}`,15,60_000);if(!ipLimit.allowed)return tooManyRequests(ipLimit.retryAfter);
  const contentLength=Number(request.headers.get("content-length")||0);if(contentLength>8192)return NextResponse.json({error:"Request is too large."},{status:413});
  let body:Record<string,unknown>;try{body=await readJsonBody(request,8192) as Record<string,unknown>}catch(e){return NextResponse.json({error:"Invalid prize claim request."},{status:e instanceof RequestBodyError?e.status:400})}
  const mobileE164=normalizeSriLankanMobile(typeof body.mobile==="string"?body.mobile:"");const sessionId=typeof body.session_id==="string"?body.session_id:"";const winnerId=typeof body.winner_id==="string"?body.winner_id:"";
  if(!mobileE164||!sessionId||!winnerId||sessionId.length>64||winnerId.length>64)return NextResponse.json({error:"Invalid prize claim request."},{status:400});
  const mobileLimit=await rateLimit(`claim:mobile:${slug}:${mobileE164}`,8,60_000);if(!mobileLimit.allowed)return tooManyRequests(mobileLimit.retryAfter);
  const supabase=await createSupabaseServerClient();const{data:campaignGame,error:gameError}=await supabase.from("campaign_games").select("id").eq("public_slug",slug).eq("status","published").maybeSingle();if(gameError||!campaignGame)return NextResponse.json({error:"Game not found."},{status:404});
  const{data,error}=await createSupabaseAdminClient().rpc("claim_prize",{p_session_id:sessionId,p_winner_id:winnerId,p_mobile_e164:mobileE164,p_name:clean(body.name,120),p_email:clean(body.email,254),p_address:clean(body.address,500),p_campaign_game_id:campaignGame.id});
  if(error){console.error("Prize claim RPC error:",error.code);return NextResponse.json({error:"Unable to claim the prize. Check your details and try again."},{status:400})}
  return NextResponse.json({result:data},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Prize claim API error:",error);return NextResponse.json({error:"Unable to process the prize claim."},{status:500})}
}
