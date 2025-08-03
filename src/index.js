const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const moment = require('moment-timezone');
const apiRoutes = require('./routes/apiRoutes');
const { testConnection } = require('./config/supabase');
const debugMiddleware = require('./middleware/debugMiddleware');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'bi-supabase-secret-key-complex',
  resave: false,
  saveUninitialized: true, // Alterado para true para garantir que todas as sessões sejam armazenadas
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true', // Configurável via variável de ambiente
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE || 'lax', // Configurável via variável de ambiente
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (aumentado de 24 horas)
  }
}));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true // needed for cookies/sessions to work cross-domain
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Adiciona middleware de debug para ajudar a identificar problemas de autenticação
const isDebugMode = process.env.NODE_ENV !== 'production';
if (isDebugMode) {
  app.use(debugMiddleware);
  console.log('Debug middleware ativado para ajudar a diagnosticar problemas de autenticação');
}

// API routes
app.use('/api', apiRoutes);

// N8N routes (direct data consultation)
app.use('/api/n8n', require('./routes/n8nRoutes'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
async function startServer() {
  try {
    console.log('Starting BI Supabase server...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Verificar e exibir timezone atual
    console.log(`Timezone configurado: ${moment.tz.guess()}`);
    console.log(`Fuso atual: UTC${moment().format('Z')}`);
    console.log(`Data/hora atual: ${moment().format('DD/MM/YYYY HH:mm:ss')}`);
    
    // Exemplo de conversão para testar o funcionamento correto
    const testDate = '16/06/2025';
    const utcDate = moment.tz(testDate, 'DD/MM/YYYY', 'America/Sao_Paulo').utc().format();
    console.log(`Exemplo - Data brasileira ${testDate} em UTC: ${utcDate}`);
    
    // Test Supabase connection before starting server
    const connectionSuccessful = await testConnection();
    
    if (!connectionSuccessful) {
      console.error('Failed to connect to Supabase. Please check your credentials and network connection.');
      console.error('The server will still start, but data-related features may not work correctly.');
      
      // Add error route to inform frontend about connection issues
      app.get('/api/connection-status', (req, res) => {
        res.status(503).json({ 
          status: 'error', 
          message: 'Database connection is unavailable',
          timestamp: new Date().toISOString()
        });
      });
    } else {
      // Add success route for connection status
      app.get('/api/connection-status', (req, res) => {
        res.status(200).json({ 
          status: 'ok', 
          message: 'Database connection is active',
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Start server regardless of connection status
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
      
      if (!connectionSuccessful) {
        console.warn('⚠️ WARNING: Server started without database connection');
      }
    });
  } catch (error) {
    console.error('Critical error starting server:', error);
    process.exit(1);
  }
}

startServer();
