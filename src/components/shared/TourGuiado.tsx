import { useState, useEffect, type CSSProperties } from 'react';

interface PassoTour {
  titulo: string;
  conteudo: string;
  alvo?: string;
  posicao?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourGuiadoProps {
  passos: PassoTour[];
  ativo: boolean;
  onConcluir: () => void;
  onPular: () => void;
}

export const TourGuiado = ({ passos, ativo, onConcluir, onPular }: TourGuiadoProps) => {
  const [passo, setPasso] = useState(0);
  const [posicaoBox, setPosicaoBox] = useState<CSSProperties>({
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
  });
  const [posicaoDestaque, setPosicaoDestaque] = useState<DOMRect | null>(null);

  const passoAtual = passos[passo];

  useEffect(() => {
    if (ativo) setPasso(0);
  }, [ativo]);

  useEffect(() => {
    if (!ativo || !passoAtual?.alvo) {
      setPosicaoDestaque(null);
      setPosicaoBox({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const el = document.querySelector(passoAtual.alvo);
    if (!el) {
      setPosicaoDestaque(null);
      setPosicaoBox({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const rect = el.getBoundingClientRect();
    setPosicaoDestaque(rect);

    const pos = passoAtual.posicao ?? 'bottom';
    const margin = 16;
    const boxW = 340;
    const boxH = 220;

    if (pos === 'bottom') {
      setPosicaoBox({
        top: `${rect.bottom + margin}px`,
        left: `${Math.max(margin, Math.min(rect.left, window.innerWidth - boxW - margin))}px`,
        transform: 'none',
      });
    } else if (pos === 'top') {
      setPosicaoBox({
        top: `${rect.top - boxH - margin}px`,
        left: `${Math.max(margin, Math.min(rect.left, window.innerWidth - boxW - margin))}px`,
        transform: 'none',
      });
    } else if (pos === 'right') {
      setPosicaoBox({
        top: `${Math.max(margin, rect.top)}px`,
        left: `${rect.right + margin}px`,
        transform: 'none',
      });
    } else {
      setPosicaoBox({
        top: `${Math.max(margin, rect.top)}px`,
        left: `${Math.max(margin, rect.left - boxW - margin)}px`,
        transform: 'none',
      });
    }
  }, [passo, ativo, passoAtual]);

  if (!ativo) return null;

  const avancar = () => {
    if (passo < passos.length - 1) {
      setPasso(p => p + 1);
    } else {
      onConcluir();
    }
  };

  const voltar = () => {
    if (passo > 0) setPasso(p => p - 1);
  };

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1998,
        background: 'rgba(0,0,0,0.65)',
        pointerEvents: 'none',
      }} />

      {/* Destaque do elemento */}
      {posicaoDestaque && (
        <div style={{
          position: 'fixed',
          zIndex: 1999,
          top: posicaoDestaque.top - 4,
          left: posicaoDestaque.left - 4,
          width: posicaoDestaque.width + 8,
          height: posicaoDestaque.height + 8,
          borderRadius: 10,
          boxShadow: '0 0 0 4px #2563EB, 0 0 0 9999px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
          transition: 'all 300ms ease',
        }} />
      )}

      {/* Caixa do tour */}
      <div style={{
        position: 'fixed',
        zIndex: 2000,
        width: 340,
        background: 'white',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        padding: '22px 24px',
        transition: 'all 300ms ease',
        ...posicaoBox,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#2563EB',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Passo {passo + 1} de {passos.length}
          </div>
          <button
            onClick={onPular}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              fontSize: 11,
              padding: 0,
            }}
          >
            Pular tour
          </button>
        </div>

        {/* Barra de progresso */}
        <div style={{
          height: 3,
          background: '#F3F4F6',
          borderRadius: 99,
          marginBottom: 16,
        }}>
          <div style={{
            height: 3,
            background: '#2563EB',
            borderRadius: 99,
            width: `${((passo + 1) / passos.length) * 100}%`,
            transition: 'width 300ms ease',
          }} />
        </div>

        {/* Título */}
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 10,
        }}>
          {passoAtual.titulo}
        </div>

        {/* Conteúdo */}
        <div style={{
          fontSize: 12,
          color: '#374151',
          lineHeight: 1.85,
          marginBottom: 20,
          whiteSpace: 'pre-wrap',
        }}>
          {passoAtual.conteudo}
        </div>

        {/* Botões */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            onClick={voltar}
            disabled={passo === 0}
            style={{
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              cursor: passo === 0 ? 'default' : 'pointer',
              color: passo === 0 ? '#D1D5DB' : '#6B7280',
            }}
          >
            ← Anterior
          </button>

          <button
            onClick={avancar}
            style={{
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {passo === passos.length - 1 ? '✓ Começar agora!' : 'Próximo →'}
          </button>
        </div>
      </div>
    </>
  );
};
