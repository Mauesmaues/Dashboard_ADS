const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase connection configuration
// Para conectar ao Supabase, defina as variáveis SUPABASE_URL e SUPABASE_KEY no arquivo .env
// Exemplo de .env:
// SUPABASE_URL=https://db.amlrzwjdcgsuvnzfhqxd.supabase.co
// SUPABASE_KEY=COLE_AQUI_SUA_API_KEY_DO_SUPABASE

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL ou SUPABASE_KEY não definidos. Configure no arquivo .env.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection function
async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Using API Key: ${supabaseKey ? 'Key is present' : 'Key is missing'}`);
    
    const start = Date.now();
    const { data, error } = await supabase
      .from('acessobi')
      .select('*')
      .limit(1);
    const duration = Date.now() - start;
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      console.error('Connection details:', {
        url: supabaseUrl,
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details
      });
      return false;
    }
    
    if (!data || data.length === 0) {
      console.warn('Connected to Supabase but no data returned from companies table');
      console.warn('This might indicate missing data or incorrect table structure');
    }
    
    console.log(`Successfully connected to Supabase (${duration}ms)`);
    console.log(`Retrieved ${data ? data.length : 0} records from companies table`);
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    console.error('Connection attempt error details:', {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack
    });
    return false;
  }
}

module.exports = {
  supabase,
  testConnection
};
