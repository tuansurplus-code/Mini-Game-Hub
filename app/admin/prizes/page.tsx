"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
};

export default function PrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPrizes() {
      const { data, error } = await supabase
        .from("prizes")
        .select(
          "id, name, description, weight, inventory, active"
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        setError(error.message);
      } else {
        setPrizes(data ?? []);
      }

      setLoading(false);
    }

    loadPrizes();
  }, []);

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>

          <h1>Prizes</h1>

          <p>
            Manage prizes, winning weights and available inventory.
          </p>
        </div>

        <button className="primary-btn">
          + New Prize
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="admin-panel">
        {loading ? (
          <p>Loading prizes...</p>
        ) : prizes.length === 0 ? (
          <p className="empty">
            No prizes yet. Create your first prize to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Prize</th>
                <th>Weight</th>
                <th>Inventory</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {prizes.map((prize) => (
                <tr key={prize.id}>
                  <td>
                    <strong>{prize.name}</strong>

                    {prize.description && (
                      <div
                        style={{
                          color: "#697386",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {prize.description}
                      </div>
                    )}
                  </td>

                  <td>
                    {prize.weight}
                  </td>

                  <td>
                    {prize.inventory === null
                      ? "Unlimited"
                      : prize.inventory}
                  </td>

                  <td>
                    <span className="tag">
                      {prize.active ? "Active" : "Inactive"}
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
