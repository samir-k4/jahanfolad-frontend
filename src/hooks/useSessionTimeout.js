import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getLastActivity, getLastRequestAt, markActivity } from "../api";
const TICK_MS = 1000;
const ACTIVITY_WRITE_MS = 5000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
export default function useSessionTimeout({
  enabled,
  idleSeconds,
  warnSeconds,
  expiresAt,
  onExpire,
}) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const keepAlive = useCallback(() => {
    markActivity();
    setSecondsLeft(null);
    apiFetch("/me").catch(() => {});
  }, []);
  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);
      return undefined;
    }
    const idleMs = Number(idleSeconds) > 0 ? Number(idleSeconds) * 1000 : 0;
    const warnMs = Math.min(Number(warnSeconds) > 0 ? Number(warnSeconds) * 1000 : 0, idleMs);
    const deadline = expiresAt ? new Date(expiresAt).getTime() : null;
    if (!getLastActivity()) markActivity();
    let expired = false;
    let lastWrite = 0;
    let pingedAt = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_MS) return;
      lastWrite = now;
      markActivity(now);
    };
    const expire = (reason) => {
      if (expired) return;
      expired = true;
      setSecondsLeft(null);
      onExpireRef.current?.(reason);
    };
    const tick = () => {
      const now = Date.now();
      if (deadline && Number.isFinite(deadline) && now >= deadline) {
        expire("expired");
        return;
      }
      if (!idleMs) {
        setSecondsLeft(null);
        return;
      }
      const idleFor = now - (getLastActivity() ?? now);
      if (idleFor >= idleMs) {
        expire("idle");
        return;
      }
      if (idleFor >= idleMs - warnMs) {
        setSecondsLeft(Math.max(1, Math.ceil((idleMs - idleFor) / 1000)));
        return;
      }
      setSecondsLeft(null);
      const quietFor = now - Math.max(getLastRequestAt(), pingedAt);
      const activeSincePing = (getLastActivity() ?? 0) > pingedAt;
      if (activeSincePing && quietFor >= idleMs / 2) {
        pingedAt = now;
        apiFetch("/me").catch(() => {});
      }
    };
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );
    document.addEventListener("visibilitychange", tick);
    const timer = window.setInterval(tick, TICK_MS);
    tick();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [enabled, idleSeconds, warnSeconds, expiresAt]);
  return { secondsLeft, keepAlive };
}
