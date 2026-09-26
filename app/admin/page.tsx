import { requireAdmin } from "../../lib/admin-auth";

export default async function AdminDashboard() {
  const { user, role } = await requireAdmin();

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">DASHBOARD</div>
          <h1>Mini-Game Hub</h1>
          <p>
            Welcome back, {user.email}
          </p>
        </div>

        <div>
          <span className="status-pill">
            {role.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Games</span>
          <strong>—</strong>
        </div>

        <div className="stat-card">
          <span>Campaigns</span>
          <strong>—</strong>
        </div>

        <div className="stat-card">
          <span>Participants</span>
          <strong>—</strong>
        </div>

        <div className="stat-card">
          <span>Winners</span>
          <strong>—</strong>
        </div>
      </div>

      <div className="admin-panel">
        <h2>Welcome to Mini-Game Hub</h2>
        <p>
          Your admin workspace is ready. From here you will be able
          to create games, manage campaigns, configure prizes, and
          review winners.
        </p>
      </div>
    </>
  );
}
