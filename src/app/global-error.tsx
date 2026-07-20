"use client";

/**
 * Last-resort boundary: catches errors in the root layout itself, where the
 * design system may not have rendered. Must ship its own <html>/<body> and
 * inline styles — nothing else is guaranteed to exist here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 1rem",
          backgroundColor: "#fafaf9",
          color: "#1c1917",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Something went sideways
        </h1>
        <p
          style={{
            margin: "0.5rem 0 0",
            maxWidth: "24rem",
            fontSize: "0.875rem",
            color: "#57534e",
          }}
        >
          The app hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "2rem",
            height: "2.5rem",
            padding: "0 1rem",
            borderRadius: "0.5rem",
            border: "none",
            backgroundColor: "#e00122",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
