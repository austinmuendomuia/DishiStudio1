import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

// Shows on opens: 1, 4, 7, 10 ... → (count - 1) % 3 === 0
const shouldShowPopup = (count) => (count - 1) % 3 === 0;

export default function PremiumPopup({ userId, username }) {
  const [showPopup, setShowPopup]           = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [loading, setLoading]               = useState(false);

  // useRef instead of useState so StrictMode double-invoke doesn't re-run the effect
  const hasTracked = useRef(false);

  useEffect(() => {
    // Guard: only run once per real mount, even in React StrictMode
    if (hasTracked.current) return;
    if (!userId) return;   // wait until user is loaded from Supabase auth

    hasTracked.current = true;

    const trackOpen = async () => {
      try {
        // ── 1. Fetch existing row for this user ──────────────────
        const { data: rows, error: fetchError } = await supabase
          .from('popup_tracking')
          .select('open_count, premium_started')
          .eq('userid', userId);

        if (fetchError) throw fetchError;

        const row = rows && rows.length > 0 ? rows[0] : null;

        // ── 2. User already started premium → never show again ───
        if (row?.premium_started === true) return;

        const newCount = (row?.open_count ?? 0) + 1;

        // ── 3. Upsert the new count ──────────────────────────────
        const { error: upsertError } = await supabase
          .from('popup_tracking')
          .upsert(
            {
              userid:          userId,
              username:        username || 'unknown',
              open_count:      newCount,
              premium_started: false,
              last_seen_at:    new Date().toISOString(),
            },
            { onConflict: 'userid' }   // update if userid already exists
          );

        if (upsertError) throw upsertError;

        // ── 4. Show on opens 1, 4, 7, 10 ... ────────────────────
        if (shouldShowPopup(newCount)) {
          setShowPopup(true);
        }

      } catch (err) {
        console.error('PremiumPopup tracking error:', err);
        // Do NOT show popup on error — prevents it appearing every refresh
        // when Supabase writes are failing
      }
    };

    trackOpen();
  }, [userId, username]);   // re-runs if userId changes (e.g. after login)


  // ── "Start Premium Now" clicked ───────────────────────────────
  const handleStartPremium = async () => {
    setLoading(true);
    try {
      // a) Insert into coming_soon_a (your dashboard record)
      const { error: insertError } = await supabase
        .from('coming_soon_a')
        .insert({
          userid:   userId,
          username: username || 'unknown',
          clicked:  true,
        });

      if (insertError) throw insertError;

      // b) Flip premium_started → true so popup never shows again
      const { error: updateError } = await supabase
        .from('popup_tracking')
        .update({ premium_started: true })
        .eq('userid', userId);

      if (updateError) throw updateError;

    } catch (err) {
      console.error('Failed to record premium intent:', err);
      // Still transition to coming soon even if write fails
    } finally {
      setLoading(false);
      setShowPopup(false);
      setShowComingSoon(true);
    }
  };

  // Dismiss handlers — hides UI only, nothing deleted in Supabase
  const handleClosePopup      = () => setShowPopup(false);
  const handleCloseComingSoon = () => setShowComingSoon(false);

  if (!showPopup && !showComingSoon) return null;

  return (
    <div style={styles.overlay}>

      {/* ── PREMIUM POPUP ─────────────────────────────────── */}
      {showPopup && (
        <div style={styles.modal}>
          <div style={styles.goldBar} />
          <button onClick={handleClosePopup} style={styles.closeBtn} aria-label="Close">✕</button>

          <div style={styles.badge}>✨ Upgrade Available</div>

          <h2 style={styles.heading}>
            Unlock the full <span style={styles.gold}>dishiStudio</span> experience
          </h2>

          <p style={styles.subheading}>
            Plan smarter, eat better, and spend less — with{' '}
            <strong style={styles.gold}>Premium</strong>.
          </p>

          <div style={styles.benefitsBox}>
            <div style={styles.benefit}>
              <span style={styles.icon}>🍽️</span>
              <span>
                <strong style={styles.gold}>Custom Meal Plans</strong>— Built for your cravings &amp; aligned with your goals. 
              </span>
            </div>
            <div style={styles.benefit}>
              <span style={styles.icon}>🛒</span>
              <span>
                <strong style={styles.gold}>Smart Shopping List</strong>— Your shopping list, organized and ready to go.
              </span>
            </div>
            <div style={styles.benefit}>
              <span style={styles.icon}>🧂</span>
              <span>
                <strong style={styles.gold}>Zero-Waste Cooking</strong> — We’ll turn your leftover ingredients into a plan.
              </span>
            </div>
          </div>

          <div style={styles.pricingRow}>
            <span style={styles.originalPrice}>KSh 700</span>
            <span style={styles.discountPrice}>KSh 500</span>
            <span style={styles.discountBadge}>Save KSh 200</span>
          </div>

          <button onClick={handleStartPremium} style={styles.ctaBtn} disabled={loading}>
            {loading ? 'Please wait…' : '🚀 Start Premium Now'}
          </button>

          <p style={styles.disclaimer}>No commitment. Cancel any time.</p>
        </div>
      )}

      {/* ── COMING SOON ───────────────────────────────────── */}
      {showComingSoon && (
        <div style={{ ...styles.modal, ...styles.comingSoonModal }}>
          <div style={styles.goldBar} />
          <button onClick={handleCloseComingSoon} style={styles.closeBtn} aria-label="Close">✕</button>

          <div style={styles.comingSoonIcon}>🎉</div>

          <h2 style={{ ...styles.heading, color: '#f5c542' }}>You're on the list!</h2>

          <p style={styles.subheading}>
            Thank you for your interest in{' '}
            <strong style={styles.gold}>dishiStudio Premium</strong>.
            We’re putting the finishing touches on a smarter, more seamless way to manage your kitchen.
          </p>

          <p style={styles.subheading}>
            The best things are worth the wait.
            You’ll be among the first to experience the future of meal planning. ✨
          </p>

          <button onClick={handleCloseComingSoon} style={styles.ctaBtn}>
            Got it, thanks!
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles — black + gold, compact
// ─────────────────────────────────────────────
const GOLD       = '#f5c542';
const GOLD_DIM   = '#b8972e';
const BLACK      = '#111111';
const BLACK_SOFT = '#1c1c1c';
const GRAY_TEXT  = '#d1d5db';
const BORDER     = '#2e2e2e';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    position: 'relative',
    backgroundColor: BLACK,
    borderRadius: '16px',
    padding: '28px 24px 20px',
    maxWidth: '360px',
    width: '100%',
    boxShadow: `0 0 0 1px ${BORDER}, 0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(245,197,66,0.08)`,
    fontFamily: "'Segoe UI', sans-serif",
    textAlign: 'center',
    overflow: 'hidden',
  },
  comingSoonModal: {
    backgroundColor: BLACK_SOFT,
  },
  goldBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#6b7280',
    lineHeight: 1,
    padding: '4px',
    borderRadius: '50%',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#2a2200',
    color: GOLD,
    border: `1px solid ${GOLD_DIM}`,
    borderRadius: '999px',
    padding: '3px 12px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  heading: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#ffffff',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  gold: {
    color: GOLD,
  },
  subheading: {
    fontSize: '12.5px',
    color: GRAY_TEXT,
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  benefitsBox: {
    background: BLACK_SOFT,
    border: `1px solid ${BORDER}`,
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'left',
    marginBottom: '14px',
  },
  benefit: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
    marginBottom: '8px',
    fontSize: '12px',
    color: GRAY_TEXT,
    lineHeight: 1.5,
  },
  icon: {
    fontSize: '15px',
    flexShrink: 0,
    marginTop: '1px',
  },
  pricingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '14px',
  },
  originalPrice: {
    fontSize: '13px',
    color: '#6b7280',
    textDecoration: 'line-through',
  },
  discountPrice: {
    fontSize: '24px',
    fontWeight: 800,
    color: GOLD,
  },
  discountBadge: {
    fontSize: '11px',
    backgroundColor: '#2a2200',
    color: GOLD,
    border: `1px solid ${GOLD_DIM}`,
    borderRadius: '999px',
    padding: '2px 8px',
    fontWeight: 600,
  },
  ctaBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: '8px',
    letterSpacing: '0.02em',
  },
  disclaimer: {
    fontSize: '10.5px',
    color: '#4b5563',
    margin: 0,
  },
  comingSoonIcon: {
    fontSize: '36px',
    marginBottom: '10px',
  },
};