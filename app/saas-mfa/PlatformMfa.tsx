"use client";
import { useEffect,useState,type FormEvent } from "react";
import { platformSupabase } from "../../lib/supabase-platform";
type Factor={id:string;friendly_name?:string};
export default function PlatformMfa(){
 const[factors,setFactors]=useState<Factor[]>([]),[factorId,setFactorId]=useState(""),[qr,setQr]=useState(""),[secret,setSecret]=useState(""),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let active=true;platformSupabase.auth.mfa.listFactors().then(({data,error})=>{if(!active)return;if(error)setError("Unable to load authentication methods. Please reload.");else{const verified=data.totp.filter(f=>f.status==="verified");setFactors(verified);setFactorId(verified[0]?.id??"");}setReady(true);}).catch(()=>{if(active){setError("Unable to load authentication methods. Please reload.");setReady(true);}});return()=>{active=false};},[]);
 async function enroll(){setBusy(true);setError("");try{
   const listed=await platformSupabase.auth.mfa.listFactors();if(listed.error)throw listed.error;
   // Remove only unfinished enrollments; verified authenticators are never removed here.
   for(const f of listed.data.all.filter(f=>f.factor_type==="totp"&&f.status==="unverified")){const removed=await platformSupabase.auth.mfa.unenroll({factorId:f.id});if(removed.error)throw removed.error;}
   const {data,error}=await platformSupabase.auth.mfa.enroll({factorType:"totp",issuer:"Mini Game Hub",friendlyName:"SaaS Admin Authenticator"});if(error)throw error;
   setFactorId(data.id);setQr(data.totp.qr_code.startsWith("data:")?data.totp.qr_code:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`);setSecret(data.totp.secret);
 }catch{setError("Unable to start setup. Please try again.");}finally{setBusy(false);}}
 async function verify(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!/^\d{6}$/.test(code)||!factorId)return;setBusy(true);setError("");try{const result=await platformSupabase.auth.mfa.challengeAndVerify({factorId,code});if(result.error)throw result.error;setSecret("");setQr("");window.location.replace("/saas-admin");}catch{setError("The code was not accepted. Enter the current code from your authenticator.");setCode("");setBusy(false);}}
 async function signOut(){setBusy(true);const{error}=await platformSupabase.auth.signOut({scope:"local"});if(error){setError("Unable to sign out. Please retry.");setBusy(false);return;}window.location.replace("/saas-login");}
 return <main style={{minHeight:"100dvh",display:"grid",placeItems:"center",background:"#0f172a",padding:20}}><section style={{width:"100%",maxWidth:460,background:"white",color:"#111827",borderRadius:18,padding:28}}>
 <p style={{fontWeight:800,fontSize:12,letterSpacing:".1em"}}>MINI GAME HUB · SAAS ADMIN</p><h1>Two-factor authentication</h1><p style={{lineHeight:1.6}}>An authenticator code is required to open the platform administration area.</p>
 {!ready&&<p role="status">Loading authentication methods…</p>}{error&&<p role="alert" style={{color:"#991b1b",background:"#fef2f2",padding:12}}>{error}</p>}
 {ready&&!factorId&&<button type="button" onClick={enroll} disabled={busy} style={{padding:14,width:"100%"}}>Set up authenticator</button>}
 {qr&&<><p>Scan this QR code using your authenticator app, then enter its six-digit code.</p><img src={qr} alt="Authenticator setup QR code" width={240} height={240} style={{display:"block",maxWidth:"100%",height:"auto",margin:"auto"}}/><details><summary>Enter setup key manually</summary><code style={{display:"block",overflowWrap:"anywhere",padding:12}}>{secret}</code></details><p>Keep the authenticator entry on your device. Store a secure backup using your authenticator app.</p></>}
 {factorId&&<form onSubmit={verify} style={{display:"grid",gap:14,marginTop:20}}>{factors.length>1&&<label>Authenticator<select value={factorId} onChange={e=>setFactorId(e.target.value)}>{factors.map(f=><option key={f.id} value={f.id}>{f.friendly_name||"Authenticator"}</option>)}</select></label>}<label htmlFor="mfa-code">Authenticator code</label><input id="mfa-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required style={{padding:14,fontSize:22,letterSpacing:".2em",minWidth:0}}/><button disabled={busy||code.length!==6} style={{padding:14,background:"#111827",color:"white",borderRadius:8}}>{busy?"Checking…":"Verify and continue"}</button></form>}
 <button type="button" disabled={busy} onClick={signOut} style={{padding:12,marginTop:18,width:"100%"}}>Sign out</button></section></main>;
}
