export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          vat_id: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          vat_id?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          vat_id?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_subtotal: number | null
          line_tax: number | null
          line_total: number | null
          position: number
          quantity: number
          unit_price: number
          unit_type: Database["public"]["Enums"]["invoice_unit_type"]
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          line_subtotal?: number | null
          line_tax?: number | null
          line_total?: number | null
          position?: number
          quantity?: number
          unit_price?: number
          unit_type?: Database["public"]["Enums"]["invoice_unit_type"]
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_subtotal?: number | null
          line_tax?: number | null
          line_total?: number | null
          position?: number
          quantity?: number
          unit_price?: number
          unit_type?: Database["public"]["Enums"]["invoice_unit_type"]
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          client_snapshot: Json
          comments: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          last_sent_at: string | null
          pdf_path: string | null
          pdf_storage_path: string | null
          sender_snapshot: Json
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_link_url: string | null
          stripe_payment_status: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_snapshot: Json
          comments?: string | null
          created_at?: string
          currency: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          last_sent_at?: string | null
          pdf_path?: string | null
          pdf_storage_path?: string | null
          sender_snapshot: Json
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_payment_status?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_snapshot?: Json
          comments?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          last_sent_at?: string | null
          pdf_path?: string | null
          pdf_storage_path?: string | null
          sender_snapshot?: Json
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_payment_status?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          charges_enabled: boolean
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          invoice_seq: number
          stripe_account_id: string | null
          updated_at: string
          vat_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          charges_enabled?: boolean
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          invoice_seq?: number
          stripe_account_id?: string | null
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          charges_enabled?: boolean
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          invoice_seq?: number
          stripe_account_id?: string | null
          updated_at?: string
          vat_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_invoice_number: { Args: { p_year?: number }; Returns: string }
    }
    Enums: {
      invoice_status: "paid" | "not_paid"
      invoice_unit_type: "hours" | "flat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"]
export type InvoiceUnitType = Database["public"]["Enums"]["invoice_unit_type"]
