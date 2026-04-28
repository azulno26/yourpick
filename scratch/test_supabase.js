const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function test() {
  const { data, error, count } = await supabase
    .from('analyses')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total analyses in DB:', count);
  if (data && data.length > 0) {
    console.log('Sample columns:', Object.keys(data[0]));
    console.log('Sample user_id:', data[0].user_id);
  }
}

test();
