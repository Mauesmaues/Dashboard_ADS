const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

class AuthModel {
  // Login user with email and password
  static async login(email, password) {
    try {
      // Buscar usuário real no banco
      const { data, error } = await supabase
        .from('acessobi')
        .select('*')
        .eq('email', email);

      if (error) throw error;

      // Se não encontrar usuário, retorna admin fake para testes
      if (!data || data.length === 0) {
        if (email === 'admin@teste.com' && password === 'admin123') {
          // Usuário admin fake em memória
          return {
            id: 0,
            email: 'admin@teste.com',
            password: '',
            empresa: ['EmpresaTeste'],
            role: 'Admin',
            nome: 'Admin Teste',
          };
        }
        return null;
      }

      // Pega o primeiro usuário encontrado (deve ser apenas um)
      const user = data[0];

      // Check if the password needs to be migrated to bcrypt
      if (user.password === password) {
        // This is a plaintext password in the database, migrate it to bcrypt
        const hashedPassword = await bcrypt.hash(password, 10);
        // Update the user record with hashed password
        const { error: updateError } = await supabase
          .from('acessobi')
          .update({ password: hashedPassword })
          .eq('email', email);
        if (updateError) console.error('Failed to update password hash:', updateError);
        return user;
      }

      // Check if the password matches the hash
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return null;

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get list of all users (for admin panel)
  static async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('acessobi')
        .select('*')
        .order('id');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }
    // Get user by ID
  static async getUserById(id) {
    try {
      const { data, error } = await supabase
        .from('acessobi')
        .select('*')
        .eq('id', id);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0];
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Add new user
  static async createUser(userData) {
    try {
      console.log('Creating user in AuthModel:', {
        email: userData.email,
        passwordProvided: !!userData.password,
        empresaLength: Array.isArray(userData.empresa) ? userData.empresa.length : 'not an array',
        role: userData.role
      });
      
      // Ensure empresa is always an array
      if (!Array.isArray(userData.empresa)) {
        if (userData.empresa) {
          userData.empresa = [userData.empresa];
        } else {
          userData.empresa = [];
        }
      }
      
      // Hash password before storing
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const { data, error } = await supabase
        .from('acessobi')
        .insert([userData])
        .select();
      
      if (error) {
        console.error('Supabase error creating user:', error);
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('User was not created - no data returned from database');
      }
      
      console.log('User successfully created:', data[0].email);
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  // Update existing user
  static async updateUser(email, updates) {
    try {
      // Hash password if provided in update
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const { data, error } = await supabase
        .from('acessobi')
        .update(updates)
        .eq('email', email)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete a user
  static async deleteUser(email) {
    try {
      const { data, error } = await supabase
        .from('acessobi')
        .delete()
        .eq('email', email)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  // Find a user by email
  static async findUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('acessobi')
        .select('*')
        .eq('email', email);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0];
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
}

module.exports = AuthModel;
