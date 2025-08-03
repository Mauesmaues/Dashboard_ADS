/**
 * Script de Verificação e Reparo da Tabela acessosBI no Supabase
 * 
 * Este script verifica a estrutura dos dados na tabela acessosBI
 * e corrige problemas comuns que poderiam causar falhas de login
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://asjuyhoplswopzxuybrk.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzanV5aG9wbHN3b3B6eHV5YnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTE0OTc3OCwiZXhwIjoyMDY0NzI1Nzc4fQ.UX0Hh3LJTFe7LOq94aiIVmUuNr8-l_HaMCMa8pp7iRk';

// Cria cliente do Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Iniciando verificação da tabela acessosBI...');

  try {
    // Verifica se a tabela existe e tem dados
    const { data, error } = await supabase
      .from('acessosBI')
      .select('*');
    
    if (error) {
      console.error('Erro ao acessar tabela acessosBI:', error);
      return;
    }

    console.log(`Encontrados ${data.length} registros na tabela acessosBI`);
    
    // Verifica se há contas de usuário duplicadas
    const emailCount = {};
    data.forEach(user => {
      if (!emailCount[user.email]) {
        emailCount[user.email] = 1;
      } else {
        emailCount[user.email]++;
      }
    });

    const duplicateEmails = Object.entries(emailCount)
      .filter(([email, count]) => count > 1)
      .map(([email]) => email);
    
    if (duplicateEmails.length > 0) {
      console.log(`⚠️ Encontrados ${duplicateEmails.length} emails duplicados!`);
      console.log('Emails duplicados:', duplicateEmails);
      
      // Para cada email duplicado, mantenha apenas o registro mais recente
      for (const email of duplicateEmails) {
        console.log(`Processando duplicatas para ${email}...`);
        
        // Obtém todos os registros para este email
        const { data: userRecords } = await supabase
          .from('acessosBI')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: false });
        
        if (userRecords && userRecords.length > 1) {
          console.log(`Encontrados ${userRecords.length} registros para ${email}`);
          
          // Mantém o primeiro registro (mais recente) e exclui os demais
          const [keepRecord, ...deleteRecords] = userRecords;
          console.log(`Mantendo registro ID ${keepRecord.id}, excluindo ${deleteRecords.length} registros`);
          
          for (const record of deleteRecords) {
            const { error } = await supabase
              .from('acessosBI')
              .delete()
              .eq('id', record.id);
            
            if (error) {
              console.error(`Erro ao excluir registro ID ${record.id}:`, error);
            } else {
              console.log(`Registro ID ${record.id} excluído com sucesso`);
            }
          }
        }
      }
      
      console.log('Processamento de duplicatas concluído');
    } else {
      console.log('✅ Nenhum email duplicado encontrado');
    }
    
    // Verificar se há algum usuário sem ID
    const usersWithoutId = data.filter(user => !user.id);
    if (usersWithoutId.length > 0) {
      console.log(`⚠️ Encontrados ${usersWithoutId.length} usuários sem ID`);
      // Implementação da correção seria aqui
    } else {
      console.log('✅ Todos os usuários possuem ID');
    }
    
    console.log('Verificação concluída com sucesso');
  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

// Executa o script
main().catch(console.error);
