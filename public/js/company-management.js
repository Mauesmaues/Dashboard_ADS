// ================= COMPANY MANAGEMENT FUNCTIONS =================

// Company Management Module

// Helper functions for saldo formatting
function formatSaldo(saldo) {
  if (saldo === null || saldo === undefined) {
    return '0,00';
  }
  const numericValue = parseFloat(saldo);
  if (isNaN(numericValue)) {
    return '0,00';
  }
  return numericValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function getSaldoClass(saldo) {
  if (saldo === null || saldo === undefined) {
    return 'text-muted';
  }
  const numericValue = parseFloat(saldo);
  if (isNaN(numericValue) || numericValue === 0) {
    return 'text-muted';
  }
  return numericValue > 0 ? 'text-success' : 'text-danger';
}

// Setup company form listener
function setupCompanyFormListener() {
  const companyForm = document.getElementById('company-form');
  if (!companyForm) {
    console.error('❌ ERRO: Formulário company-form não encontrado!');
    return;
  }
  
  console.log('✅ Anexando listener ao formulário company-form');
  
  companyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('companyName').value;
    const adAccountId = document.getElementById('companyAdAccountId').value;
    const description = document.getElementById('companyDescription').value;
    const status = document.getElementById('companyStatus').value;
    const errorDiv = document.getElementById('modal-company-form-error');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Validate ad_account_id format (should be only numbers)
    if (!/^\d+$/.test(adAccountId)) {
      errorDiv.textContent = 'O ID da conta de anúncio deve conter apenas números';
      errorDiv.style.display = 'block';
      return;
    }
    
    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
    errorDiv.style.display = 'none';
    
    const companyData = {
      nome: name,
      ad_account_id: adAccountId,
      descricao: description,
      created_at: new Date().toISOString() // Data local de criação
    };
    
    console.log('Company data to save:', companyData);
    
    try {
      // Make API call to save company
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar empresa');
      }
      
      // Show success message
      showToast('Empresa salva!', `Empresa ${name} foi salva com sucesso.`, 'success');
      
            // Refresh company list if function exists
      if (typeof loadCompaniesForManagement === 'function') {
        loadCompaniesForManagement();
      }
      
      // Hide modal with cleanup
      const companyModalElement = document.getElementById('companyModal');
      const modalInstance = bootstrap.Modal.getInstance(companyModalElement);
      if (modalInstance) {
        modalInstance.hide();
        
        companyModalElement.addEventListener('hidden.bs.modal', function cleanup() {
          companyModalElement.removeEventListener('hidden.bs.modal', cleanup);
          cleanupModal(companyModalElement, modalInstance, false);
        });
      }
      
    } catch (error) {
      console.error('Error saving company:', error);
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
    }
    
    // Reset button
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }, 1000);
  });
}

// Open company form modal
function openCompanyForm() {
  const companyModalElement = document.getElementById('companyModal');
  
  // Clean up any existing modal instance
  const existingInstance = bootstrap.Modal.getInstance(companyModalElement);
  if (existingInstance) {
    try {
      existingInstance.dispose();
    } catch (e) {
      console.log('Modal instance already disposed');
    }
  }
  
  // Reset body state
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  companyModalElement.removeAttribute('aria-hidden');
  companyModalElement.removeAttribute('style');
  companyModalElement.classList.remove('show');
  
  const modal = new bootstrap.Modal(companyModalElement);
  document.getElementById('companyModalTitle').textContent = 'Adicionar Empresa';
  document.getElementById('company-form').reset();
  document.getElementById('companyStatus').value = 'active';
  document.getElementById('companyAdAccountId').value = '';
  
  const errorDiv = document.getElementById('modal-company-form-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
  
  modal.show();
}

// Load companies for management
async function loadCompaniesForManagement() {
  const companiesTableBody = document.getElementById('companies-table-body');
  const loadingDiv = document.getElementById('companies-loading');
  
  if (!companiesTableBody) return;
  
  // Show loading
  loadingDiv.classList.remove('d-none');
  companiesTableBody.innerHTML = '';
  
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/companies?t=${timestamp}`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar empresas');
    }
    
    const companies = await response.json();
    console.log('📊 [loadCompaniesForManagement] Dados recebidos do backend:', companies);
    console.log('📊 [loadCompaniesForManagement] Saldos das empresas:', companies.map(c => ({
      empresa: c.empresa,
      ad_account_id: c.ad_account_id,
      saldo: c.saldo,
      tipo_saldo: typeof c.saldo
    })));
    
    loadingDiv.classList.add('d-none');
    
    if (!companies || companies.length === 0) {
      companiesTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center p-4">
            <i class="fas fa-building fa-2x mb-3 text-muted"></i>
            <p class="text-muted">Nenhuma empresa cadastrada</p>
            <p class="small text-muted">Clique em "Nova Empresa" para adicionar a primeira empresa</p>
          </td>
        </tr>
      `;
      return;
    }
    
    // Populate table with companies
    companiesTableBody.innerHTML = companies.map(company => `
      <tr>
        <td>${company.empresa}</td>
        <td><code>${company.ad_account_id}</code></td>
        <td><span class="badge bg-success">Ativo</span></td>
        <td>${company.created_at ? new Date(company.created_at).toLocaleDateString('pt-BR') : 'N/A'}</td>
        <td>-</td>
        <td>
          <span class="${getSaldoClass(company.saldo)}">
            R$ ${formatSaldo(company.saldo)}
          </span>
          ${company.saldo_updated_at ? `<br><small class="text-muted">Atualizado: ${new Date(company.saldo_updated_at).toLocaleDateString('pt-BR')}</small>` : ''}
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button type="button" class="btn btn-outline-primary" onclick="editCompany('${company.ad_account_id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-outline-danger" onclick="deleteCompany('${company.ad_account_id}', '${company.empresa}')" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading companies:', error);
    loadingDiv.classList.add('d-none');
    companiesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center p-4">
          <i class="fas fa-exclamation-triangle fa-2x mb-3 text-warning"></i>
          <p class="text-warning">Erro ao carregar empresas</p>
          <p class="small text-muted">${error.message}</p>
          <button class="btn btn-sm btn-outline-primary" onclick="loadCompaniesForManagement()">
            <i class="fas fa-redo me-1"></i>Tentar novamente
          </button>
        </td>
      </tr>
    `;
  }
}

function editCompany(companyId) {
  showToast('Info', `Edição da empresa ID ${companyId} em desenvolvimento`, 'info');
}

async function deleteCompany(adAccountId, companyName) {
  if (!confirm(`Tem certeza que deseja excluir a empresa "${companyName}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }
  
  try {
    console.log('Deleting company with ad_account_id:', adAccountId);
    
    const response = await fetch(`/api/companies/by-ad-account/${adAccountId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro ao excluir empresa');
    }
    
    showToast('Sucesso', `Empresa "${companyName}" excluída com sucesso`, 'success');
    
    // Reload companies list
    loadCompaniesForManagement();
    
  } catch (error) {
    console.error('Error deleting company:', error);
    // Apenas mostrar toast se não for um erro de operação automática
    if (error.message && !error.message.includes('automática')) {
      showToast('Erro', error.message, 'error');
    }
  }
}
