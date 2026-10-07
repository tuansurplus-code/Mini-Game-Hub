type Props = {
  gameName: string;
};

export default function ScratchAndWinGame({ gameName }: Props) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "#f8fafc",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          padding: "36px 24px",
          borderRadius: "24px",
          background: "#ffffff",
          boxShadow: "0 12px 40px rgba(0,0,0,.10)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#6b7280", marginBottom: "8px" }}>
          SCRATCH & WIN
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "32px", color: "#111827" }}>{gameName}</h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
          Scratch & Win is being prepared for this campaign.
        </p>
      </section>
    </main>
  );
}
