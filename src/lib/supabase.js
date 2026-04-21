import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://wynownataftnompltsok.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5bm93bmF0YWZ0bm9tcGx0c29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjMwODcsImV4cCI6MjA5MjE5OTA4N30.nrrpT9WsLsjAMyzaWGSYlIHh5G3Bbnh86X5oaKSHEec'
);