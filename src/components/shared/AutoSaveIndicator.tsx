type Status = 'idle' | 'salvando' | 'salvo' | 'erro';

const CONFIGS = {
  salvando: { icone: 'ti-loader-2',      texto: 'Salvando...',             cor: '#6B7280', spin: true  },
  salvo:    { icone: 'ti-circle-check',  texto: 'Salvo automaticamente',   cor: '#15803D', spin: false },
  erro:     { icone: 'ti-alert-circle',  texto: 'Erro ao salvar',          cor: '#B91C1C', spin: false },
} as const;

export function AutoSaveIndicator({ status }: { status: Status }) {
  if (status === 'idle') return null;
  const c = CONFIGS[status];
  return (
    <>
      <style>{`@keyframes fp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, color: c.cor, flexShrink: 0,
        marginLeft: 12, whiteSpace: 'nowrap',
        transition: 'opacity 300ms',
      }}>
        <i
          className={`ti ${c.icone}`}
          style={{ fontSize: 13, animation: c.spin ? 'fp-spin 1s linear infinite' : 'none' }}
        />
        {c.texto}
      </div>
    </>
  );
}
