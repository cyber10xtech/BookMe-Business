import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

interface Props {
  open: boolean;
  onContinue: () => void;
  businessName?: string;
}

/**
 * WelcomePromoModal
 * Shown immediately after a business successfully completes registration.
 * Celebrates them as a founding/early business and communicates the free-access reward.
 */
const WelcomePromoModal = ({ open, onContinue, businessName }: Props) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trap focus inside modal while open
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (el) {
      el.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome promotion"
      tabIndex={-1}
      className="welcome-promo-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        backgroundColor: "rgba(13, 22, 38, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "promoBackdropIn 0.35s ease both",
      }}
    >
      <style>{`
        @keyframes promoBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes promoCardIn {
          from {
            opacity: 0;
            transform: scale(0.88) translateY(24px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes promoBadgePop {
          0%   { transform: scale(0.5) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes promoShine {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes promoStarFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50%       { transform: translateY(-6px) rotate(8deg); opacity: 1; }
        }

        .promo-card {
          animation: promoCardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }
        .promo-badge {
          animation: promoBadgePop 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
        }
        .promo-shine-text {
          background: linear-gradient(
            90deg,
            hsl(220, 100%, 12%) 0%,
            hsl(220, 80%, 35%) 40%,
            hsl(220, 100%, 12%) 60%,
            hsl(220, 100%, 12%) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: promoShine 3s linear 0.8s infinite;
        }
        .promo-star {
          display: inline-block;
          animation: promoStarFloat 2.4s ease-in-out infinite;
        }
        .promo-star:nth-child(2) { animation-delay: 0.4s; }
        .promo-star:nth-child(3) { animation-delay: 0.8s; }

        .promo-divider {
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            hsl(220, 22%, 80%),
            transparent
          );
        }

        .promo-cta {
          background: linear-gradient(145deg, hsl(220, 80%, 16%), hsl(220, 100%, 8%));
          box-shadow:
            5px 5px 12px #0a1020,
            -5px -5px 12px #182848,
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.14s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .promo-cta:active {
          transform: scale(0.97);
          box-shadow:
            2px 2px 6px #0a1020,
            -2px -2px 6px #182848;
        }

        .promo-pill {
          background: linear-gradient(135deg, hsl(220, 100%, 18%), hsl(220, 100%, 10%));
          box-shadow: 0 2px 8px rgba(13, 22, 38, 0.35);
        }

        .promo-count-ring {
          background: hsl(220, 22%, 92%);
          box-shadow:
            inset 3px 3px 8px #c0c7d8,
            inset -3px -3px 8px #ffffff;
        }
      `}</style>

      {/* Modal card */}
      <div
        className="promo-card"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "28px",
          overflow: "hidden",
          boxShadow:
            "0 32px 80px rgba(13, 22, 38, 0.30), 0 8px 24px rgba(13, 22, 38, 0.15)",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            height: "4px",
            background:
              "linear-gradient(90deg, hsl(220, 100%, 20%), hsl(220, 80%, 40%), hsl(220, 100%, 20%))",
            backgroundSize: "200% auto",
            animation: "promoShine 4s linear infinite",
          }}
        />

        {/* Header section */}
        <div
          style={{
            background:
              "linear-gradient(160deg, hsl(220, 22%, 96%) 0%, hsl(220, 30%, 93%) 100%)",
            padding: "2rem 2rem 1.5rem",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Floating stars */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1.5rem",
              display: "flex",
              gap: "0.35rem",
            }}
          >
            <span className="promo-star" style={{ fontSize: "14px" }}>✦</span>
            <span className="promo-star" style={{ fontSize: "10px", marginTop: "6px" }}>✦</span>
            <span className="promo-star" style={{ fontSize: "16px", marginTop: "2px" }}>✦</span>
          </div>
          <div
            style={{
              position: "absolute",
              top: "1rem",
              right: "1.5rem",
              display: "flex",
              gap: "0.35rem",
              transform: "scaleX(-1)",
            }}
          >
            <span className="promo-star" style={{ fontSize: "14px" }}>✦</span>
            <span className="promo-star" style={{ fontSize: "10px", marginTop: "6px" }}>✦</span>
            <span className="promo-star" style={{ fontSize: "16px", marginTop: "2px" }}>✦</span>
          </div>

          {/* Logo + emoji badge */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: "1rem" }}>
            <img
              src={logo}
              alt="BookMe"
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "18px",
                boxShadow:
                  "0 8px 24px rgba(13,22,38,0.18), 0 2px 6px rgba(13,22,38,0.12)",
              }}
            />
            <div
              className="promo-badge"
              style={{
                position: "absolute",
                bottom: "-8px",
                right: "-10px",
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                boxShadow: "0 3px 8px rgba(245, 158, 11, 0.5)",
                border: "2px solid white",
              }}
            >
              🎉
            </div>
          </div>

          {/* Headline */}
          <h2
            style={{
              fontSize: "clamp(1.35rem, 5vw, 1.65rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              color: "hsl(220, 100%, 10%)",
              marginBottom: "0.35rem",
              letterSpacing: "-0.025em",
            }}
          >
            Welcome to{" "}
            <span className="promo-shine-text">BookMe Business</span>
          </h2>

          {businessName && (
            <p
              style={{
                fontSize: "0.88rem",
                color: "hsl(220, 20%, 45%)",
                marginTop: "0.25rem",
                fontWeight: 500,
              }}
            >
              {businessName}
            </p>
          )}
        </div>

        {/* Body section */}
        <div style={{ padding: "1.5rem 2rem", background: "#ffffff" }}>

          {/* Founding badge pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1.4rem",
            }}
          >
            <div
              className="promo-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 1.1rem",
                borderRadius: "100px",
                color: "white",
              }}
            >
              <span style={{ fontSize: "13px" }}>⭐</span>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Founding Business
              </span>
              <span style={{ fontSize: "13px" }}>⭐</span>
            </div>
          </div>

          {/* Slot counter */}
          <div
            className="promo-count-ring"
            style={{
              borderRadius: "18px",
              padding: "1rem 1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <span
                style={{
                  fontSize: "1.9rem",
                  fontWeight: 900,
                  color: "hsl(220, 100%, 12%)",
                  lineHeight: 1,
                  display: "block",
                  letterSpacing: "-0.04em",
                }}
              >
                200
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "hsl(220, 15%, 55%)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                of 300
              </span>
            </div>
            <div
              style={{
                width: "1px",
                height: "44px",
                background: "hsl(220, 20%, 82%)",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: "0.85rem",
                color: "hsl(220, 25%, 35%)",
                lineHeight: 1.45,
                margin: 0,
                fontWeight: 500,
              }}
            >
              You're one of the{" "}
              <strong style={{ color: "hsl(220, 100%, 12%)", fontWeight: 700 }}>
                first 300 businesses
              </strong>{" "}
              on BookMe. You've earned something special.
            </p>
          </div>

          {/* Free access callout */}
          <div
            style={{
              background: "linear-gradient(135deg, hsl(220, 100%, 97%), hsl(220, 60%, 95%))",
              borderRadius: "16px",
              padding: "1.1rem 1.25rem",
              marginBottom: "1.5rem",
              border: "1.5px solid hsl(220, 60%, 88%)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "clamp(1.5rem, 6vw, 1.85rem)",
                fontWeight: 900,
                color: "hsl(220, 100%, 12%)",
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              FREE Access
            </p>
            <p
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "hsl(220, 60%, 35%)",
                margin: "0.2rem 0 0.6rem",
              }}
            >
              for 2 full months
            </p>
            <div className="promo-divider" style={{ marginBottom: "0.75rem" }} />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1.2rem",
              }}
            >
              {["No card needed", "No payment"].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.8rem",
                    color: "hsl(220, 30%, 40%)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "hsl(142, 71%, 38%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path
                        d="M1.5 4.5L3.5 6.5L7.5 2.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={onContinue}
            className="promo-cta"
            style={{
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.01em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            Continue to Dashboard
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3.75 9H14.25M14.25 9L10.5 5.25M14.25 9L10.5 12.75"
                stroke="white"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Fine print */}
          <p
            style={{
              textAlign: "center",
              fontSize: "0.72rem",
              color: "hsl(220, 15%, 60%)",
              marginTop: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            Your 2-month free period begins today.
            No commitment — cancel anytime after.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePromoModal;
