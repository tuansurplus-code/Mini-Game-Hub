import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type PublicPrize = { id:string; name:string; description:string|null; image_url:string|null; weight:number; inventory:number|null; active:boolean; metadata:{segment_color?:string} };
export async function getPublicGamePrizes(db:SupabaseClient, gameId:string):Promise<PublicPrize[]> {
  const {data,error}=await db.rpc("get_public_game_prizes",{p_campaign_game_id:gameId});
  if(error) { console.error("Public prize list unavailable",error.code); throw new Error("Prizes unavailable"); }
  return (Array.isArray(data)?data:[]).map(row=>({id:row.id,name:row.name,description:row.description,image_url:row.image_url,weight:Number(row.weight),inventory:row.inventory,active:true,metadata: typeof row.metadata?.segment_color==="string" && /^#[0-9a-f]{6}$/i.test(row.metadata.segment_color)?{segment_color:row.metadata.segment_color}:{}}));
}
