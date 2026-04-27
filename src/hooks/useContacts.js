import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Mapea fila de DB → objeto que usa la UI
const mapRow = (row) => ({
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
  ultimoContacto: row.ultimo_contacto || null,
  proximoSeguimiento: row.proximo_seguimiento || null,
});

// Mapeo UI field → DB column
const FIELD_MAP = {
  n: 'nombre',
  dir: 'direccion',
  tel: 'telefono',
  telShow: 'tel_display',
  ig: 'instagram',
  fb: 'facebook',
  web: 'web',
  fuente: 'fuente',
  tipo: 'tipo',
  notas: 'notas_investigacion',
  estado: 'estado',
  prior: 'prioridad',
  notasPersonales: 'notas_personales',
  ultimoContacto: 'ultimo_contacto',
  proximoSeguimiento: 'proximo_seguimiento',
};

export default function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar contactos del user actual
  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('id');

      if (cancelled) return;

      if (error) {
        console.error('Error cargando contactos:', error);
        setContacts([]);
      } else if (data) {
        setContacts(data.map(mapRow));
      }
      setLoading(false);
    }

    load();

    return () => { cancelled = true; };
  }, [user]);

  // Actualizar un campo (optimistic update)
  const updateField = useCallback((id, field, value) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    const dbField = FIELD_MAP[field];
    if (!dbField) return;

    supabase
      .from('contacts')
      .update({ [dbField]: value })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Supabase update error:', error);
      });
  }, []);

  // Crear contacto nuevo
  const createContact = useCallback(async (contactData) => {
    if (!user) return { error: 'No hay usuario logueado' };

    // Mapear UI fields a DB columns + agregar user_id
    const dbRow = { user_id: user.id };
    Object.entries(contactData).forEach(([key, value]) => {
      const dbCol = FIELD_MAP[key];
      if (dbCol && value !== undefined && value !== '') {
        dbRow[dbCol] = value;
      }
    });

    // Defaults
    if (!dbRow.estado) dbRow.estado = 'pendiente';
    if (!dbRow.prioridad) dbRow.prioridad = 'media';

    const { data, error } = await supabase
      .from('contacts')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return { error };
    }

    const newContact = mapRow(data);
    setContacts(prev => [...prev, newContact]);
    return { data: newContact };
  }, [user]);

  // Borrar contacto
  const deleteContact = useCallback(async (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) console.error('Supabase delete error:', error);
    return { error };
  }, []);

  return {
    contacts,
    loading,
    updateField,
    createContact,
    deleteContact,
  };
}
