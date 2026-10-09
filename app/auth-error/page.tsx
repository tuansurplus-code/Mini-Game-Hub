"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const params = useSearchParams();
  const code = params.get("error_code") || "";
  const description = params.get("error_description") || "";
  const expired = code === "otp_expired" || /expired|invalid/i.test(description);

  return (
    <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f6f7f9",padding:20}}>
      <div style={{width:"100%",maxWidth:460,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:32,boxShadow:"0 10px 30px rgba(0,0,0,.06)"}}>
        <p style={{fontSize:11,letterSpacing:".12em",fontWeight:800,color:"#7b8492",marginBottom:8}}>MINI-GAME HUB</p>
        <h1 style={{margin:"0 0 12px",fontSize:28}}>{expired ? "Password reset link expired" : "We couldn't verify this link"}</h1>
        <p style={{color:"#697386",lineHeight:1.6,marginBottom:24}}>
          {expired ? "This password reset or confirmation link is invalid, has expired, or has already been used. Please request a new link to continue." : "This authentication link could not be completed. Please request a new link and try again."}
        </p>
        <Link href="/forgot-password" style={{display:"block",textAlign:"center",padding:"13px 16px",borderRadius:9,background:"#111827",color:"#fff",fontWeight:700,textDecoration:"none",marginBottom:12}}>Request New Reset Link</Link>
        <Link href="/login" style={{display:"block",textAlign:"center",padding:"11px 16px",color:"#374151",fontWeight:600,textDecoration:"none"}}>Back to Sign In</Link>
      </div>
    </main>
  );
}
