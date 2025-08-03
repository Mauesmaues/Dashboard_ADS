/**
 * Debug Middleware
 * Esta middleware adiciona logs detalhados para ajudar a identificar problemas de autenticação e sessão
 */

const debugMiddleware = (req, res, next) => {
  // Log SUPER SIMPLES para todos os requests
  console.log(`\n🌐 ${req.method} ${req.originalUrl}`);
  
  // Log especial para qualquer POST
  if (req.method === 'POST') {
    console.log('🚨🚨🚨 POST REQUEST CHEGOU! 🚨🚨🚨');
    console.log('URL:', req.originalUrl);
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Log de informações de requisição
  const requestInfo = {
    method: req.method,
    path: req.path,
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    userSessionExists: !!req.session?.user,
    userEmail: req.session?.user?.email,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    isXHR: req.xhr,
    contentType: req.headers['content-type'],
    ip: req.ip
  };
  
  console.log('🔍 Request Debug:', JSON.stringify(requestInfo, null, 2));
  
  // Log especial para requisições POST
  if (req.method === 'POST') {
    console.log('\n🚨 POST REQUEST DETECTED 🚨');
    console.log('🎯 URL:', req.originalUrl);
    console.log('🎯 Path:', req.path);
    console.log('🎯 Body keys:', Object.keys(req.body || {}));
    console.log('🎯 Body content:', JSON.stringify(req.body, null, 2));
    console.log('🎯 Content-Type:', req.headers['content-type']);
    console.log('🎯 Content-Length:', req.headers['content-length']);
    
    if (req.path.includes('/users')) {
      console.log('\n🎯🎯🎯 USER CREATION REQUEST DETECTED! 🎯🎯🎯');
      console.log('📊 Session check:');
      console.log('   - Session exists:', !!req.session);
      console.log('   - User in session:', !!req.session?.user);
      console.log('   - User email:', req.session?.user?.email);
      console.log('   - User role:', req.session?.user?.role);
      console.log('   - Is admin:', req.session?.user?.role === 'Admin');
    }
  }
  
  // Intercepta a resposta para logar a saída
  const originalSend = res.send;
  res.send = function(body) {
    // Log especial para respostas de criação de usuário
    if (req.method === 'POST' && req.path.includes('/users')) {
      console.log('\n📤📤📤 USER CREATION RESPONSE 📤📤📤');
      console.log('Status:', res.statusCode);
      console.log('Response body:', typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    // Não loga corpos grandes de resposta ou imagens/binários
    if (typeof body === 'string' && body.length < 1000) {
      console.log('📤 Response:', body.substring(0, 200) + (body.length > 200 ? '...' : ''));
    } else {
      console.log('📤 Response: [Large or binary response]');
    }
    
    originalSend.call(this, body);
    return this;
  };
  
  next();
};

module.exports = debugMiddleware;
