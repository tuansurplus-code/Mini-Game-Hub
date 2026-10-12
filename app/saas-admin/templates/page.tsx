import { requirePlatformAdmin } from "../../../lib/platform-auth";
import GameTemplateManager from "./GameTemplateManager";

export default async function Page() {
  const { role } = await requirePlatformAdmin();
  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">CATALOG</div>
          <h1>Game Templates</h1>
          <p>Control platform game availability, default appearance, and plan customizations.</p>
        </div>
      </div>
      <GameTemplateManager canEdit={role !== "support"} />
    </>
  );
}
