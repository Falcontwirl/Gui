import { useState, useEffect, useRef } from 'react';
import BackBar from '../BackBar';
import DocsSidebar from './DocsSidebar';
import DocsSection from './DocsSection';
import { DOC_SECTIONS } from './docsContent';

export default function DocsPage() {
  const [activeId, setActiveId] = useState(DOC_SECTIONS[0]?.id || '');
  const observerRef = useRef(null);

  useEffect(() => {
    const sectionEls = DOC_SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
    if (!sectionEls.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const el of sectionEls) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg-base)',
    }}>
      <BackBar label="Documentation" to="/upload" />

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
      }}>
        <div className="docs-layout" style={{
          display: 'flex',
          gap: 32,
          width: '100%',
          maxWidth: 960,
        }}>
          <DocsSidebar sections={DOC_SECTIONS} activeId={activeId} />

          <main style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 48,
          }}>
            {DOC_SECTIONS.map(section => (
              <DocsSection key={section.id} section={section} />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
