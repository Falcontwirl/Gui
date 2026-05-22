import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { usePostHog } from '@posthog/react';
import { Upload } from 'lucide-react';
import useStore from '../../store/useStore';
import { parseZipFile, extractImports, resolveImportPaths } from '../../utils/fileParser';
import { API_BASE } from '../../lib/api';
import { usePipelineListener } from '../../hooks/usePipelineListener';
import { fetchAndLoadProject } from '../../lib/loadProject';

export default function ZipUploadPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = useStore(s => s.user);
  const setProcessingStatus = useStore(s => s.setProcessingStatus);
  const setProjectId = useStore(s => s.setProjectId);
  const { startListening } = usePipelineListener();
  const posthog = usePostHog();

  const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const f = e.dataTransfer.files;
    if (f.length > 0 && f[0].name.endsWith('.zip')) handleUpload(f[0]);
  }, []);

  const handleUpload = async (file) => {
    posthog.capture('repo_uploaded', { source: 'zip_upload' });
    navigate('/processing', { replace: true });
    setProcessingStatus('Reading your files...');
    try {
      const { fileTree, fileContents } = await parseZipFile(file);
      setProcessingStatus('Extracting imports...');
      const imports = extractImports(fileContents);
      const importEdges = resolveImportPaths(imports, fileTree);
      setProcessingStatus('Starting analysis pipeline...');
      const res = await fetch(`${API_BASE}/api/pipeline/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileTree, fileContents, importEdges, projectName: file.name.replace('.zip', ''), userId: user?.id }),
      });
      const { projectId, cached } = await res.json();
      setProjectId(projectId);
      localStorage.setItem('gui_active_project', projectId);
      if (cached) {
        const ok = await fetchAndLoadProject(projectId);
        if (ok) navigate(`/explore/${projectId}`, { replace: true });
        else setProcessingStatus('Failed to load cached project');
      } else {
        startListening(projectId);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setProcessingStatus('Upload failed: ' + err.message);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef} type="file" accept=".zip"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
      />
      <div
        role="button" tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        style={{
          minHeight: 180,
          padding: 'clamp(1.5rem, 4vw, 2.5rem)',
          borderRadius: 'var(--radius-lg)',
          border: `2px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border-visible)'}`,
          background: isDragging ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, cursor: 'pointer',
          transition: `all var(--duration-base) var(--ease-out)`, textAlign: 'center',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Upload size={20} strokeWidth={1.5} color="var(--color-accent)" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Drop a .zip here
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            or <span style={{ color: 'var(--color-accent-active)', textDecoration: 'underline' }}>browse</span> your machine — works with any language
          </p>
        </div>
      </div>
    </>
  );
}
