"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Align = "left" | "center" | "right";
type LandingSettings = {
  subtitle?: string; background_color?: string; card_background_color?: string; text_color?: string; button_color?: string; button_text_color?: string;
  title_bold?: boolean; title_italic?: boolean; title_underline?: boolean; title_align?: Align; title_font_size?: number; title_color?: string; title_font_family?: string;
  subtitle_bold?: boolean; subtitle_italic?: boolean; subtitle_underline?: boolean; subtitle_align?: Align; subtitle_font_size?: number; subtitle_color?: string; subtitle_font_family?: string;
  logo_url?: string; logo_align?: Align; logo_width?: number; logo_visible?: boolean;
};
type Props = { campaignId: string; campaignName?: string; settings: LandingSettings };

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "System UI", value: "system-ui, sans-serif" },
];
const fieldStyle = { width: "100%", padding: "9px 10px", border: "1px solid #ddd", borderRadius: 8 };
const toolButton = (active: boolean) => ({ padding: "8px 11px", border: `1px solid ${active ? "#111827" : "#ddd"}`, borderRadius: 7, background: active ? "#111827" : "#fff", color: active ? "#fff" : "#222", cursor: "pointer" });

export default function CampaignLandingSettings({ campaignId, campaignName = "Campaign Name", settings }: Props) {
  const router = useRouter();
  const [subtitle, setSubtitle] = useState(settings.subtitle ?? "Choose a game and play for your chance to win exciting rewards.");
  const [backgroundColor, setBackgroundColor] = useState(settings.background_color ?? "#f4f6f8");
  const [cardBackgroundColor, setCardBackgroundColor] = useState(settings.card_background_color ?? "#ffffff");
  const [buttonColor, setButtonColor] = useState(settings.button_color ?? "#e31b23");
  const [buttonTextColor, setButtonTextColor] = useState(settings.button_text_color ?? "#ffffff");
  const [titleBold, setTitleBold] = useState(settings.title_bold ?? true); const [titleItalic, setTitleItalic] = useState(settings.title_italic ?? false); const [titleUnderline, setTitleUnderline] = useState(settings.title_underline ?? false); const [titleAlign, setTitleAlign] = useState<Align>(settings.title_align ?? "center"); const [titleFontSize, setTitleFontSize] = useState(settings.title_font_size ?? 54); const [titleColor, setTitleColor] = useState(settings.title_color ?? settings.text_color ?? "#111827"); const [titleFontFamily, setTitleFontFamily] = useState(settings.title_font_family ?? "Arial, sans-serif");
  const [subtitleBold, setSubtitleBold] = useState(settings.subtitle_bold ?? false); const [subtitleItalic, setSubtitleItalic] = useState(settings.subtitle_italic ?? false); const [subtitleUnderline, setSubtitleUnderline] = useState(settings.subtitle_underline ?? false); const [subtitleAlign, setSubtitleAlign] = useState<Align>(settings.subtitle_align ?? "center"); const [subtitleFontSize, setSubtitleFontSize] = useState(settings.subtitle_font_size ?? 17); const [subtitleColor, setSubtitleColor] = useState(settings.subtitle_color ?? settings.text_color ?? "#111827"); const [subtitleFontFamily, setSubtitleFontFamily] = useState(settings.subtitle_font_family ?? "Arial, sans-serif");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? ""); const [logoAlign, setLogoAlign] = useState<Align>(settings.logo_align ?? "center"); const [logoWidth, setLogoWidth] = useState(settings.logo_width ?? 160); const [logoVisible, setLogoVisible] = useState(settings.logo_visible ?? true);
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/landing`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subtitle: subtitle.trim(), background_color: backgroundColor, card_background_color: cardBackgroundColor, button_color: buttonColor, button_text_color: buttonTextColor, title_bold: titleBold, title_italic: titleItalic, title_underline: titleUnderline, title_align: titleAlign, title_font_size: titleFontSize, title_color: titleColor, title_font_family: titleFontFamily, subtitle_bold: subtitleBold, subtitle_italic: subtitleItalic, subtitle_underline: subtitleUnderline, subtitle_align: subtitleAlign, subtitle_font_size: subtitleFontSize, subtitle_color: subtitleColor, subtitle_font_family: subtitleFontFamily, logo_url: logoUrl.trim(), logo_align: logoAlign, logo_width: logoWidth, logo_visible: logoVisible }) });
      const result = await response.json(); if (!response.ok) { setError(result.error || "Failed to save landing page settings."); setSaving(false); return; }
      setMessage("Landing page settings saved."); setSaving(false); router.refresh();
    } catch { setError("Unable to save landing page settings."); setSaving(false); }
  }

  const colorField = (label: string, value: string, setter: (v:string)=>void) => <label style={{display:"grid",gap:6,fontSize:13,fontWeight:600}}>{label}<div style={{display:"flex",gap:8}}><input type="color" value={value} onChange={e=>setter(e.target.value)} style={{width:44,height:38}}/><input value={value} onChange={e=>setter(e.target.value)} style={fieldStyle}/></div></label>;
  const formatControls = (bold:boolean,setBold:(v:boolean)=>void,italic:boolean,setItalic:(v:boolean)=>void,underline:boolean,setUnderline:(v:boolean)=>void,align:Align,setAlign:(v:Align)=>void,size:number,setSize:(v:number)=>void,color:string,setColor:(v:string)=>void,fontFamily:string,setFontFamily:(v:string)=>void) => <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><button type="button" style={toolButton(bold)} onClick={()=>setBold(!bold)}><b>B</b></button><button type="button" style={toolButton(italic)} onClick={()=>setItalic(!italic)}><i>I</i></button><button type="button" style={toolButton(underline)} onClick={()=>setUnderline(!underline)}><u>U</u></button>{(["left","center","right"] as Align[]).map(a=><button key={a} type="button" style={toolButton(align===a)} onClick={()=>setAlign(a)}>{a==="left"?"⇤":a==="center"?"↔":"⇥"}</button>)}<label style={{fontSize:12}}>Font <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)} style={{...fieldStyle,width:155,marginLeft:5,fontFamily}}>{FONT_OPTIONS.map(font=><option key={font.value} value={font.value} style={{fontFamily:font.value}}>{font.label}</option>)}</select></label><label style={{fontSize:12}}>Size <input type="number" min={10} max={96} value={size} onChange={e=>setSize(Number(e.target.value))} style={{...fieldStyle,width:72,marginLeft:5}}/></label><input aria-label="Text color" type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width:42,height:38}}/></div>;

  return <form onSubmit={handleSubmit} style={{marginTop:18}}><div style={{display:"grid",gap:20}}>
    <div><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Campaign Name Display</div><div style={{padding:"12px",border:"1px solid #eee",borderRadius:9,marginBottom:10,color:titleColor,fontSize:Math.min(titleFontSize,40),fontWeight:titleBold?700:400,fontStyle:titleItalic?"italic":"normal",textDecoration:titleUnderline?"underline":"none",textAlign:titleAlign,fontFamily:titleFontFamily}}>{campaignName}</div>{formatControls(titleBold,setTitleBold,titleItalic,setTitleItalic,titleUnderline,setTitleUnderline,titleAlign,setTitleAlign,titleFontSize,setTitleFontSize,titleColor,setTitleColor,titleFontFamily,setTitleFontFamily)}</div>
    <div><label style={{display:"grid",gap:6,fontSize:13,fontWeight:700}}>Campaign Subtitle<textarea value={subtitle} onChange={e=>setSubtitle(e.target.value)} maxLength={500} rows={3} style={{...fieldStyle,resize:"vertical",fontFamily:subtitleFontFamily}}/></label><div style={{marginTop:9}}>{formatControls(subtitleBold,setSubtitleBold,subtitleItalic,setSubtitleItalic,subtitleUnderline,setSubtitleUnderline,subtitleAlign,setSubtitleAlign,subtitleFontSize,setSubtitleFontSize,subtitleColor,setSubtitleColor,subtitleFontFamily,setSubtitleFontFamily)}</div></div>
    <div><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Campaign Logo</div><label style={{display:"grid",gap:6,fontSize:12}}>Logo URL<input type="url" placeholder="https://.../logo.png" value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} style={fieldStyle}/></label><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:10}}><label style={{fontSize:13}}><input type="checkbox" checked={logoVisible} onChange={e=>setLogoVisible(e.target.checked)}/> Show logo</label>{(["left","center","right"] as Align[]).map(a=><button key={a} type="button" style={toolButton(logoAlign===a)} onClick={()=>setLogoAlign(a)}>Logo {a}</button>)}<label style={{fontSize:12}}>Width <input type="number" min={40} max={500} value={logoWidth} onChange={e=>setLogoWidth(Number(e.target.value))} style={{...fieldStyle,width:80,marginLeft:5}}/> px</label></div>{logoUrl&&logoVisible&&<div style={{textAlign:logoAlign,marginTop:12}}><img src={logoUrl} alt="Campaign logo preview" style={{width:logoWidth,maxWidth:"100%",height:"auto"}}/></div>}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>{colorField("Page Background",backgroundColor,setBackgroundColor)}{colorField("Game Card Background",cardBackgroundColor,setCardBackgroundColor)}{colorField("Play Button",buttonColor,setButtonColor)}{colorField("Button Text",buttonTextColor,setButtonTextColor)}</div>
  </div>{error&&<div style={{marginTop:12,color:"#b91c1c",fontSize:13}}>{error}</div>}{message&&<div style={{marginTop:12,color:"#166534",fontSize:13}}>{message}</div>}<button type="submit" disabled={saving} className="primary-btn" style={{marginTop:18}}>{saving?"Saving...":"Save Landing Page"}</button></form>;
}
