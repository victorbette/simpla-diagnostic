import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { SaveProvider, useSaveContext } from "@/contexts/SaveContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthRoute } from "@/components/AuthRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";

const BANNER: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 20px",
  borderRadius: 10,
  boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
  fontSize: 14,
  fontFamily: "Poppins, sans-serif",
  whiteSpace: "nowrap",
};

function UpdateBanners() {
  const { salvarTudo } = useSaveContext();
  const { temUpdate, recarregando, salvandoAntes, aplicarUpdate, dispensar } = useAutoUpdate(salvarTudo);

  if (salvandoAntes) {
    return (
      <div style={{ ...BANNER, backgroundColor: "#1E3A8A", color: "white" }}>
        <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
        <span>Salvando dados antes de atualizar...</span>
      </div>
    );
  }

  if (recarregando) {
    return (
      <div style={{ ...BANNER, backgroundColor: "#1E3A8A", color: "white" }}>
        <span>Atualizando o aplicativo...</span>
      </div>
    );
  }

  if (temUpdate) {
    return (
      <div style={{ ...BANNER, backgroundColor: "white", border: "1px solid #BFDBFE", color: "#1E3A8A" }}>
        <span>Nova versão disponível!</span>
        <button
          onClick={() => { void aplicarUpdate(); }}
          disabled={salvandoAntes}
          style={{
            backgroundColor: "#1E3A8A", color: "white",
            border: "none", borderRadius: 6,
            padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600,
          }}
        >
          Atualizar agora
        </button>
        <button
          onClick={dispensar}
          style={{
            background: "none", border: "none",
            color: "#9CA3AF", fontSize: 18, cursor: "pointer", lineHeight: 1,
          }}
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <SaveProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route element={<AuthRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
        <UpdateBanners />
      </AuthProvider>
    </SaveProvider>
  );
}

export default App;
