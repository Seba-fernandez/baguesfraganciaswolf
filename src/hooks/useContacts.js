import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load contacts from Supabase on mount
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('id');

      if (!error && data) {
        // Map DB columns to the short keys the UI expects
        setContacts(data.map(row => ({
          id: row.id,
          n: row.nombre,
          dir: row.direccion || '',
          tel: row.telefono || '',
          telShow: row.tel_display || '',
          ig: row.instagram || '',
          fb: row.facebook || '',
          web: row.web || '',
          fuente: row.fuente || '',
          tipo: row.tipo || '',
          notas: row.notas_investigacion || '',
          estado: row.estado || 'pendiente',
          prior: row.prioridad || 'media',
          notasPersonales: row.notas_personales || '',
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Update a field and sync to Supabase
  const updateField = useCallback((id, field, value) => {
    // Update UI immediately
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    // Map UI field to DB column
    const dbField = {
      estado: 'estado',
      prior: 'prioridad',
      notasPersonales: 'notas_personales',
    }[field];

    if (dbField) {
      supabase
        .from('contacts')
        .update({ [dbField]: value })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase update error:', error);
        });
    }
  }, []);

  return { contacts, loading, updateField };
}