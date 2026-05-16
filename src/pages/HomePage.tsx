import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Simpla Diagnostic</h1>
      <p className="text-muted-foreground">Logado como: {user?.email}</p>
      <Button variant="outline" onClick={signOut}>
        Sair
      </Button>
    </div>
  );
}
