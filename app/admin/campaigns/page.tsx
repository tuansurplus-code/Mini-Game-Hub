"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Campaign = {
  id: string;
  name: string;
  status: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        setError(error.message);
      } else {
        setCampaigns(data ?? []);
      }

      setLoading(false);
    }

    loadCampaigns();
  }, []);

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>

          <h1>Campaigns</h1>

          <p>
            Create and manage promotional campaigns.
          </p>
        </div>

        <button className="primary-btn">
          + New Campaign
        </button>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="admin-panel">
        {loading ? (
          <p>Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="empty">
            No campaigns yet. Create your first campaign
            to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    {campaign.name}
                  </td>

                  <td>
                    <span className="tag">
                      {campaign.status}
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
