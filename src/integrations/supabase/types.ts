export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          data_criacao: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          email?: string | null;
          telefone?: string | null;
          data_criacao?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          email?: string | null;
          telefone?: string | null;
          data_criacao?: string;
        };
      };
      simulations: {
        Row: {
          id: string;
          client_id: string;
          dados_input: Json;
          resultados_calc: Json;
          data_simulacao: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          dados_input: Json;
          resultados_calc: Json;
          data_simulacao?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          dados_input?: Json;
          resultados_calc?: Json;
          data_simulacao?: string;
        };
      };
      diagnostics: {
        Row: {
          id: string;
          client_id: string;
          linked_simulation_id: string | null;
          answers: Json;
          result: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          linked_simulation_id?: string | null;
          answers: Json;
          result: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          linked_simulation_id?: string | null;
          answers?: Json;
          result?: Json;
          created_at?: string;
        };
      };
      financial_plans: {
        Row: {
          id: string;
          client_id: string;
          suitability: Json | null;
          dados_cliente: Json | null;
          ativos_atuais: Json;
          alocacao_personalizada: Json | null;
          planejamento_if: Json;
          protecao: Json;
          fiscal: Json;
          sucessorio: Json;
          notas_assessor: string;
          estrategia_inicial: Json | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          suitability?: Json | null;
          dados_cliente?: Json | null;
          ativos_atuais?: Json;
          alocacao_personalizada?: Json | null;
          planejamento_if?: Json;
          protecao?: Json;
          fiscal?: Json;
          sucessorio?: Json;
          notas_assessor?: string;
          estrategia_inicial?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          suitability?: Json | null;
          dados_cliente?: Json | null;
          ativos_atuais?: Json;
          alocacao_personalizada?: Json | null;
          planejamento_if?: Json;
          protecao?: Json;
          fiscal?: Json;
          sucessorio?: Json;
          notas_assessor?: string;
          estrategia_inicial?: Json | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
