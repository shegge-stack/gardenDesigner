import React, { useState } from 'react';

interface WelcomeScreenProps {
  onStart: (width: number, depth: number) => void;
  onLoadSample?: () => void;
}

const FLOATING_EMOJIS = [
  { emoji: '🌿', top: '8%', left: '12%', size: 48, delay: 0 },
  { emoji: '🌱', top: '15%', right: '18%', size: 36, delay: 0.8 },
  { emoji: '🍅', top: '70%', left: '8%', size: 42, delay: 1.6 },
  { emoji: '🌻', top: '25%', left: '75%', size: 52, delay: 0.4 },
  { emoji: '🥕', top: '65%', right: '12%', size: 38, delay: 1.2 },
  { emoji: '🌶️', top: '80%', left: '45%', size: 34, delay: 2.0 },
  { emoji: '🌿', top: '45%', left: '5%', size: 28, delay: 0.6 },
  { emoji: '🌱', top: '55%', right: '6%', size: 32, delay: 1.4 },
  { emoji: '🍅', top: '12%', left: '50%', size: 30, delay: 1.8 },
  { emoji: '🥕', top: '85%', left: '20%', size: 26, delay: 2.2 },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, onLoadSample }) => {
  const [width, setWidth] = useState(22);
  const [depth, setDepth] = useState(17);

  return (
    <div
      className="page-enter"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 600px 400px at 30% 40%, rgba(143,186,145,0.12) 0%, transparent 70%),
          radial-gradient(ellipse 500px 500px at 70% 60%, rgba(143,186,145,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 800px 300px at 50% 20%, rgba(252,234,158,0.06) 0%, transparent 70%),
          linear-gradient(180deg, rgba(255,252,240,0.9) 0%, var(--color-parchment-50) 100%)
        `,
      }}
    >
      {/* Floating decorative emojis */}
      {FLOATING_EMOJIS.map((item, i) => (
        <span
          key={i}
          className="animate-float"
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            right: (item as any).right,
            fontSize: item.size,
            opacity: 0.1,
            pointerEvents: 'none',
            animationDelay: `${item.delay}s`,
            filter: 'grayscale(0.2)',
            userSelect: 'none',
          }}
        >
          {item.emoji}
        </span>
      ))}

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 640, padding: '0 24px' }}>
        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 500,
            color: 'var(--color-sage-800)',
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          Welcome to Your Garden
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.1rem',
            color: 'var(--color-parchment-500)',
            fontStyle: 'italic',
            marginBottom: 48,
          }}
        >
          Every great harvest begins with a good plan.
        </p>

        {/* Two option cards */}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Start Fresh card */}
          <div
            className="glass-card card-hover"
            style={{
              flex: '1 1 280px',
              maxWidth: 320,
              borderRadius: 20,
              padding: '32px 28px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 600,
                color: 'var(--color-sage-800)',
                marginBottom: 8,
              }}
            >
              Start Fresh
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                color: 'var(--color-parchment-500)',
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Enter your garden dimensions and start designing.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20, alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <label
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-parchment-400)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Width (ft)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  style={{ width: 72, textAlign: 'center' }}
                />
              </div>
              <span
                style={{
                  color: 'var(--color-parchment-300)',
                  fontSize: '1.2rem',
                  marginTop: 18,
                }}
              >
                ×
              </span>
              <div style={{ textAlign: 'left' }}>
                <label
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-parchment-400)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Depth (ft)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  style={{ width: 72, textAlign: 'center' }}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => onStart(width, depth)}
              style={{ fontSize: '0.95rem', padding: '12px 32px', width: '100%', justifyContent: 'center' }}
            >
              Let's Grow →
            </button>
          </div>

          {/* Load Sample card */}
          {onLoadSample && (
            <div
              className="glass-card card-hover"
              onClick={onLoadSample}
              style={{
                flex: '1 1 280px',
                maxWidth: 320,
                borderRadius: 20,
                padding: '32px 28px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-800)',
                  marginBottom: 8,
                }}
              >
                Load Sample
              </h2>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: 'var(--color-parchment-500)',
                  lineHeight: 1.5,
                }}
              >
                Try a pre-built 22'×17' backyard garden with raised beds, tomatoes, herbs, and more.
              </p>
              <div
                style={{
                  marginTop: 24,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  color: 'var(--color-sage-500)',
                  fontWeight: 500,
                }}
              >
                Explore the demo →
              </div>
            </div>
          )}
        </div>

        {/* Seasonal tip */}
        <div
          style={{
            marginTop: 48,
            padding: '16px 24px',
            borderRadius: 16,
            background: 'rgba(255,252,240,0.7)',
            border: '1px solid rgba(252,234,158,0.3)',
            maxWidth: 440,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--color-parchment-600)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            🌤️ It's late March — perfect time to start tomato and pepper seeds indoors!
          </p>
        </div>
      </div>
    </div>
  );
};
