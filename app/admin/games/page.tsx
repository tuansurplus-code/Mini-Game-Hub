import { requireAdmin } from "../../../lib/admin-auth";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export default async function GamesPage() {
  const { workspaceId } = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: games, error } = await supabase
    .from("games")
    .select("id, name, slug, type, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="admin-header">
        <div>
          <div className="eyebrow">GAME MANAGEMENT</div>
          <h1>Games</h1>
          <p>
            Create and manage the games available in your campaigns.
          </p>
        </div>

        <button className="primary-btn">
          + New Game
        </button>
      </div>

      {error && (
        <div className="error-box">
          Failed to load games: {error.message}
        </div>
      )}

      <div className="admin-panel">
        {games && games.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Slug</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>
                    <strong>{game.name}</strong>
                  </td>

                  <td>
                    <span className="tag">
                      {game.type}
                    </span>
                  </td>

                  <td>{game.slug}</td>

                  <td>
                    <span className="tag">
                      {game.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            No games have been created yet.
          </div>
        )}
      </div>
    </>
  );
}
