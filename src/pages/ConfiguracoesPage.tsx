import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConfigConsultor } from "@/lib/documentoConfig";
import { CONFIG_CONSULTOR_DEFAULT } from "@/lib/documentoConfig";

interface Props {
  onFechar: () => void;
}

export function ConfiguracoesPage({ onFechar }: Props) {
  const [config, setConfig] = useState<ConfigConsultor>(() => {
    try {
      const salvo = localStorage.getItem("config_consultor");
      return salvo ? JSON.parse(salvo) : CONFIG_CONSULTOR_DEFAULT;
    } catch {
      return CONFIG_CONSULTOR_DEFAULT;
    }
  });

  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Senha
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaStatus, setSenhaStatus] = useState<"idle" | "success" | "error">("idle");
  const [senhaErro, setSenhaErro] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  function salvarConfig() {
    setSalvando(true);
    localStorage.setItem("config_consultor", JSON.stringify(config));
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  async function alterarSenha() {
    setAlterandoSenha(true);
    setSenhaStatus("idle");
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setAlterandoSenha(false);
    if (error) {
      setSenhaStatus("error");
      setSenhaErro(error.message);
    } else {
      setSenhaStatus("success");
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSenhaStatus("idle"), 3000);
    }
  }

  const senhasNaoConcidem = confirmarSenha !== "" && novaSenha !== confirmarSenha;
  const senhaValida = novaSenha.length >= 6 && novaSenha === confirmarSenha;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "#F0F7FF",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ backgroundColor: "#1E3A8A", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onFechar}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", color: "white", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Voltar
          </button>
          <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Configurações</span>
        </div>
        {salvo && (
          <span style={{ color: "#86EFAC", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-check" style={{ fontSize: 14 }} />
            Salvo
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24, flex: 1, width: "100%" }}>

        {/* ── Perfil do Consultor ── */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <i className="ti ti-user-circle" style={{ fontSize: 18, color: "#2563EB" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Perfil do Consultor</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={config.nomeCompleto}
                onChange={(e) => setConfig({ ...config, nomeCompleto: e.target.value })}
                style={{ width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>
                Credenciais
              </label>
              <input
                type="text"
                value={config.credenciais}
                placeholder="CEA · Consultor de Valores Mobiliários"
                onChange={(e) => setConfig({ ...config, credenciais: e.target.value })}
                style={{ width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>
                Texto Sobre o Consultor
              </label>
              <textarea
                rows={4}
                value={config.descricao}
                placeholder="Descreva sua formação e credenciais..."
                onChange={(e) => setConfig({ ...config, descricao: e.target.value })}
                style={{ width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                Aparece no documento de Estratégia Inicial
              </p>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <i className="ti ti-file-description" style={{ fontSize: 18, color: "#2563EB" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Disclaimer — Documento de Estratégia Inicial</span>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
            Este texto aparece na segunda página do documento enviado ao cliente.
          </p>
          <textarea
            rows={10}
            value={config.textoDisclaimer}
            onChange={(e) => setConfig({ ...config, textoDisclaimer: e.target.value })}
            style={{ width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: 12, fontSize: 13, color: "#111827", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }}
          />
          <button
            onClick={() => setConfig({ ...config, textoDisclaimer: CONFIG_CONSULTOR_DEFAULT.textoDisclaimer })}
            style={{ fontSize: 12, color: "#6B7280", background: "none", border: "none", cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
          >
            <i className="ti ti-refresh" style={{ fontSize: 12 }} />
            Restaurar texto padrão
          </button>
        </div>

        {/* ── Segurança ── */}
        <div style={{ background: "white", border: "0.5px solid #E5E7EB", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <i className="ti ti-lock" style={{ fontSize: 18, color: "#2563EB" }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Segurança</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>
                Nova Senha
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: 500 }}>
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", border: `0.5px solid ${senhasNaoConcidem ? "#FCA5A5" : "#E5E7EB"}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#111827", outline: "none", boxSizing: "border-box" }}
              />
              {senhasNaoConcidem && (
                <p style={{ fontSize: 11, color: "#B91C1C", marginTop: 4 }}>As senhas não coincidem</p>
              )}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                onClick={alterarSenha}
                disabled={!senhaValida || alterandoSenha}
                style={{ width: "100%", backgroundColor: senhaValida && !alterandoSenha ? "#2563EB" : "#BFDBFE", color: "white", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: senhaValida && !alterandoSenha ? "pointer" : "not-allowed" }}
              >
                {alterandoSenha ? "Alterando..." : "Alterar Senha"}
              </button>
              {senhaStatus === "success" && (
                <p style={{ fontSize: 12, color: "#15803D", marginTop: 8 }}>✓ Senha alterada com sucesso</p>
              )}
              {senhaStatus === "error" && (
                <p style={{ fontSize: 12, color: "#B91C1C", marginTop: 8 }}>✗ {senhaErro}</p>
              )}
            </div>
          </div>
        </div>

        {/* Spacer to ensure footer doesn't overlap last card */}
        <div style={{ height: 80 }} />
      </div>

      {/* ── Footer / Salvar ── */}
      <div style={{ position: "sticky", bottom: 0, background: "white", borderTop: "0.5px solid #E5E7EB", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={onFechar}
          style={{ fontSize: 13, color: "#6B7280", background: "white", border: "0.5px solid #E5E7EB", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          onClick={salvarConfig}
          style={{ fontSize: 13, fontWeight: 600, color: "white", background: "#2563EB", border: "none", borderRadius: 8, padding: "8px 24px", cursor: "pointer" }}
        >
          {salvando ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
