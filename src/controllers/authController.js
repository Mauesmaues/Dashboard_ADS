const AuthModel = require('../models/authModel');
const EmpresaAdAccountModel = require('../models/empresaAdAccountModel');

class AuthController {
  // User login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      
      // Attempt login
      const userData = await AuthModel.login(email, password);
      
      if (!userData) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }
      
      // Don't send password back to client
      const { password: _, ...userDataWithoutPassword } = userData;
      
      // Send user data with session cookie
      req.session.user = userDataWithoutPassword;
      return res.status(200).json({ user: userDataWithoutPassword });
    } catch (error) {
      console.error('Login controller error:', error);
      return res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logout realizado com sucesso' });
      });
    } catch (error) {
      console.error('Logout controller error:', error);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
  }

  // Check if user is authenticated
  static async checkAuth(req, res) {
    try {
      if (req.session && req.session.user) {
        return res.status(200).json({ user: req.session.user });
      } else {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
    } catch (error) {
      console.error('Check auth controller error:', error);
      return res.status(500).json({ error: 'Erro ao verificar autenticação' });
    }
  }

  // Auto login from saved session data
  static async autoLogin(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
      }
      
      // Get user by ID
      const user = await AuthModel.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Don't send password back to client
      const { password: _, ...userDataWithoutPassword } = user;
      
      // Set up user session
      req.session.user = userDataWithoutPassword;
      
      return res.status(200).json({ user: userDataWithoutPassword });
    } catch (error) {
      console.error('Auto login controller error:', error);
      return res.status(500).json({ error: 'Erro ao fazer login automático' });
    }
  }

  // Get all users (admin only)
  static async getAllUsers(req, res) {
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const users = await AuthModel.getAllUsers();
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      console.error('Get all users controller error:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  }
  // Create new user (admin only)
  static async createUser(req, res) {
    console.log('\n🎯 ============ CREATE USER CALLED ============');
    console.log('📋 Request method:', req.method);
    console.log('📋 Request path:', req.path);
    console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📋 Session user:', req.session?.user ? `${req.session.user.email} (${req.session.user.role})` : 'NOT LOGGED IN');
    console.log('📋 Body keys:', Object.keys(req.body || {}));
    console.log('📋 Body values:', Object.values(req.body || {}));
    
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        console.log('❌ ACESSO NEGADO - Usuário não é admin');
        console.log('❌ Session exists:', !!req.session);
        console.log('❌ Session user exists:', !!req.session?.user);
        console.log('❌ User role:', req.session?.user?.role);
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      console.log('✅ ACESSO PERMITIDO - Usuário é admin');
      
      const { email, nome, password, empresa, role } = req.body;
      
      console.log('📝 Extracted fields:');
      console.log('   - email:', email, '(type:', typeof email, ')');
      console.log('   - nome:', nome, '(type:', typeof nome, ')');
      console.log('   - password:', password ? '***PROVIDED***' : 'NOT PROVIDED', '(type:', typeof password, ')');
      console.log('   - empresa:', empresa, '(type:', typeof empresa, ', isArray:', Array.isArray(empresa), ')');
      console.log('   - role:', role, '(type:', typeof role, ')');
      
      // Validate required fields
      if (!email || !nome || !password || !empresa || !role) {
        console.log('❌ VALIDAÇÃO FALHOU - Campos obrigatórios ausentes');
        console.log('❌ Missing fields:', {
          email: !email,
          nome: !nome,
          password: !password,
          empresa: !empresa,
          role: !role
        });
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }
      
      console.log('✅ VALIDAÇÃO PASSOU - Todos os campos presentes');
      
      console.log('Creating user with data:', {
        email,
        nome,
        passwordProvided: !!password,
        empresaCount: Array.isArray(empresa) ? empresa.length : 'not an array',
        role
      });
      
      // Check if user already exists
      const existingUser = await AuthModel.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado no sistema' });
      }
      
      const userData = {
        email,
        nome,
        password,
        empresa,
        role
      };
      
      const newUser = await AuthModel.createUser(userData);
      
      if (!newUser || newUser.length === 0) {
        return res.status(500).json({ error: 'Erro ao criar usuário no banco de dados' });
      }

      // Create empresa-ad_account mappings for each empresa
      try {
        const empresaList = Array.isArray(empresa) ? empresa : [empresa];
        
        for (const empresaName of empresaList) {
          console.log(`🔗 Creating mapping for empresa: ${empresaName}`);
          
          // First, try to get the company's ad_account_id from empresa_ad_accounts table
          // Try to find company by name first
          const existingMappings = await EmpresaAdAccountModel.getMappingsByEmpresa(empresaName);
          let adAccountId = null;
          
          if (existingMappings && existingMappings.length > 0) {
            adAccountId = existingMappings[0].ad_account_id;
            console.log(`✅ Found existing mapping with ad_account_id: ${adAccountId}`);
          } else {
            // Fallback: create a default ad_account_id based on empresa name
            // This maintains compatibility with existing data
            if (empresaName.toLowerCase() === 'marcos') {
              adAccountId = '1010333534298546'; // Known mapping for Marcos (only numbers)
            } else {
              // Generate a placeholder ad_account_id - this should be updated later
              adAccountId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
              console.log(`⚠️ No mapping found, using placeholder ad_account_id: ${adAccountId}`);
            }
            
            // Create the mapping in empresa_ad_accounts table
            await EmpresaAdAccountModel.createMapping(empresaName, adAccountId);
            console.log(`✅ Created mapping: ${empresaName} -> ${adAccountId}`);
          }
        }
      } catch (mappingError) {
        console.error('⚠️ Error creating empresa-ad_account mappings:', mappingError);
        // Don't fail user creation if mapping fails, just log the error
        console.log('⚠️ User created successfully, but mapping creation failed. Mappings can be created manually later.');
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser[0];
      
      console.log('User created successfully:', userWithoutPassword);
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Create user controller error:', error);
      if (error.message.includes('duplicate key')) {
        return res.status(400).json({ error: 'Email já cadastrado no sistema' });
      }
      return res.status(500).json({ error: `Erro ao criar usuário: ${error.message}` });
    }
  }

  // Update existing user (admin only)
  static async updateUser(req, res) {
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { email } = req.params;
      const updates = req.body;
      
      // Don't allow email change in updates
      if (updates.email && updates.email !== email) {
        return res.status(400).json({ error: 'Não é permitido alterar o email' });
      }
      
      const updatedUser = await AuthModel.updateUser(email, updates);
      
      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser[0];
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Update user controller error:', error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  // Delete a user (admin only)
  static async deleteUser(req, res) {
    try {
      // Check if user is admin
      if (!req.session || !req.session.user || req.session.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Acesso restrito' });
      }
      
      const { email } = req.params;
      
      const deletedUser = await AuthModel.deleteUser(email);
      
      if (!deletedUser || deletedUser.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      return res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
      console.error('Delete user controller error:', error);
      return res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
  }
}

module.exports = AuthController;
