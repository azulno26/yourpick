const { createClient } = require('@supabase/supabase-js');
// Load env vars manually since I can't rely on dotenv if not installed
// I'll try to read .env.local content and parse it
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2].replace(/"/g, '');
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SECRET_KEY
);

async function checkTables() {
  const tables = ['prompts', 'learning_patterns', 'prompt_adjustments'];
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table ${table} error:`, error.message);
    } else {
      console.log(`✅ Table ${table} exists.`);
    }
  }
}

checkTables();
