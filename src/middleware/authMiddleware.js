// Authentication middleware
const authMiddleware = {
  // Check if user is authenticated
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    return res.status(401).json({ error: 'Usuário não autenticado' });
  },
  // Check if user is admin
  isAdmin: (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'Admin') {
      return next();
    }
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  },

  // Check if user has access to the company
  hasCompanyAccess: (req, res, next) => {
    const { company } = req.query;
    
    console.log('\n🔒 ============ MIDDLEWARE hasCompanyAccess ============');
    console.log(`[hasCompanyAccess] Verificando acesso para empresa: ${company || 'Nenhuma selecionada'}`);
    console.log(`[hasCompanyAccess] Usuário: ${req.session?.user?.email || 'Não autenticado'}`);
    console.log(`[hasCompanyAccess] Função: ${req.session?.user?.role || 'Desconhecido'}`);
    console.log(`[hasCompanyAccess] Session completa:`, JSON.stringify(req.session?.user || {}, null, 2));
    console.log(`[hasCompanyAccess] Query params:`, req.query);
    
    // Se nenhuma empresa foi especificada, permitir acesso
    if (!company) {
      console.log('[hasCompanyAccess] ✅ Nenhuma empresa especificada, permitindo acesso');
      return next();
    }
    
    // Se o usuário é admin, permitir acesso a qualquer empresa
    if (req.session?.user?.role === 'Admin') {
      console.log('[hasCompanyAccess] ✅ Usuário é Admin, permitindo acesso');
      return next();
    }
    
    // Verificar se o usuário tem uma lista de empresas
    if (!req.session?.user?.empresa) {
      console.log('[hasCompanyAccess] ❌ Usuário não tem lista de empresas definida');
      return res.status(403).json({ error: 'Você não tem permissões definidas para acessar empresas' });
    }
    
    // Garantir que empresa é um array
    const userCompanies = Array.isArray(req.session.user.empresa) 
      ? req.session.user.empresa 
      : [req.session.user.empresa];
    
    console.log(`[hasCompanyAccess] Empresas do usuário: ${JSON.stringify(userCompanies)}`);
    
    // Verificar se o usuário tem acesso à empresa solicitada
    if (userCompanies.includes(company)) {
      console.log(`[hasCompanyAccess] ✅ Usuário tem acesso à empresa: ${company}`);
      return next();
    }
    
    console.log(`[hasCompanyAccess] ❌ Acesso negado à empresa: ${company}`);
    return res.status(403).json({ 
      error: 'Você não tem acesso a esta empresa',
      requestedCompany: company,
      allowedCompanies: userCompanies
    });
  }
};

module.exports = authMiddleware;
