"use client";
import { useId } from "react";

/** Retain the original Santa artwork, with articulated legs under the reindeer bodies. */
export default function ChristmasSleigh() {
  const id = useId().replace(/:/g, "");
  const deer = [
    { rear: [197, 126], front: [231, 123], scale: 1, delay: 0 },
    { rear: [270, 108], front: [297, 105], scale: .8, delay: -.17 },
    { rear: [326, 94], front: [350, 91], scale: .66, delay: -.32 },
    { rear: [369, 83], front: [387, 80], scale: .5, delay: -.46 },
  ];
  return <span className="seasonal-santa"><svg viewBox="0 0 400 178" aria-hidden="true" className="santa-running-team">
    <defs>
      <clipPath id={`${id}-santa`}><rect width="174" height="169"/></clipPath>
      <clipPath id={`${id}-bodies`}><path d="M174 0H400V88H368V98H320V113H264V134H174Z"/></clipPath>
    </defs>
    <g className="santa-team-bob">
      {deer.map((animal,index)=><g key={index}>{["rear","front"].map((joint)=>[0,1].map(side=>{
        const [x,y]=joint === "rear"?animal.rear:animal.front;
        return <g key={`${joint}-${side}`} transform={`translate(${x} ${y}) scale(${animal.scale})`}><g className={`santa-running-leg ${joint} ${side ? "near" : "far"}`} style={{animationDelay:`${animal.delay + (side ? -.34 : 0)}s`}}><path d={joint === "rear" ? "M0 0 -7 14 -17 29" : "M0 0 8 14 4 30"} fill="none" stroke={side ? "#a96b3f" : "#704529"} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d={joint === "rear" ? "M-17 29 -22 29" : "M4 30 -1 30"} stroke="#342318" strokeWidth="5" strokeLinecap="round"/></g></g>;
      }))}</g>)}
      <image href="/template-previews/christmas-sleigh.png" width="400" height="169" clipPath={`url(#${id}-bodies)`}/>
    </g>
    <g className="santa-sleigh-bob"><image href="/template-previews/christmas-sleigh.png" width="400" height="169" clipPath={`url(#${id}-santa)`}/></g>
  </svg></span>;
}
