import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { getClientIp,rateLimit,tooManyRequests } from "../../../../lib/rate-limit";

type RouteContext={params:Promise<{slug:string}>};
function normalizeSriLankanMobile(mobile:string){const cleaned=mobile.trim().replace(/\s+/g,"");if(/^07\d{8}$/.test(cleaned))return`+94${cleaned.slice(1)}`;if(/^947\d{8}$/.test(cleaned))return`+${cleaned}`;if(/^\+947\d{8}$/.test(cleaned))return cleaned;return null}
function getFriendlyPlayError(message:string){const n=message.toLowerCase();if(n.includes("already played today"))return{code:"ALREADY_PLAYED_TODAY",title:"Already Played Today",message:"You have already played today. Please come back tomorrow for another chance to win."};if(n.includes("already played this campaign"))return{code:"ALREADY_PLAYED_CAMPAIGN",title:"Play Already Used",message:"This mobile number has already played this campaign."};if(n.includes("winning limit reached"))return{code:"WINNING_LIMIT_REACHED",title:"Winning Limit Reached",message:"You have reached the maximum number of prizes available to this mobile number."};if(n.includes("no prizes are currently available"))return{code:"NO_PRIZES_AVAILABLE",title:"Prizes Unavailable",message:"No prizes are currently available. Please try again later."};if(n.includes("prize inventory changed"))return{code:"PRIZE_INVENTORY_CHANGED",title:"Please Try Again",message:"Prize availability changed while processing your play. Please try again."};return{code:"PLAY_ERROR",title:"Unable to Play",message:"Unable to play the game. Please try again."}}
export async function POST(request:Request,context:RouteContext){
 try{
  const{slug}=await context.params;if(!slug||slug.length>160)return NextResponse.json({error:"Invalid game request."},{status:400});
  const ip=getClientIp(request);const ipLimit=rateLimit(`play:ip:${ip}`,12,60_000);if(!ipLimit.allowed)return tooManyRequests(ipLimit.retryAfter);
  const contentLength=Number(request.headers.get("content-length")||0);if(contentLength>4096)return NextResponse.json({error:"Request is too large."},{status:413});
  let body:Record<string,unknown>;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
  const mobile=typeof body.mobile==="string"?body.mobile:"";const mobileE164=normalizeSriLankanMobile(mobile);if(!mobileE164)return NextResponse.json({error:"Please enter a valid Sri Lankan mobile number."},{status:400});
  const mobileLimit=rateLimit(`play:mobile:${slug}:${mobileE164}`,5,60_000);if(!mobileLimit.allowed)return tooManyRequests(mobileLimit.retryAfter);
  const supabase=await createSupabaseServerClient();const{data:campaignGame,error}=await supabase.from("campaign_games").select(`id,public_slug,status,campaigns!inner(id,status,starts_at,ends_at)`).eq("public_slug",slug).eq("status","published").maybeSingle();
  if(error){console.error("Load public campaign game error:",error);return NextResponse.json({error:"Unable to load the game."},{status:500})}if(!campaignGame)return NextResponse.json({error:"Game not found."},{status:404});
  const cv=campaignGame.campaigns;const campaign=Array.isArray(cv)?cv[0]:cv;if(!campaign)return NextResponse.json({error:"Campaign information is unavailable."},{status:404});
  const now=new Date(),startsAt=campaign.starts_at?new Date(campaign.starts_at):null,endsAt=campaign.ends_at?new Date(campaign.ends_at):null;if(!(campaign.status==="active"&&(!startsAt||startsAt<=now)&&(!endsAt||endsAt>=now)))return NextResponse.json({error:"This game is not currently available."},{status:409});
  const{data:result,error:playError}=await supabase.rpc("play_spin",{p_campaign_game_id:campaignGame.id,p_mobile_e164:mobileE164,p_request_id:crypto.randomUUID()});
  if(playError){console.error("Secure play RPC error:",playError.code);const f=getFriendlyPlayError(playError.message||"");return NextResponse.json({error:f.message,error_title:f.title,error_code:f.code},{status:400})}
  return NextResponse.json({result},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Public play API error:",error);return NextResponse.json({error:"Unable to process the game play."},{status:500})}
}
