# Simpla · Diagnóstico Financeiro

App de diagnóstico financeiro para assessores de investimento.

## Stack
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (auth + banco de dados)
- Recharts (gráficos)

## Funcionalidades
- Autenticação com Supabase
- Cadastro e gestão de clientes
- Diagnóstico financeiro em 7 categorias:
  Liquidez, Sucessão, Estratégia, Câmbio,
  Inflação, Objetivos de vida, Liberdade financeira
- Score visual com gauge e gráfico radar
- PDF para assessor (completo) e cliente (resumido)
- Histórico de diagnósticos por cliente

## Como rodar localmente
1. Clone o repositório
2. Instale dependências: `npm install`
3. Crie `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. `npm run dev`

## Deploy
O projeto está configurado para Vercel.
Adicione as variáveis de ambiente no painel da Vercel.

