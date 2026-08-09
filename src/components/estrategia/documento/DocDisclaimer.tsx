import type { ConfigConsultor } from "@/lib/documentoConfig";
import { PaginaDoc } from "./PaginaDoc";
import { HeaderSecao } from "./HeaderSecao";
import { RodapePagina } from "./RodapePagina";

interface Props {
  nomeCliente: string;
  config: ConfigConsultor;
  onConfigChange?: (c: ConfigConsultor) => void;
}

const textoDisclaimer = `Todas as recomendações aqui apresentadas foram elaboradas com objetivo de orientar e auxiliar em suas decisões financeiras e de investimento; portanto, o material não se constitui em oferta de compra e venda de nenhum título ou valor mobiliário contido. O investidor será responsável, de forma exclusiva, pelas suas decisões de investimento e implementação de estratégias financeiras.

A Simpla Invest segue as regras de conduta expressas nos termos da Resolução CVM nº 19/2021. Além disso, não está em situação que possa afetar a imparcialidade do relatório ou que possa configurar conflito de interesse.

A elaboração desse material se deu de maneira independente e individualizada, e o conteúdo nele divulgado não pode ser copiado, reproduzido ou distribuído, no todo ou em parte, a terceiros, sem autorização prévia.`;

export function DocDisclaimer({ nomeCliente }: Props) {
  return (
    <PaginaDoc rodape={<RodapePagina nomeCliente={nomeCliente} />}>
      <HeaderSecao titulo="Disclaimer" />

      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.9, margin: "0 0 20px", whiteSpace: "pre-line" as const, textAlign: "justify" as const }}>
        {textoDisclaimer}
      </p>

      {/* Logo CVM */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <img
          src="/logocvm.png"
          alt="CVM — Comissão de Valores Mobiliários"
          style={{ height: 42, objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>

      {/* Cards Ouvidoria e Comunidade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ background: "#F0F7FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <i className="ti ti-headset" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>Ouvidoria Simpla Invest</span>
          </div>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
            Telefone: (32) 3198-2742<br />
            Ou acesse clicando{' '}
            <a
              href="https://wa.me/553231982742"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563EB' }}
            >
              Aqui
            </a>
          </div>
        </div>

        <div style={{ background: "#F0F7FF", border: "0.5px solid #BFDBFE", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <i className="ti ti-users" style={{ fontSize: 16, color: "#2563EB" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>Comunidade de Clientes Simpla Invest</span>
          </div>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.7 }}>
            Acesse clicando{' '}
            <a
              href="https://chat.whatsapp.com/IyayLHuwHOK9xG9JImuMo9"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563EB' }}
            >
              Aqui
            </a>
          </div>
        </div>
      </div>
    </PaginaDoc>
  );
}
