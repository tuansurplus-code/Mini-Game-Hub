"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Settings = {
  scratch_style: string;
  scratch_cover_color: string;
  scratch_cover_alt_color: string;
  scratch_card_background: string;
  scratch_card_border_color: string;
  scratch_card_border_thickness: number;
  scratch_card_radius: number;
  scratch_instruction: string;
  scratch_reveal_percent: number;
};

const defaults: Settings = {
  scratch_style: "classic",
  scratch_cover_color: "#6b7280",
  scratch_cover_alt_color: "#9ca3af",
  scratch_card_background: "#fff7ed",
  scratch_card_border_color: "#111827",
  scratch_card_border_thickness: 5,
  scratch_card_radius: 22,
  scratch_instruction: "SCRATCH HERE",
  scratch_reveal_percent: 50,
};

const presets = [
  { value:"classic", label:"Classic", description:"Traditional silver scratch card", cover:"#6b7280", alt:"#9ca3af", background:"#fff7ed", border:"#111827" },
  { value:"modern", label:"Modern", description:"Clean light finish", cover:"#94a3b8", alt:"#cbd5e1", background:"#f8fafc", border:"#64748b" },
  { value:"gold", label:"Gold", description:"Premium promotional look", cover:"#b68a2c", alt:"#d4a017", background:"#fff7d6", border:"#7c5b00" },
  { value:"bold", label:"Bold", description:"Strong high-impact card", cover:"#111827", alt:"#374151", background:"#fef2f2", border:"#e31b23" },
  { value:"custom", label:"Custom", description:"Use your own colors", cover:"#6b7280", alt:"#9ca3af", background:"#ffffff", border:"#111827" },
];

const hex=(v:unknown,f:string)=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v)?v:f;
const num=(v:unknown,f:number,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):f;
function parse(a:Record<string,unknown>):Settings{return{
  scratch_style:typeof a.scratch_style==="string"?a.scratch_style:defaults.scratch_style,
  scratch_cover_color:hex(a.scratch_cover_color,defaults.scratch_cover_color),
  scratch_cover_alt_color:hex(a.scratch_cover_alt_color,defaults.scratch_cover_alt_color),
  scratch_card_background:hex(a.scratch_card_background,defaults.scratch_card_background),
  scratch_card_border_color:hex(a.scratch_card_border_color,defaults.scratch_card_border_color),
  scratch_card_border_thickness:num(a.scratch_card_border_thickness,defaults.scratch_card_border_thickness,0,16),
  scratch_card_radius:num(a.scratch_card_radius,defaults.scratch_card_radius,0,40),
  scratch_instruction:typeof a.scratch_instruction==="string"?a.scratch_instruction:defaults.scratch_instruction,
  scratch_reveal_percent:num(a.scratch_reveal_percent,defaults.scratch_reveal_percent,20,90),
}}

