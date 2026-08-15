import { useState, useEffect } from 'react';

interface PassoTour {
  titulo: string;
  conteudo: string;
}

interface TourGuiadoProps {
  passos: PassoTour[];
  ativo: boolean;
  onConcluir: () => void;
  onPular: () => void;
}

export const TourGuiado = ({ passos, ativo, onConcluir, onPular }: TourGuiadoProps) => {
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    if (ativo) setPasso(0);
  }, [ativo]);

  if (!ativo) return null;

  const passoAtual = passos[passo];
  const ehUltimo = passo === passos.length - 1;

  const avancar = () => {
    if (!ehUltimo) {
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
      {/* Overlay escurecido */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1998,
        background: 'rgba(0,0,0,0.65)',
      }} />

      {/* Card centralizado */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2000,
        width: 420,
        maxWidth: 'calc(100vw - 40px)',
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        padding: '28px 32px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#2563EB',
            letterSpacing: '0.06em',
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
          height: 4,
          background: '#F3F4F6',
          borderRadius: 99,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            height: 4,
            background: '#2563EB',
            borderRadius: 99,
            width: `${((passo + 1) / passos.length) * 100}%`,
            transition: 'width 350ms ease',
          }} />
        </div>

        {/* Título */}
        <div style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 12,
          lineHeight: 1.4,
        }}>
          {passoAtual.titulo}
        </div>

        {/* Conteúdo */}
        <div style={{
          fontSize: 13,
          color: '#374151',
          lineHeight: 1.9,
          marginBottom: 24,
          whiteSpace: 'pre-wrap',
        }}>
          {passoAtual.conteudo}
        </div>

        {/* Indicadores de passo (bolinhas) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 20,
        }}>
          {passos.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === passo ? 20 : 7,
                height: 7,
                borderRadius: 99,
                background: i === passo ? '#2563EB' : i < passo ? '#93C5FD' : '#E5E7EB',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>

        {/* Botões */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            onClick={voltar}
            disabled={passo === 0}
            style={{
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13,
              cursor: passo === 0 ? 'default' : 'pointer',
              color: passo === 0 ? '#D1D5DB' : '#6B7280',
              fontWeight: 500,
            }}
          >
            ← Anterior
          </button>

          <button
            onClick={avancar}
            style={{
              background: ehUltimo ? '#15803D' : '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '10px 28px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 200ms',
              flex: 1,
              textAlign: 'center',
            }}
          >
            {ehUltimo ? '✓ Começar agora!' : 'Próximo →'}
          </button>
        </div>
      </div>
    </>
  );
};
