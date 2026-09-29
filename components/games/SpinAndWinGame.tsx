"use client";

import { useMemo, useState } from "react";

type Prize = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  inventory: number | null;
  active: boolean;
};

type AppearanceSettings = {
  title: string;
  subtitle: string;
  button_text: string;
  page_background_color: string;
  button_color: string;
  button_text_color: string;
};

type SpinResult = {
  session_id?: string;
  winner_id?: string;
  prize_id?: string;
  prize_name?: string;
  prize_description?: string | null;
  prize_image_url?: string | null;
  inventory?: number | null;
  coupon_code?: string | null;
  coupon_status?: string | null;
  replayed?: boolean;
};

type Props = {
  slug: string;
  gameName: string;
  prizes: Prize[];
  appearance: AppearanceSettings;
};

function normalizeMobile(mobile: string): string | null {
  const cleaned = mobile.trim().replace(/\s+/g, "");

  if (/^07\d{8}$/.test(cleaned)) {
    return `+94${cleaned.slice(1)}`;
  }

  if (/^947\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^\+947\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

function getSegmentColor(index: number): string {
  const colors = [
    "#e31b23",
    "#111827",
    "#f59e0b",
    "#2563eb",
    "#16a34a",
    "#7c3aed",
    "#db2777",
    "#0891b2",
  ];

  return colors[index % colors.length];
}

export default function SpinAndWinGame({
  slug,
  gameName,
  prizes,
  appearance,
}: Props) {
  const [mobile, setMobile] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState("");

  const availablePrizes = useMemo(
    () => prizes.filter((prize) => prize.active),
    [prizes]
  );

  const segmentAngle =
    availablePrizes.length > 0
      ? 360 / availablePrizes.length
      : 360;

  async function handleSpin() {
    setError("");
    setResult(null);

    const normalizedMobile = normalizeMobile(mobile);

    if (!normalizedMobile) {
      setError(
        "Please enter a valid Sri Lankan mobile number."
      );
      return;
    }

    if (availablePrizes.length === 0) {
      setError("No prizes are currently available.");
      return;
    }

    setSpinning(true);

    try {
      const response = await fetch(`/api/play/${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Unable to play the game."
        );
        setSpinning(false);
        return;
      }

      const spinResult = data.result as SpinResult;

      const winningPrizeIndex =
        availablePrizes.findIndex(
          (prize) => prize.id === spinResult.prize_id
        );

      const safePrizeIndex =
        winningPrizeIndex >= 0
          ? winningPrizeIndex
          : 0;

      /*
       * The wheel starts with segment 0 at the top.
       * We rotate enough full rounds for a visible animation,
       * then stop with the winning segment at the pointer.
       */
      const targetAngle =
        360 -
        safePrizeIndex * segmentAngle -
        segmentAngle / 2;

      const currentRotation =
        rotation % 360;

      const normalizedTarget =
        ((targetAngle % 360) + 360) % 360;

      const additionalRotation =
        360 * 6 +
        ((normalizedTarget - currentRotation + 360) %
          360);

      setRotation(
        rotation + additionalRotation
      );

      window.setTimeout(() => {
        setResult(spinResult);
        setSpinning(false);
      }, 4200);
    } catch {
      setError(
        "Unable to connect to the game. Please try again."
      );
      setSpinning(false);
    }
  }

  const wheelBackground =
    availablePrizes.length > 0
      ? `conic-gradient(${availablePrizes
          .map((_, index) => {
            const start = index * segmentAngle;
            const end = (index + 1) * segmentAngle;
            return `${getSegmentColor(
              index
            )} ${start}deg ${end}deg`;
          })
          .join(", ")})`
      : "#e5e7eb";

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor:
          appearance.page_background_color ||
          "#ffffff",
        padding: "32px 16px 48px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "32px 20px 36px",
            boxShadow:
              "0 12px 40px rgba(0,0,0,0.10)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "34px",
              fontWeight: 800,
              lineHeight: 1.15,
              color: "#111827",
              marginBottom: "10px",
            }}
          >
            {appearance.title || "SPIN & WIN"}
          </div>

          <div
            style={{
              fontSize: "16px",
              color: "#6b7280",
              marginBottom: "8px",
            }}
          >
            {appearance.subtitle ||
              "Spin daily and win exciting rewards!"}
          </div>

          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#374151",
              marginBottom: "26px",
            }}
          >
            {gameName}
          </div>

          <div
            style={{
              position: "relative",
              width: "min(82vw, 380px)",
              height: "min(82vw, 380px)",
              margin: "0 auto 28px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-10px",
                left: "50%",
                transform:
                  "translateX(-50%)",
                zIndex: 5,
                width: 0,
                height: 0,
                borderLeft:
                  "16px solid transparent",
                borderRight:
                  "16px solid transparent",
                borderTop:
                  "30px solid #111827",
                filter:
                  "drop-shadow(0 3px 3px rgba(0,0,0,0.2))",
              }}
            />

            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background:
                  wheelBackground,
                border:
                  "10px solid #111827",
                boxShadow:
                  "0 10px 30px rgba(0,0,0,0.18)",
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? "transform 4.2s cubic-bezier(0.12, 0.72, 0.16, 1)"
                  : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {availablePrizes.map(
                (prize, index) => {
                  const angle =
                    index * segmentAngle +
                    segmentAngle / 2;

                  return (
                    <div
                      key={prize.id}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${Math.min(
                          30,
                          24
                        )}%)`,
                        transformOrigin:
                          "center center",
                        width: "45%",
                        color: "#ffffff",
                        fontSize:
                          availablePrizes.length >
                          6
                            ? "10px"
                            : "12px",
                        fontWeight: 800,
                        textAlign: "center",
                        pointerEvents:
                          "none",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          transform: `rotate(${-angle}deg)`,
                          textShadow:
                            "0 1px 2px rgba(0,0,0,0.35)",
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {prize.name}
                      </span>
                    </div>
                  );
                }
              )}

              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "64px",
                  height: "64px",
                  transform:
                    "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background:
                    appearance.button_color ||
                    "#e31b23",
                  border:
                    "6px solid #ffffff",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.25)",
                  zIndex: 4,
                }}
              />
            </div>
          </div>

          <div
            style={{
              maxWidth: "420px",
              margin: "0 auto",
            }}
          >
            <label
              htmlFor="mobile"
              style={{
                display: "block",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: 700,
                color: "#374151",
                marginBottom: "8px",
              }}
            >
              Mobile Number
            </label>

            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="07XXXXXXXX"
              value={mobile}
              onChange={(event) =>
                setMobile(event.target.value)
              }
              disabled={spinning}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border:
                  "1px solid #d1d5db",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "16px",
                outline: "none",
                marginBottom: "12px",
                opacity: spinning ? 0.6 : 1,
              }}
            />

            {error && (
              <div
                style={{
                  color: "#b91c1c",
                  background: "#fef2f2",
                  border:
                    "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "11px 12px",
                  fontSize: "14px",
                  marginBottom: "12px",
                  textAlign: "left",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSpin}
              disabled={
                spinning ||
                !mobile.trim()
              }
              style={{
                width: "100%",
                border: "none",
                borderRadius: "12px",
                padding: "15px 20px",
                fontSize: "17px",
                fontWeight: 800,
                cursor:
                  spinning ||
                  !mobile.trim()
                    ? "not-allowed"
                    : "pointer",
                background:
                  appearance.button_color ||
                  "#e31b23",
                color:
                  appearance.button_text_color ||
                  "#ffffff",
                opacity:
                  spinning ||
                  !mobile.trim()
                    ? 0.55
                    : 1,
                transition:
                  "opacity 0.2s ease",
              }}
            >
              {spinning
                ? "SPINNING..."
                : appearance.button_text ||
                  "SPIN NOW"}
            </button>

            <div
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              One play per mobile number.
            </div>
          </div>

          {result && (
            <div
              style={{
                marginTop: "28px",
                borderRadius: "18px",
                padding: "24px 18px",
                background: "#f9fafb",
                border:
                  "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#6b7280",
                  marginBottom: "6px",
                }}
              >
                {result.replayed
                  ? "YOUR PREVIOUS RESULT"
                  : "CONGRATULATIONS!"}
              </div>

              {result.prize_image_url && (
                <img
                  src={result.prize_image_url}
                  alt={result.prize_name || "Prize"}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "contain",
                    margin:
                      "8px auto 12px",
                    display: "block",
                    borderRadius: "12px",
                  }}
                />
              )}

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#111827",
                  marginBottom: "8px",
                }}
              >
                {result.prize_name ||
                  "Prize"}
              </div>

              {result.prize_description && (
                <div
                  style={{
                    fontSize: "15px",
                    color: "#4b5563",
                    marginBottom: "18px",
                  }}
                >
                  {result.prize_description}
                </div>
              )}

              {result.coupon_code && (
                <div
                  style={{
                    background: "#ffffff",
                    border:
                      "2px dashed #d1d5db",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#6b7280",
                      marginBottom: "5px",
                    }}
                  >
                    YOUR COUPON CODE
                  </div>

                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      letterSpacing: "1px",
                      color:
                        appearance.button_color ||
                        "#e31b23",
                    }}
                  >
                    {result.coupon_code}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: "24px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "24px 18px",
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.07)",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "22px",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            Prizes
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
            }}
          >
            {availablePrizes.map((prize) => (
              <div
                key={prize.id}
                style={{
                  border:
                    "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "14px",
                  background: "#ffffff",
                }}
              >
                {prize.image_url && (
                  <img
                    src={prize.image_url}
                    alt={prize.name}
                    style={{
                      width: "70px",
                      height: "70px",
                      objectFit: "contain",
                      display: "block",
                      margin:
                        "0 auto 10px",
                      borderRadius: "8px",
                    }}
                  />
                )}

                <div
                  style={{
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: "5px",
                  }}
                >
                  {prize.name}
                </div>

                {prize.description && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      lineHeight: 1.4,
                    }}
                  >
                    {prize.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
