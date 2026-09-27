"use client";

import { useMemo, useState } from "react";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
};

type SpinResult = {
  coupon_code?: string | null;
  coupon_status?: string | null;
};

type Props = {
  campaignGameId: string;
  title: string;
  description: string;
  campaignName: string;
  prizes: Prize[];
};

function createRequestId() {
  return crypto.randomUUID();
}

function normalizeMobile(value: string) {
  const cleaned = value.replace(/[\s\-()]/g, "");

  if (/^0\d{9}$/.test(cleaned)) {
    return `+94${cleaned.slice(1)}`;
  }

  if (/^94\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^\+947\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export default function SpinGameClient({
  campaignGameId,
  title,
  description,
  campaignName,
  prizes,
}: Props) {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [winner, setWinner] = useState<Prize | null>(null);
  const [coupon, setCoupon] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);

  const wheelPrizes = useMemo(() => prizes, [prizes]);

  const handleSpin = async () => {
    setError("");

    const normalizedMobile = normalizeMobile(mobile);

    if (!normalizedMobile) {
      setError("Please enter a valid Sri Lankan mobile number.");
      return;
    }

    if (loading || winner) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_game_id: campaignGameId,
          mobile: normalizedMobile,
          request_id: createRequestId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to complete the spin.");
        setLoading(false);
        return;
      }

      const result = data.result;

      const winningPrize = prizes.find(
        (prize) => prize.id === result.prize_id
      );

      if (!winningPrize) {
        setError("The winning prize could not be found.");
        setLoading(false);
        return;
      }

      const winnerIndex = wheelPrizes.findIndex(
        (prize) => prize.id === winningPrize.id
      );

      const segmentAngle = 360 / wheelPrizes.length;

      const targetAngle =
        360 - winnerIndex * segmentAngle - segmentAngle / 2;

      setRotation(
        (current) => current + 5 * 360 + targetAngle
      );

      setTimeout(() => {
        setWinner(winningPrize);
        setCoupon({
          coupon_code: result.coupon_code ?? null,
          coupon_status: result.coupon_status ?? null,
        });
        setLoading(false);
      }, 4200);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const segmentAngle = 360 / wheelPrizes.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-orange-400 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center">
        <div className="mb-6 text-center text-white">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] opacity-90">
            {campaignName}
          </p>

          <h1 className="text-4xl font-black sm:text-5xl">
            {title}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm text-white/90 sm:text-base">
            {description}
          </p>
        </div>

        <div className="w-full rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
          {!winner ? (
            <>
              <div className="relative mx-auto mb-8 aspect-square w-full max-w-[420px]">
                <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
                  <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-red-700 drop-shadow-md" />
                </div>

                <div
                  className="relative h-full w-full overflow-hidden rounded-full border-8 border-white shadow-xl transition-transform duration-[4200ms] ease-out"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {wheelPrizes.map((prize, index) => (
                    <div
                      key={prize.id}
                      className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-bottom-left"
                      style={{
                        transform: `rotate(${index * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`,
                        background:
                          index % 2 === 0
                            ? "#dc2626"
                            : "#facc15",
                        clipPath:
                          "polygon(0 0, 100% 0, 0 100%)",
                      }}
                    >
                      <div
                        className="absolute left-4 top-8 w-28 -rotate-[20deg] text-center text-xs font-bold text-white sm:w-32 sm:text-sm"
                        style={{
                          transform: `rotate(${segmentAngle / 2}deg)`,
                        }}
                      >
                        {prize.name}
                      </div>
                    </div>
                  ))}

                  <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-red-600 text-center text-xs font-black text-white shadow-lg">
                    SPIN
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="mobile"
                    className="mb-2 block text-sm font-bold text-gray-800"
                  >
                    Mobile Number
                  </label>

                  <input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(event) =>
                      setMobile(event.target.value)
                    }
                    placeholder="07XXXXXXXX"
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={loading || !!winner}
                  className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "SPINNING..." : "SPIN NOW"}
                </button>

                <p className="text-center text-xs text-gray-500">
                  One spin per mobile number.
                </p>
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <div className="mb-5 text-6xl">🎉</div>

              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                Congratulations!
              </p>

              <h2 className="mt-3 text-3xl font-black text-gray-900">
                You Won!
              </h2>

              <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-red-50 p-6">
                <p className="text-sm font-medium text-gray-500">
                  Your prize
                </p>

                <p className="mt-2 text-3xl font-black text-red-600">
                  {winner.name}
                </p>

                {winner.description && (
                  <p className="mt-3 text-sm text-gray-700">
                    {winner.description}
                  </p>
                )}
              </div>

              {coupon?.coupon_code && (
                <div className="mx-auto mt-5 max-w-sm rounded-2xl border-2 border-dashed border-red-300 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Your Coupon Code
                  </p>

                  <p className="mt-3 rounded-xl bg-gray-100 px-4 py-3 text-2xl font-black tracking-wider text-gray-900">
                    {coupon.coupon_code}
                  </p>

                  <p className="mt-3 text-xs text-gray-500">
                    Please keep this coupon code for your purchase.
                  </p>
                </div>
              )}

              <p className="mt-6 text-sm text-gray-500">
                This mobile number has already used its spin.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
