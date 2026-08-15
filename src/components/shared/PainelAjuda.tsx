import { useState } from 'react';

interface SecaoAjuda {
  titulo: string;
  conteudo: string;
}

interface PainelAjudaProps {
  titulo: string;
  secoes: SecaoAjuda[];
  aberto: boolean;
  onFechar: () => void;
}

export const PainelAjuda = ({ titulo, secoes, aberto, onFechar }: PainelAjudaProps) => {
  const [secaoAberta, setSecaoAberta] = useState<number | null>(0);

  if (!aberto) return null;

  return (
    <>
      <div
        onClick={onFechar}
        style={{
          position: 'fixed',
          inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.2)',
        }}
      />

      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 360,
        zIndex: 999,
        background: 'white',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0, background: 'white',
          zIndex: 1,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600,
              color: '#2563EB', letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Central de Ajuda
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {titulo}
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: '#F3F4F6', border: 'none',
              borderRadius: 6, padding: '6px 8px',
              cursor: 'pointer', color: '#6B7280',
              fontSize: 16,
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: '12px 0', flex: 1 }}>
          {secoes.map((secao, idx) => (
            <div key={idx} style={{ borderBottom: '0.5px solid #F3F4F6' }}>
              <button
                onClick={() => setSecaoAberta(secaoAberta === idx ? null : idx)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: secaoAberta === idx ? '#F8FAFF' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: secaoAberta === idx ? '#2563EB' : '#111827',
                }}>
                  {secao.titulo}
                </span>
                <i className={`ti ${secaoAberta === idx ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                  style={{ fontSize: 14, color: '#9CA3AF', flexShrink: 0 }} />
              </button>

              {secaoAberta === idx && (
                <div style={{
                  padding: '4px 20px 16px',
                  fontSize: 12, color: '#374151',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  background: '#F8FAFF',
                }}>
                  {secao.conteudo}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #F3F4F6',
          fontSize: 11, color: '#9CA3AF',
          textAlign: 'center',
        }}>
          Dúvidas? Entre em contato com o suporte.
        </div>
      </div>
    </>
  );
};
