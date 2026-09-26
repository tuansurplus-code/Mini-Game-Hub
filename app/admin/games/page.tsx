"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Game = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGames() {
      const { data, error } = await supabase
        .from("games")
        .select("id, name, type, status")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        setError(error.message);
      } else {
        setGames(data ?? []);
      }

      setLoading(false);
    }

    loadGames();
  }, []);

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>

          <h1>Games</h1>

          <p>
            Configure the game types available in your hub.
          </p>
        </div>

        <button className="primary-btn">
          + New Game
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="admin-panel">
        {loading ? (
          <p>Loading games...</p>
        ) : games.length === 0 ? (
          <p className="empty">
            No games yet. Create your first game to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>{game.name}</td>

                  <td>
                    {game.type}
                  </td>

                  <td>
                    <span className="tag">
                      {game.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
