// ================= COMPANY MANAGEMENT FUNCTIONS =================

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
      descricao: description
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
    const response = await fetch('/api/companies');
    
    if (!response.ok) {
      throw new Error('Erro ao carregar empresas');
    }
    
    const companies = await response.json();
    
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
        <td>-</td>
        <td><code>${company.ad_account_id}</code></td>
        <td><span class="badge bg-success">Ativo</span></td>
        <td>${new Date(company.created_at).toLocaleDateString('pt-BR')}</td>
        <td>${new Date(company.created_at).toLocaleDateString('pt-BR')}</td>
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
    showToast('Erro', error.message, 'error');
  }
}
