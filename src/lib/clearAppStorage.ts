/**
 * Remove dados da aplicação persistidos em localStorage (carteira, estratégia,
 * ferramentas, comentários, config do consultor — dados financeiros sensíveis).
 *
 * Preserva apenas as chaves de sessão do próprio Supabase (prefixo `sb-`), que
 * são tratadas pelo `supabase.auth.signOut()`. Qualquer outra chave é considerada
 * dado da app e é removida — assim novas chaves futuras também são cobertas sem
 * precisar manter uma lista manual.
 */
export function clearAppStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith("sb-")) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage indisponível — ignora */
  }
}
