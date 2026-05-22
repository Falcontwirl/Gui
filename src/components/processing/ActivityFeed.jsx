import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 3) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function ActivityFeed({ statusMessage }) {
  const [messages, setMessages] = useState([]);
  const seenRef = useRef(new Set());
  const tickRef = useRef(null);
  const [, forceUpdate] = useState(0);

  // Add new messages as they arrive
  useEffect(() => {
    if (!statusMessage || seenRef.current.has(statusMessage)) return;
    seenRef.current.add(statusMessage);
    setMessages((prev) => {
      const next = [{ text: statusMessage, ts: Date.now() }, ...prev];
      return next.slice(0, 5);
    });
  }, [statusMessage]);

  // Tick relative timestamps every 3s
  useEffect(() => {
    tickRef.current = setInterval(() => forceUpdate((n) => n + 1), 3000);
    return () => clearInterval(tickRef.current);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      className="z-10 w-full px-4"
      style={{ maxWidth: 420 }}
    >
      <div
        className="rounded-lg px-4 py-3"
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.text}
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1 - i * 0.18, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex items-baseline justify-between gap-3 overflow-hidden"
              style={{ paddingTop: i === 0 ? 0 : 4, paddingBottom: 4 }}
            >
              <span
                className="text-xs truncate"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--color-text-secondary)',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ color: 'var(--color-accent)', marginRight: 6 }}>{'>'}</span>
                {msg.text}
              </span>
              <span
                className="text-xs shrink-0"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.65rem',
                }}
              >
                {relativeTime(msg.ts)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
