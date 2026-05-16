import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="p-8 text-2xl font-bold">Simpla Diagnostic</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
