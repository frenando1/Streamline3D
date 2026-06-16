import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dgvjcysvtxrincgpxdng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndmpjeXN2dHhyaW5jZ3B4ZG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDU5OTksImV4cCI6MjA5Mjk4MTk5OX0.-OdZCBfX1LWHdlGKVG2oOG188ah3aVsMliX7ghUP_xo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
