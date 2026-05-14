import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabase = createClient<Database>('https://xyz.supabase.co', 'anon-key');

async function test() {
    const data: Database['public']['Tables']['categories']['Insert'] = {
        name: "test",
        slug: "test",
        icon: null,
        color: "#ffffff",
        is_active: true,
        sort_order: 1
    };

    const { data: result, error } = await supabase
        .from('categories')
        .insert(data)
        .select()
        .single();
}
