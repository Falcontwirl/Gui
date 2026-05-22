// inspector.jsx — right-side panel with concept details and reading-order nav.

function Inspector({ concept, onClose, onNext, onPrev, onExpand, isExpanded, hasSubs, readingIndex, totalConcepts }) {
  if (!concept) return null;
  const colors = CONCEPT_COLORS[concept.color] || CONCEPT_COLORS.gray;

  return (
    <aside className="inspector" role="dialog" aria-label={concept.name}>
      <div className="insp-head">
        <div className="insp-crumb">
          <span className="insp-order-chip" style={{ background: colors.accent }}>
            {concept.order}
          </span>
          <span className="insp-step">Step {readingIndex + 1} of {totalConcepts}</span>
        </div>
        <button className="insp-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      <h2 className="insp-title" style={{ color: colors.text }}>{concept.name}</h2>
      <div className="insp-meta">
        <span className="insp-chip" style={{ background: colors.fill, color: colors.text }}>
          {concept.importance}
        </span>
        <span className="insp-meta-sep">·</span>
        <span className="insp-meta-text">{concept.fileCount} files</span>
      </div>

      <p className="insp-summary">{concept.summary}</p>

      {hasSubs && (
        <button className="insp-expand" onClick={onExpand} style={{ borderColor: colors.accent, color: colors.accent }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {isExpanded
              ? <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              : <><path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>
            }
          </svg>
          {isExpanded ? 'Collapse sub-concepts' : 'Expand into sub-concepts'}
        </button>
      )}

      <div className="insp-divider" />

      <div className="insp-nav">
        <button className="insp-nav-btn" onClick={onPrev} disabled={readingIndex === 0}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 2L3 6l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          Previous
        </button>
        <button className="insp-nav-btn primary" onClick={onNext}
          disabled={readingIndex === totalConcepts - 1}
          style={{ background: colors.accent }}>
          Next step
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </button>
      </div>
    </aside>
  );
}

// Sub-concept detail inline panel — shown when expanded
function SubConceptPanel({ parentId, subs, onSelect }) {
  if (!subs || !subs.length) return null;
  return (
    <div className="sub-panel">
      <div className="sub-panel-head">Sub-concepts of {parentId}</div>
      <div className="sub-panel-list">
        {subs.map(s => (
          <button key={s.id} className="sub-panel-item" onClick={() => onSelect(s)}>
            <div className="sub-panel-name">{s.name}</div>
            <div className="sub-panel-summary">{s.summary}</div>
            <div className="sub-panel-meta">{s.fileCount} files</div>
          </button>
        ))}
      </div>
    </div>
  );
}

window.Inspector = Inspector;
window.SubConceptPanel = SubConceptPanel;
