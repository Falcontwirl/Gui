import { useState, useCallback, useRef } from 'react';

export default function useSSE() {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState('');
  const abortRef = useRef(null);

  const startStream = useCallback(async (url, body) => {
    setStreaming(true);
    setText('');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulated += data.text;
                setText(accumulated);
              }
              if (data.done) {
                setStreaming(false);
                return accumulated;
              }
              if (data.error) {
                setStreaming(false);
                return accumulated || `Error: ${data.error}`;
              }
            } catch {}
          }
        }
      }

      setStreaming(false);
      return accumulated;
    } catch (err) {
      setStreaming(false);
      return `Error: ${err.message}`;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
  }, []);

  return { streaming, text, startStream, cancel, setText };
}
