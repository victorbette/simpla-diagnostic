import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  texto: string;
  posicao?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ texto, posicao = 'top' }: TooltipProps) => {
  const [visivel, setVisivel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisivel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={() => setVisivel(v => !v)}
        style={{
          width: 16, height: 16,
          borderRadius: '50%',
          background: visivel ? '#2563EB' : '#E5E7EB',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700,
          color: visivel ? 'white' : '#6B7280',
          flexShrink: 0,
          transition: 'all 150ms',
        }}
      >
        ?
      </button>

      {visivel && (
        <div style={{
          position: 'absolute',
          ...(posicao === 'top' ? {
            bottom: '100%', left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
          } : posicao === 'bottom' ? {
            top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
          } : posicao === 'right' ? {
            left: '100%', top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: 6,
          } : {
            right: '100%', top: '50%',
            transform: 'translateY(-50%)',
            marginRight: 6,
          }),
          zIndex: 1000,
          background: '#1E293B',
          color: 'white',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 11,
          lineHeight: 1.6,
          width: 240,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'pre-wrap',
        }}>
          {texto}
          <div style={{
            position: 'absolute',
            width: 0, height: 0,
            ...(posicao === 'top' ? {
              bottom: -5, left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1E293B',
            } : posicao === 'bottom' ? {
              top: -5, left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid #1E293B',
            } : posicao === 'right' ? {
              left: -5, top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid #1E293B',
            } : {
              right: -5, top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '5px solid #1E293B',
            }),
          }} />
        </div>
      )}
    </div>
  );
};
