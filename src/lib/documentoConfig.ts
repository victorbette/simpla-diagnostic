export interface ConfigConsultor {
  nome: string;
  certificacoes: string[];
  empresa: string;
  email?: string;
  telefone?: string;
}

export const CONFIG_CONSULTOR_DEFAULT: ConfigConsultor = {
  nome: "Consultor Simpla Invest",
  certificacoes: ["CFP®", "CEA"],
  empresa: "Simpla Invest",
};
