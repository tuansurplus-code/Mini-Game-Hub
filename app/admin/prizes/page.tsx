import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import PrizeForm from "./PrizeForm";
import PrizeActions from "./PrizeActions";

export default async function PrizesPage() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: prizes, error } = await supabase
    .from("prizes")
    .select(`id,name,description,image_url,weight,inventory,active,metadata,created_at,campaign_games!inner(id,campaign_id,campaigns!inner(id,name,workspace_id))`)
    .eq("campaign_games.campaigns.workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return <>
    <div className="admin-header"><div><div className="eyebrow">PRIZE MANAGEMENT</div><h1>Prizes</h1><p>Manage rewards and prize inventory for your campaigns.</p></div><PrizeForm /></div>
    {error && <div className="error-box">Failed to load prizes: {error.message}</div>}
    <div className="admin-panel">
      {prizes && prizes.length > 0 ? <table><thead><tr><th>Prize</th><th>Campaign</th><th>Color</th><th>Weight</th><th>Inventory</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {prizes.map((prize) => {
          const campaignGame=Array.isArray(prize.campaign_games)?prize.campaign_games[0]:prize.campaign_games;
          const campaignData=campaignGame?.campaigns;
          const campaign=Array.isArray(campaignData)?campaignData[0]:campaignData;
          const metadata=prize.metadata && typeof prize.metadata==="object" && !Array.isArray(prize.metadata) ? prize.metadata as Record<string,unknown> : {};
          const segmentColor=typeof metadata.segment_color==="string" ? metadata.segment_color : null;
          return <tr key={prize.id}>
            <td><strong>{prize.name}</strong></td><td>{campaign?.name??"—"}</td>
            <td>{segmentColor ? <div style={{display:"flex",alignItems:"center",gap:"7px"}}><span style={{width:"20px",height:"20px",borderRadius:"5px",background:segmentColor,border:"1px solid #d1d5db",display:"inline-block"}}/><code style={{fontSize:"12px"}}>{segmentColor}</code></div> : "Auto"}</td>
            <td>{prize.weight}</td><td>{prize.inventory===null?"Unlimited":prize.inventory}</td><td><span className="tag">{prize.active?"Active":"Inactive"}</span></td>
            <td><PrizeActions prize={{id:prize.id,name:prize.name,description:prize.description,image_url:prize.image_url,weight:Number(prize.weight),inventory:prize.inventory,active:prize.active,metadata}}/></td>
          </tr>;
        })}
      </tbody></table> : <div className="empty">No prizes have been created yet.</div>}
    </div>
  </>;
}
