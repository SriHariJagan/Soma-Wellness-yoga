import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SomaLoader from "../components/soma/SomaLoader";

/**
 * OAuth callback page — receives token + user from server redirect,
 * stores them in AuthContext, and navigates to the appropriate dashboard.
 *
 * The server redirects to: /social/success#token=...&user=...
 * We parse the hash fragment to extract credentials.
 */
export default function SocialSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) {
      setError("No authentication data received");
      return;
    }

    try {
      const params = new URLSearchParams(hash.substring(1)); // strip the #
      const token = params.get("token");
      const userStr = params.get("user");

      if (!token || !userStr) {
        setError("Missing token or user data");
        return;
      }

      const user = JSON.parse(decodeURIComponent(userStr));

      // Store in AuthContext (which persists to localStorage)
      login(token, user);

      // Redirect based on role
      if (user.role === "admin") {
        navigate("/yogaadmin", { replace: true });
      } else {
        navigate("/studentdashboard", { replace: true });
      }
    } catch (err) {
      console.error("OAuth callback parse error:", err);
      setError("Failed to process authentication data");
    }
  }, [location, login, navigate]);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--soma-cream)",
        fontFamily: "var(--font-body)",
        gap: 16,
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 8px 32px rgba(24,61,45,0.08)",
          textAlign: "center",
          maxWidth: 400,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--soma-forest)" }}>
            Authentication Failed
          </h2>
          <p style={{ fontSize: 14, color: "#5a6b63", marginTop: 8 }}>{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            style={{
              marginTop: 20,
              padding: "12px 24px",
              borderRadius: 9999,
              background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)",
              color: "#fff",
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--soma-cream)",
    }}>
      <SomaLoader />
    </div>
  );
}
