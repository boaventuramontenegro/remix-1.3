export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertas_orcamento: {
        Row: {
          categoria_id: string
          criado_em: string
          mes: string
          user_id: string
        }
        Insert: {
          categoria_id: string
          criado_em?: string
          mes: string
          user_id?: string
        }
        Update: {
          categoria_id?: string
          criado_em?: string
          mes?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_orcamento_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      app_internal: {
        Row: {
          chave: string
          valor: string
        }
        Insert: {
          chave: string
          valor: string
        }
        Update: {
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          orcamento_mensal: number | null
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          orcamento_mensal?: number | null
          user_id?: string
        }
        Update: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          orcamento_mensal?: number | null
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          dia_inicio_mes: number
          fuso_horario: string | null
          lembrete_manha: boolean
          lembrete_manha_horario: string
          lembrete_manha_proximo: string | null
          lembrete_noite: boolean
          lembrete_noite_horario: string
          lembrete_noite_proximo: string | null
          lembrete_tarde: boolean
          lembrete_tarde_horario: string
          lembrete_tarde_proximo: string | null
          notif_ativas: boolean
          notif_horario: string
          notif_limite_80: boolean
          ocultar_valores: boolean
          pagamento_padrao: string
          pin_tema: string
          pin_tempo_bloqueio: number
          renda_mensal: number | null
          semana_inicia: number
          tema: string
          timezone: string
          ultimo_lembrete: string | null
          user_id: string
        }
        Insert: {
          dia_inicio_mes?: number
          fuso_horario?: string | null
          lembrete_manha?: boolean
          lembrete_manha_horario?: string
          lembrete_manha_proximo?: string | null
          lembrete_noite?: boolean
          lembrete_noite_horario?: string
          lembrete_noite_proximo?: string | null
          lembrete_tarde?: boolean
          lembrete_tarde_horario?: string
          lembrete_tarde_proximo?: string | null
          notif_ativas?: boolean
          notif_horario?: string
          notif_limite_80?: boolean
          ocultar_valores?: boolean
          pagamento_padrao?: string
          pin_tema?: string
          pin_tempo_bloqueio?: number
          renda_mensal?: number | null
          semana_inicia?: number
          tema?: string
          timezone?: string
          ultimo_lembrete?: string | null
          user_id?: string
        }
        Update: {
          dia_inicio_mes?: number
          fuso_horario?: string | null
          lembrete_manha?: boolean
          lembrete_manha_horario?: string
          lembrete_manha_proximo?: string | null
          lembrete_noite?: boolean
          lembrete_noite_horario?: string
          lembrete_noite_proximo?: string | null
          lembrete_tarde?: boolean
          lembrete_tarde_horario?: string
          lembrete_tarde_proximo?: string | null
          notif_ativas?: boolean
          notif_horario?: string
          notif_limite_80?: boolean
          ocultar_valores?: boolean
          pagamento_padrao?: string
          pin_tema?: string
          pin_tempo_bloqueio?: number
          renda_mensal?: number | null
          semana_inicia?: number
          tema?: string
          timezone?: string
          ultimo_lembrete?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          categoria_id: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string
          id: string
          observacao: string | null
          recorrente: boolean
          recorrente_origem_id: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: string
          observacao?: string | null
          recorrente?: boolean
          recorrente_origem_id?: string | null
          user_id?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          id?: string
          observacao?: string | null
          recorrente?: boolean
          recorrente_origem_id?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recorrente_origem_id_fkey"
            columns: ["recorrente_origem_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          nome: string
          user_id: string
        }
        Insert: {
          nome?: string
          user_id?: string
        }
        Update: {
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_id?: string
        }
        Relationships: []
      }
      sugestoes: {
        Row: {
          criado_em: string
          id: string
          mensagem: string
          tipo: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          mensagem: string
          tipo: string
          user_id?: string
        }
        Update: {
          criado_em?: string
          id?: string
          mensagem?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      excluir_categoria_com_gastos: {
        Args: {
          _categoria: string
          _destino?: string
          _excluir_gastos?: boolean
        }
        Returns: undefined
      }
      excluir_minha_conta: { Args: never; Returns: undefined }
      lancar_recorrentes: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
