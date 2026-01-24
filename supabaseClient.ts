
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovmjjjfwcdygjaztdibn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bWpqamZ3Y2R5Z2phenRkaWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDMxMjksImV4cCI6MjA4NDgxOTEyOX0.THvHmkyB4N-bIjOu_4kwGJECUp3PBpgP9gh7ZB0er7A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
