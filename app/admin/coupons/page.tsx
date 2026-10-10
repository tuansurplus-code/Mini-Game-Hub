"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Coupon = {
  id: string;
  code: string;
  status: string;
  expires_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  mobile: string;
  campaign_name: string;
  game_name: string;
  prize_name: string;
  public_slug: string;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canRedeem, setCanRedeem] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function loadCoupons() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "get_coupon_management",
      {
        p_search: search.trim() || null,
        p_status: status || null,
      }
    );

    if (error) {
      setError(error.message);
      setCoupons([]);
    } else {
      setCoupons(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCoupons();
  }, [status]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/team", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setCanRedeem(Boolean(data && data.role !== "viewer")); })
      .catch(() => { if (active) setCanRedeem(false); });
    return () => { active = false; };
  }, []);

  async function redeemCoupon(code: string) {
    const confirmed = window.confirm(
      `Redeem coupon ${code}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setWorking(code);
    setError("");
    setMessage("");

    const { data, error } = await supabase.rpc(
      "redeem_coupon",
      {
        p_code: code,
      }
    );

    if (error) {
      setError(error.message);
    } else if (data?.success) {
      setMessage(
        `Coupon ${code} has been successfully redeemed.`
      );
      await loadCoupons();
    } else {
      setError(
        `Coupon ${code} is ${data?.status || "not available"}.`
      );
      await loadCoupons();
    }

    setWorking("");
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    loadCoupons();
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "—";
    }

    return new Date(value).toLocaleString();
  }

  function statusClass(value: string) {
    switch (value) {
      case "active":
        return "status-pill";

      case "redeemed":
        return "tag";

      case "expired":
        return "tag";

      case "cancelled":
        return "tag";

      default:
        return "tag";
    }
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <p className="eyebrow">PROMOTIONS</p>

          <h1>Coupon Management</h1>

          <p>
            Search, review and redeem promotional coupons.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {message && (
        <div className="success-box">
          {message}
        </div>
      )}

      <div className="admin-panel">
        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search coupon, mobile, campaign or prize..."
            style={{
              flex: "1 1 320px",
              minWidth: "220px",
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              fontSize: "14px",
            }}
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            style={{
              padding: "11px 13px",
              border: "1px solid #d8dde5",
              borderRadius: "9px",
              background: "#ffffff",
              fontSize: "14px",
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="redeemed">Redeemed</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            type="submit"
            className="primary-btn"
          >
            Search
          </button>
        </form>
      </div>

      <div className="admin-panel">
        {loading ? (
          <p>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="empty">
            No coupons found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Status</th>
                  <th>Mobile</th>
                  <th>Campaign</th>
                  <th>Game</th>
                  <th>Prize</th>
                  <th>Created</th>
                  <th>Redeemed</th>
                  {canRedeem && <th>Action</th>}
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong>
                        {coupon.code}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          coupon.status
                        )}
                      >
                        {coupon.status}
                      </span>
                    </td>

                    <td>{coupon.mobile}</td>

                    <td>
                      {coupon.campaign_name}
                    </td>

                    <td>
                      {coupon.game_name}
                    </td>

                    <td>
                      {coupon.prize_name}
                    </td>

                    <td>
                      {formatDate(
                        coupon.created_at
                      )}
                    </td>

                    <td>
                      {formatDate(
                        coupon.redeemed_at
                      )}
                    </td>

                    {canRedeem && <td>
                      {coupon.status === "active" ? (
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={
                            working === coupon.code
                          }
                          onClick={() =>
                            redeemCoupon(
                              coupon.code
                            )
                          }
                        >
                          {working === coupon.code
                            ? "Redeeming..."
                            : "Redeem"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
