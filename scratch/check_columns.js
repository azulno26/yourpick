const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// I'll try to find the env vars in the filesystem or assuming they are in the process if I was running in vercel
// But I'm local. I'll check if there is a .env file I missed.
const envFiles = ['.env.local', '.env'];
let envVars = {};

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const env = fs.readFileSync(file, 'utf8');
    env.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) envVars[match[1]] = match[2].replace(/"/g, '').trim();
    });
  }
});

if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.SUPABASE_SECRET_KEY) {
  console.error('Missing Supabase credentials in .env files');
  // I'll try to read them from lib/supabase.ts if they are hardcoded (unlikely)
  process.exit(1);
}

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SECRET_KEY
);

async function checkAnalysesTable() {
  console.log('Checking analyses table columns...');
  const { data, error } = await supabase.from('analyses').select('*').limit(1);
  if (error) {
    console.error('❌ Error fetching analyses:', error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log('✅ Columns in analyses table:', Object.keys(data[0]));
    
    const requiredColumns = [
      'ai_model_version',
      'weights_at_time',
      'analysis',
      'goals_expected',
      'avg_goals_h2h',
      'goals_tendency',
      'both_teams_score',
      'over_under',
      'winner_reason',
      'best_bet_reason',
      'recommended_analysis'
    ];
    
    requiredColumns.forEach(col => {
      if (!Object.keys(data[0]).includes(col)) {
        console.error(`❌ Column missing: ${col}`);
      } else {
        console.log(`✅ Column exists: ${col}`);
      }
    });
  } else {
    console.log('⚠️ No data in analyses table to check columns.');
  }
}

checkAnalysesTable();
