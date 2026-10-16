export class RequestBodyError extends Error { constructor(public status:number,message:string){super(message);} }
export async function readJsonBody(request:Request,maxBytes:number):Promise<unknown> {
  const declared=Number(request.headers.get("content-length")||0);
  if(declared>maxBytes)throw new RequestBodyError(413,"Request is too large.");
  const reader=request.body?.getReader();if(!reader)throw new RequestBodyError(400,"Invalid request.");
  const chunks:Uint8Array[]=[];let length=0;
  try { while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new RequestBodyError(413,"Request is too large.");}chunks.push(value);} }
  finally { reader.releaseLock(); }
  const buffer=new Uint8Array(length);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(buffer));}catch{throw new RequestBodyError(400,"Invalid request.");}
}
