import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dcvmglbhuoahxvtsrjoz.supabase.co'
const supabaseAnonKey = 'sb_publishable_iQaJfOyoNm8GHjc61LoFWw_WiFVkKfd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
