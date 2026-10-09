"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const fieldStyle = { width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: "9px", marginBottom: "18px", fontSize: "15px", boxSizing: "border-box" as const };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/onboarding"); router.refresh();
  }

  return <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f6f7f9",padding:20}}>
    <div style={{width:"100%",maxWidth:420,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:32,boxShadow:"0 10px 30px rgba(0,0,0,.06)"}}>
      <p style={{fontSize:11,letterSpacing:".12em",fontWeight:800,color:"#7b8492",marginBottom:8}}>MINI-GAME HUB</p>
      <h1 style={{margin:0,fontSize:28}}>Welcome back</h1>
      <p style={{color:"#697386",marginTop:8,marginBottom:28}}>Sign in to manage your campaigns and games.</p>
      {error && <div style={{background:"#fff0f0",border:"1px solid #ffd0d0",color:"#a11",padding:"12px 14px",borderRadius:10,marginBottom:18,fontSize:14}}>{error}</div>}
      <form onSubmit={handleLogin}>
        <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:8}}>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" style={fieldStyle}/>
        <label style={{display:"block",fontSize:14,fontWeight:700,marginBottom:8}}>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" style={{...fieldStyle,marginBottom:8}}/>
        <div style={{textAlign:"right",marginBottom:20}}><Link href="/forgot-password" style={{fontSize:13,color:"#374151"}}>Forgot password?</Link></div>
        <button type="submit" disabled={loading} style={{width:"100%",border:0,borderRadius:9,padding:"13px 16px",background:"#111827",color:"#fff",fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?.7:1}}>{loading?"Signing in...":"Sign In"}</button>
      </form>
      <p style={{textAlign:"center",fontSize:14,color:"#697386",margin:"22px 0 0"}}>New to Mini-Game Hub? <Link href="/signup" style={{fontWeight:700,color:"#111827"}}>Create an account</Link></p>
    </div>
  </main>;
}
