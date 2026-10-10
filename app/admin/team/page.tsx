import { requireAdmin } from "../../../lib/admin-auth";
import TeamManager from "./TeamManager";

export default async function TeamPage() {
  const { role } = await requireAdmin();
  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>Team</h1>
          <p>Manage the people who can access this workspace.</p>
        </div>
        <span className="status-pill">YOUR ROLE: {role.toUpperCase()}</span>
      </div>
      <TeamManager role={role} />
    </>
  );
}
