
 // ============================================
 // Archivo: supabase.js
 // Descripción:
 // Cliente de Supabase Storage para el CRM DEIN.
 // Exclusivo del backend.
 // ============================================

 const { createClient } = require("@supabase/supabase-js");

 const STORAGE_BUCKET = "crm-documentos";

 let supabaseClient = null;

 // ============================================
 // Obtener cliente de Supabase
 // ============================================

 const obtenerClienteSupabase = () => {
     if (supabaseClient) {
         return supabaseClient;
     }

     const supabaseUrl = process.env.SUPABASE_URL;
     const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

     if (!supabaseUrl || !supabaseKey) {
         throw new Error(
             "La configuración de Supabase Storage está incompleta."
         );
     }

     supabaseClient = createClient(
         supabaseUrl,
         supabaseKey,
         {
             auth: {
                 autoRefreshToken: false,
                 persistSession: false,
                 detectSessionInUrl: false
             }
         }
     );

     return supabaseClient;
 };

 // ============================================
 // Exportaciones
 // ============================================

 module.exports = {
     obtenerClienteSupabase,
     STORAGE_BUCKET
 };
