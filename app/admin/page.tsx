import { requireAdmin } from "../../lib/admin-auth";
import { createSupabaseServerClient } from "../../lib/supabase-server";

type DashboardStats = {
  total_games: number;
  active_campaigns: number;
  total_participants: number;
  total_spins: number;
  total_winners: number;
  active_coupons: number;
  redeemed_coupons: number;
  prizes_distributed: number;
};

export default async function AdminDashboard() {
  const { user, role } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_dashboard_stats");

  const stats: DashboardStats = data?.[0] ?? {
    total_games: 0,
    active_campaigns: 0,
    total_participants: 0,
    total_spins: 0,
    total_winners: 0,
    active_coupons: 0,
    redeemed_coupons: 0,
    prizes_distributed: 0,
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">DASHBOARD</div>

          <h1>Mini-Game Hub</h1>

          <p>Welcome back, {user.email}</p>
        </div>

        <div>
          <span className="status-pill">
            {role.toUpperCase()}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-box">
          Unable to load dashboard statistics.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Games</span>
          <strong>{stats.total_games}</strong>
        </div>

        <div className="stat-card">
          <span>Active Campaigns</span>
          <strong>{stats.active_campaigns}</strong>
        </div>

        <div className="stat-card">
          <span>Total Participants</span>
          <strong>{stats.total_participants}</strong>
        </div>

        <div className="stat-card">
          <span>Total Spins</span>
          <strong>{stats.total_spins}</strong>
        </div>

        <div className="stat-card">
          <span>Total Winners</span>
          <strong>{stats.total_winners}</strong>
        </div>

        <div className="stat-card">
          <span>Active Coupons</span>
          <strong>{stats.active_coupons}</strong>
        </div>

        <div className="stat-card">
          <span>Redeemed Coupons</span>
          <strong>{stats.redeemed_coupons}</strong>
        </div>

        <div className="stat-card">
          <span>Prizes Distributed</span>
          <strong>{stats.prizes_distributed}</strong>
        </div>
      </div>

      <div className="admin-panel">
        <h2>Campaign Activity</h2>

        <p>
          Your dashboard now tracks games, campaigns, participants,
          spins, winners, coupons, and prize distribution across your
          workspace.
        </p>
      </div>
    </>
  );
}
