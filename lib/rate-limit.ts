type Bucket={count:number;resetAt:number};
const store=new Map<string,Bucket>();

export function getClientIp(request:Request){
 const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
 return forwarded||request.headers.get("x-real-ip")||"unknown";
}

export function rateLimit(key:string,limit:number,windowMs:number){
 const now=Date.now();
 const current=store.get(key);
 if(!current||current.resetAt<=now){store.set(key,{count:1,resetAt:now+windowMs});return{allowed:true,retryAfter:0}}
 if(current.count>=limit)return{allowed:false,retryAfter:Math.max(1,Math.ceil((current.resetAt-now)/1000))};
 current.count+=1;store.set(key,current);return{allowed:true,retryAfter:0};
}

export function tooManyRequests(retryAfter:number){
 return new Response(JSON.stringify({error:"Too many requests. Please wait a moment and try again.",error_title:"Please Slow Down",error_code:"RATE_LIMITED"}),{status:429,headers:{"Content-Type":"application/json","Retry-After":String(retryAfter),"Cache-Control":"no-store"}});
}