export default function ScratchCustomization({campaignGameId}:{campaignGameId:string}){
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [isScratch,setIsScratch]=useState(false);
  const [base,setBase]=useState<Record<string,unknown>>({});
  const [settings,setSettings]=useState<Settings>(defaults);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{let tries=0;const find=()=>{const h=Array.from(document.querySelectorAll("h2")).find(n=>n.textContent?.trim()==="Customer View");const p=h?.closest(".admin-panel");if(p instanceof HTMLElement){setTarget(p);return true}return false};if(find())return;const t=window.setInterval(()=>{tries++;if(find()||tries>40)window.clearInterval(t)},100);return()=>window.clearInterval(t)},[]);
  useEffect(()=>{fetch(`/api/admin/campaign-games/${campaignGameId}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{const cg=data.campaignGame;const game=Array.isArray(cg?.games)?cg.games[0]:cg?.games;const type=String(game?.type||"").trim().toLowerCase().replace(/[\s_]+/g,"-");const scratch=type==="scratch"||type==="scratch-and-win";setIsScratch(scratch);if(scratch){const a=(cg?.appearance||{}) as Record<string,unknown>;setBase(a);setSettings(parse(a))}}).catch(()=>setMessage("Unable to load Scratch & Win customization."))},[campaignGameId]);

  function update<K extends keyof Settings>(key:K,value:Settings[K]){setSettings(c=>({...c,[key]:value}));setMessage("")}
  function selectPreset(value:string){const p=presets.find(x=>x.value===value);if(!p)return;setSettings(c=>value==="custom"?{...c,scratch_style:value}:{...c,scratch_style:value,scratch_cover_color:p.cover,scratch_cover_alt_color:p.alt,scratch_card_background:p.background,scratch_card_border_color:p.border});setMessage("")}
  async function save(){setSaving(true);setMessage("");try{const r=await fetch(`/api/admin/campaign-games/${campaignGameId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:{...base,...settings}})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Save failed.");const a=(data.campaignGame?.appearance||{...base,...settings}) as Record<string,unknown>;setBase(a);setSettings(parse(a));setMessage("Scratch customization saved.")}catch(e){setMessage(e instanceof Error?e.message:"Save failed.")}finally{setSaving(false)}}
  const colorField=(label:string,key:"scratch_cover_color"|"scratch_cover_alt_color"|"scratch_card_background"|"scratch_card_border_color")=><div><b>{label}</b><div style={{display:"flex",gap:8,marginTop:6}}><input type="color" value={settings[key]} onChange={e=>update(key,e.target.value)} style={{width:48,height:40}}/><input readOnly value={settings[key]} style={{width:"100%",padding:10,border:"1px solid #d1d5db",borderRadius:8,boxSizing:"border-box"}}/></div></div>;
  if(!target||!isScratch)return null;

  return createPortal(<div data-scratch-customization style={{marginTop:24,paddingTop:24,borderTop:"1px solid #e5e7eb"}}>
    <h3 style={{margin:"0 0 6px",fontSize:22}}>Scratch Card Customization</h3>
    <p style={{margin:"0 0 20px",color:"#6b7280"}}>Customize the customer scratch card. These settings only change appearance and reveal behavior; prize probability is unchanged.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(105px,1fr))",gap:10,overflowX:"auto",paddingBottom:4,marginBottom:22}}>{presets.map(p=><button key={p.value} type="button" onClick={()=>selectPreset(p.value)} style={{background:"#fff",border:settings.scratch_style===p.value?"2px solid #2563eb":"1px solid #d1d5db",borderRadius:10,padding:10,cursor:"pointer"}}><div style={{height:70,borderRadius:10,border:`4px solid ${p.border}`,background:`repeating-linear-gradient(135deg,${p.cover} 0 18px,${p.alt} 18px 36px)`,marginBottom:8}}/><b>{p.label}</b><div style={{fontSize:11,color:"#6b7280",marginTop:3}}>{p.description}</div></button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:16}}>
      {colorField("Scratch Cover Color","scratch_cover_color")}{colorField("Scratch Highlight Color","scratch_cover_alt_color")}{colorField("Card Background","scratch_card_background")}{colorField("Card Border Color","scratch_card_border_color")}
      <div><b>Border Thickness ({settings.scratch_card_border_thickness}px)</b><input type="range" min={0} max={16} value={settings.scratch_card_border_thickness} onChange={e=>update("scratch_card_border_thickness",Number(e.target.value))} style={{width:"100%"}}/></div>
      <div><b>Corner Radius ({settings.scratch_card_radius}px)</b><input type="range" min={0} max={40} value={settings.scratch_card_radius} onChange={e=>update("scratch_card_radius",Number(e.target.value))} style={{width:"100%"}}/></div>
      <div><b>Reveal At ({settings.scratch_reveal_percent}%)</b><input type="range" min={20} max={90} step={5} value={settings.scratch_reveal_percent} onChange={e=>update("scratch_reveal_percent",Number(e.target.value))} style={{width:"100%"}}/><small style={{color:"#6b7280"}}>Percentage of the scratch surface the customer must clear before the full result is revealed.</small></div>
      <div><b>Scratch Instruction</b><input value={settings.scratch_instruction} maxLength={40} onChange={e=>update("scratch_instruction",e.target.value)} style={{width:"100%",padding:10,border:"1px solid #d1d5db",borderRadius:8,boxSizing:"border-box",marginTop:6}}/></div>
    </div>
    <div style={{marginTop:24,padding:20,border:"1px solid #e5e7eb",borderRadius:12,background:"#f9fafb",textAlign:"center"}}><b>Live Scratch Card Preview</b><div style={{position:"relative",width:"min(100%,420px)",height:220,margin:"16px auto 0",overflow:"hidden",borderRadius:settings.scratch_card_radius,border:`${settings.scratch_card_border_thickness}px solid ${settings.scratch_card_border_color}`,background:settings.scratch_card_background}}><div style={{position:"absolute",inset:0,background:`repeating-linear-gradient(135deg,${settings.scratch_cover_color} 0 24px,${settings.scratch_cover_alt_color} 24px 48px)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:22,textShadow:"0 2px 4px rgba(0,0,0,.35)"}}>{settings.scratch_instruction||"SCRATCH HERE"}</div></div></div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginTop:18}}><button type="button" onClick={save} disabled={saving} style={{border:0,borderRadius:8,padding:"11px 18px",background:"#111827",color:"#fff",fontWeight:700,cursor:"pointer",opacity:saving?.65:1}}>{saving?"Saving...":"Save Scratch Customization"}</button>{message&&<span style={{fontSize:14,color:message.includes("saved")?"#166534":"#b91c1c"}}>{message}</span>}</div>
  </div>,target);
}
