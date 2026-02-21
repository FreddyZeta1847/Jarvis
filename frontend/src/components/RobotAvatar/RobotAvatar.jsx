import React, { useRef, useEffect, useCallback } from 'react';
import './RobotAvatar.css';

const NUM_POINTS = 32;
const BASE_RADIUS = 112; // Half of 230px container minus some padding
const BASE_RADIUS_DESKTOP = 132; // Half of 270px container
const DISPLACEMENT_SCALE = 44;
const SMOOTH_FACTOR = 0.18;

/**
 * Stable shuffled mapping: circle position → frequency bin.
 * Generated once so each point around the ring pulls from a random bin,
 * scattering mountains/valleys instead of following the spectrum in order.
 */
function createBinShuffle(n) {
  const indices = Array.from({ length: n }, (_, i) => i);
  // Seeded-style deterministic shuffle (same every load)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor((Math.sin(i * 9301 + 49297) * 0.5 + 0.5) * (i + 1)) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

const BIN_SHUFFLE = createBinShuffle(NUM_POINTS);

/**
 * Build a smooth closed SVG path from points using quadratic bezier curves.
 * Points are [{x, y}, ...] around the circle.
 */
function buildSmoothPath(points) {
  const n = points.length;
  if (n < 2) return '';

  const parts = [];
  // Start at midpoint between last point and first point
  const mx = (points[n - 1].x + points[0].x) / 2;
  const my = (points[n - 1].y + points[0].y) / 2;
  parts.push(`M${mx.toFixed(1)},${my.toFixed(1)}`);

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const midX = (points[i].x + points[next].x) / 2;
    const midY = (points[i].y + points[next].y) / 2;
    parts.push(`Q${points[i].x.toFixed(1)},${points[i].y.toFixed(1)},${midX.toFixed(1)},${midY.toFixed(1)}`);
  }

  parts.push('Z');
  return parts.join('');
}

function RobotAvatar({ isSessionActive, status, isListening, isSpeaking, isMuted, onClick, getFrequencyData }) {
  const svgPathRef = useRef(null);
  const smoothedRef = useRef(new Float32Array(NUM_POINTS));
  const rafRef = useRef(null);

  const getState = () => {
    if (!isSessionActive) return 'idle';
    if (isSpeaking || status === 'speaking') return 'speaking';
    if (status === 'processing') return 'processing';
    if (isListening || status === 'listening') return 'listening';
    return 'active';
  };

  const state = getState();
  const isVoiceActive = (state === 'listening' && !isMuted) || state === 'speaking';

  const getBaseRadius = useCallback(() => {
    return window.innerWidth >= 768 ? BASE_RADIUS_DESKTOP : BASE_RADIUS;
  }, []);

  // Animation loop — direct DOM manipulation, no React re-renders
  useEffect(() => {
    if (!isVoiceActive || !getFrequencyData) {
      // Reset smoothed values when not active
      smoothedRef.current.fill(0);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const smoothed = smoothedRef.current;

    const animate = () => {
      const pathEl = svgPathRef.current;
      if (!pathEl) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const freqData = getFrequencyData();
      const baseRadius = getBaseRadius();
      const cx = baseRadius + DISPLACEMENT_SCALE + 2;
      const cy = cx;

      if (freqData) {
        const binCount = Math.min(freqData.length, NUM_POINTS);

        // 3-tap smoothing on raw bins first (reduces spiky noise)
        const avgBins = new Float32Array(binCount);
        for (let i = 0; i < binCount; i++) {
          const prev = (i - 1 + binCount) % binCount;
          const next = (i + 1) % binCount;
          avgBins[i] = freqData[prev] * 0.25 + freqData[i] * 0.5 + freqData[next] * 0.25;
        }

        // Map shuffled bin → circle position so mountains/valleys scatter randomly
        for (let i = 0; i < NUM_POINTS; i++) {
          const bin = BIN_SHUFFLE[i] % binCount;
          const target = (avgBins[bin] / 255) * DISPLACEMENT_SCALE;
          // Lerp for smooth transitions between frames
          smoothed[i] += (target - smoothed[i]) * SMOOTH_FACTOR;
        }
      } else {
        // Decay to zero when no data
        for (let i = 0; i < NUM_POINTS; i++) {
          smoothed[i] *= 0.85;
        }
      }

      // Compute SVG path points around the circle
      const points = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = (i / NUM_POINTS) * Math.PI * 2 - Math.PI / 2;
        const r = baseRadius + smoothed[i];
        points.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }

      pathEl.setAttribute('d', buildSmoothPath(points));
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isVoiceActive, getFrequencyData, getBaseRadius]);

  const svgSize = (getBaseRadius() + DISPLACEMENT_SCALE + 2) * 2;

  return (
    <button
      className={`robot-container ${state} ${isSessionActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={isSessionActive ? 'Stop conversation' : 'Start conversation'}
    >
      {/* LED Ring — CSS circle for non-voice states */}
      <div className={`led-ring ${isVoiceActive ? 'hidden' : ''}`} />

      {/* SVG Waveform Ring — visible during listening/speaking */}
      {isVoiceActive && (
        <svg
          className={`waveform-ring ${state}`}
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
        >
          <defs>
            <filter id="waveform-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            ref={svgPathRef}
            className="waveform-path"
            fill="none"
            strokeWidth="3"
            filter="url(#waveform-glow)"
          />
        </svg>
      )}

      {/* Robot Face */}
      <div className="robot-face">
        <div className="robot-eyes">
          <div className={`robot-eye left ${state}`}>
            <div className="eye-lid" />
          </div>
          <div className={`robot-eye right ${state}`}>
            <div className="eye-lid" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default RobotAvatar;
