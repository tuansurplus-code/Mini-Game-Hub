import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import SpinAndWinGame from "../../../components/games/SpinAndWinGame";

type PageProps = { params: Promise<{ slug: string }> };
type Campaign = { id:string; name:string; status:string; starts_at:string|null; ends_at:string|null };
type Game = { id:string; name:string; type:string; description:string|null };
type CampaignGame = { id:string; public_slug:string; status:string; appearance:Record<string,unknown>|null; rules:Record<string,unknown>|null; campaigns:Campaign|Campaign[]|null; games:Game|Game[]|null };
type Prize = { id:string; name:string; description:string|null; image_url:string|null; weight:number; inventory:number|null; active:boolean; metadata:Record<string,unknown>|null };
type AppearanceSettings = { title:string; subtitle:string; button_text:string; page_background_color:string; button_color:string; button_text_color:string };
type CustomerDetailMode = "off"|"optional"|"required";
type CustomerDetailsSettings = { name:CustomerDetailMode; email:CustomerDetailMode; address:CustomerDetailMode };

const defaultAppearance:AppearanceSettings={title:"SPIN & WIN",subtitle:"Spin daily and win exciting rewards!",button_text:"SPIN NOW",page_background_color:"#ffffff",button_color:"#e31b23",button_text_color:"#ffffff"};
function getSingleRecord<T>(value:T|T[]|null):T|null { return Array.isArray(value)?value[0]??null:value; }
function getAppearance(a:Record<string,unknown>|null):AppearanceSettings { if(!a)return defaultAppearance; return {title:typeof a.title==="string"?a.title:defaultAppearance.title,subtitle:typeof a.subtitle==="string"?a.subtitle:defaultAppearance.subtitle,button_text:typeof a.button_text==="string"?a.button_text:defaultAppearance.button_text,page_background_color:typeof a.page_background_color==="string"?a.page_background_color:defaultAppearance.page_background_color,button_color:typeof a.button_color==="string"?a.button_color:defaultAppearance.button_color,button_text_color:typeof a.button_text_color==="string"?a.button_text_color:defaultAppearance.button_text_color}; }
function getCustomerDetails(r:Record<string,unknown>|null):CustomerDetailsSettings { const raw=r?.customer_details; const d=typeof raw==="object"&&raw!==null&&!Array.isArray(raw)?raw as Record<string,unknown>:{}; const mode=(v:unknown):CustomerDetailMode=>v==="optional"||v==="required"?v:"off"; return {name:mode(d.name),email:mode(d.email),address:mode(d.address)}; }

export default async function PlayGamePage({params}:PageProps){
  const {slug}=await params; if(!slug)notFound();
  const supabase=await createSupabaseServerClient();
  const {data:campaignGame,error}=await supabase.from("campaign_games").select(`id,public_slug,status,appearance,rules,campaigns!inner(id,name,status,starts_at,ends_at),games!inner(id,name,type,description)`).eq("public_slug",slug).eq("status","published").maybeSingle();
  if(error||!campaignGame){if(error)console.error("Load public campaign game error:",error);notFound();}
  const typedCampaignGame=campaignGame as CampaignGame;
  const campaign=getSingleRecord(typedCampaignGame.campaigns); const game=getSingleRecord(typedCampaignGame.games); if(!campaign||!game)notFound();
  const now=new Date(); const startsAt=campaign.starts_at?new Date(campaign.starts_at):null; const endsAt=campaign.ends_at?new Date(campaign.ends_at):null;
  if(!(campaign.status==="active"&&(!startsAt||startsAt<=now)&&(!endsAt||endsAt>=now)))notFound();
  const {data:prizes,error:prizesError}=await supabase.from("prizes").select(`id,name,description,image_url,weight,inventory,active,metadata`).eq("campaign_game_id",typedCampaignGame.id).eq("active",true).order("created_at",{ascending:true});
  if(prizesError){console.error("Load public game prizes error:",prizesError);notFound();}
  return <SpinAndWinGame slug={typedCampaignGame.public_slug} gameName={game.name} prizes={(prizes??[]) as Prize[]} appearance={getAppearance(typedCampaignGame.appearance)} customerDetails={getCustomerDetails(typedCampaignGame.rules)}/>;
}
