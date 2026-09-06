import type { ResultadoCarteira } from "@/types/estrategiaResultados";
import type { Ativo } from "@/lib/carteira/types";
import { Rebalanceamento } from "./Rebalanceamento";

interface Props {
  carteira: ResultadoCarteira | null;
  clienteId: string;
  loading?: boolean;
}

export function GestaoInvestimentos({ carteira, clienteId, loading }: Props) {
  if (!carteira) {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 36, display: "block", marginBottom: 10, animation: "spin 1s linear infinite" }} />
          Carregando dados da carteira...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#9CA3AF", fontSize: 14 }}>
        <i className="ti ti-chart-pie-off" style={{ fontSize: 36, display: "block", marginBottom: 10 }} />
        Dados de carteira não disponíveis.<br />
        Salve a carteira no Financial Planning primeiro.
      </div>
    );
  }

  const ativosIniciais: Ativo[] = carteira.ativosAtuais ?? [];

  return (
    <Rebalanceamento
      carteira={carteira}
      clienteId={clienteId}
      ativosIniciais={ativosIniciais}
    />
  );
}
