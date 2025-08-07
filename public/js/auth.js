// Authentication & User Management Scripts

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    // If response is ok, the server session is valid
    if (response.ok) {
      const data = await response.json();
      
      // If on login page and already logged in, redirect to dashboard
      if (window.location.pathname.includes('login.html')) {
        window.location.href = '/';
        return;
      }
      
      // If logged in and on dashboard, setup user interface
      if (!window.location.pathname.includes('login.html')) {
        setupUserInterface(data.user);
        loadCompaniesBasedOnAccess(data.user);
        
        // Store user data in both storages for persistence
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      }
      return;
    } 
      // If server session is not valid, check if we have a saved session in localStorage
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser && !window.location.pathname.includes('login.html')) {
      console.log('Attempting to restore session from localStorage');
      
      try {
        // Check if token is still valid
        const tokenData = JSON.parse(savedToken);
        const now = new Date();
        
        // Check if token is expired
        if (tokenData.expiry && new Date(tokenData.expiry) > now) {
          console.log('Found valid saved session, attempting to restore');
          const userData = JSON.parse(savedUser);
          
          // We'll attempt to verify and restore the user session
          const restoreResponse = await fetch('/api/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.id }),
            credentials: 'include'
          });
          
          if (restoreResponse.ok) {
            const restoredData = await restoreResponse.json();
            setupUserInterface(restoredData.user);
            loadCompaniesBasedOnAccess(restoredData.user);
            
            // Update expiration time
            const newNow = new Date();
            const newExpiryTime = newNow.setDate(newNow.getDate() + 7); // 7 dias de expiração
            
            const newTokenData = {
              user: restoredData.user,
              expiry: newExpiryTime
            };
            
            localStorage.setItem('authToken', JSON.stringify(newTokenData));
            localStorage.setItem('currentUser', JSON.stringify(restoredData.user));
            sessionStorage.setItem('currentUser', JSON.stringify(restoredData.user));
            
            return;
          }
        } else {
          console.log('Saved token is expired, removing');
        }
        
        // If we get here, either the token is expired or the restore failed
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        
      } catch (restoreError) {
        console.error('Error restoring session:', restoreError);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
      }
    }
    
    // If we reach here, there's no valid session
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    // On error, redirect to login for safety
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = '/login.html';
    }
  }
}

// Setup login form submission
if (document.getElementById('login-form')) {
  // Add event listener for password visibility toggle
  document.querySelector('.toggle-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
  
  // Handle login form submission
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Show loading state on button
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Entrando...';
    
    try {
      // Hide error message if it was previously shown
      errorDiv.style.display = 'none';
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer login');
      }
      
      const data = await response.json();      // Store user in both localStorage (for persistence) and sessionStorage
      const now = new Date();
      const expiryTime = now.setDate(now.getDate() + 7); // 7 dias de expiração
      
      const userData = {
        user: data.user,
        expiry: expiryTime
      };
      
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('authToken', JSON.stringify(userData)); 
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      
      // Redirect to dashboard on success
      window.location.href = '/';
    } catch (error) {
      // Show error message
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Logout function
async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
      // Clear all storage items
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Setup user interface based on logged in user
function setupUserInterface(user) {
  try {
    console.log('Setting up UI for user:', user.email);
    console.log('User role:', user.role);
    console.log('User empresa access:', user.empresa);
    
    // Add logout button to navbar
    const navbarRight = document.querySelector('.navbar-nav') || document.createElement('ul');
    
    // Format company access for display
    let companyAccess = 'Nenhuma';
    if (user.empresa && Array.isArray(user.empresa) && user.empresa.length > 0) {
      companyAccess = user.empresa.length > 3 
        ? `${user.empresa.slice(0, 2).join(', ')} e mais ${user.empresa.length - 2}`
        : user.empresa.join(', ');
    }
    
    // Add badge color based on role
    const roleBadgeClass = user.role === 'Admin' ? 'bg-danger' : 'bg-primary';
    
    // Add user info and logout button
    const userInfoHTML = `
      <li class="nav-item dropdown ms-auto">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="fas fa-user-circle me-1"></i> ${user.email}
          <span class="badge ${roleBadgeClass} ms-1">${user.role}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <div class="dropdown-item">
              <strong>Empresas com acesso:</strong>
              <div class="small mt-1">
                ${user.empresa && Array.isArray(user.empresa) ? 
                  user.empresa.map(company => `<span class="badge bg-light text-dark me-1">${company}</span>`).join('') : 
                  '<span class="text-muted">Nenhuma empresa</span>'}
              </div>
            </div>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-1"></i> Logout</a></li>
        </ul>
      </li>
    `;
  
    // Add admin tab if user is admin
    if (user.role === 'Admin') {
      console.log('Adding admin panel for admin user');
      document.body.classList.add('is-admin');
      
      // Add admin navigation tab
      const navTabs = document.querySelector('.nav-tabs');
      if (navTabs) {
        const adminTab = document.createElement('li');
        adminTab.className = 'nav-item admin-tab';
        adminTab.innerHTML = `
          <a class="nav-link" data-bs-toggle="tab" href="#admin-panel">
            <i class="fas fa-users-cog me-1"></i> Administração
          </a>
        `;
        navTabs.appendChild(adminTab);
        
        // Add admin panel content
        const tabContent = document.querySelector('.tab-content');
        if (tabContent) {
          console.log('Creating admin panel content');
          const adminPanel = document.createElement('div');
          adminPanel.className = 'tab-pane fade';
          adminPanel.id = 'admin-panel';
          adminPanel.setAttribute('role', 'tabpanel');
          adminPanel.setAttribute('aria-labelledby', 'admin-tab');
          adminPanel.innerHTML = `
            <div class="admin-panel mt-4">
              <h3 class="admin-title mb-4"><i class="fas fa-users-cog me-2"></i>Painel de Administração</h3>
              
              <!-- Sub-tabs para administração -->
              <ul class="nav nav-pills mb-4" id="adminSubTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="users-tab" data-bs-toggle="pill" data-bs-target="#users-management" type="button" role="tab" aria-controls="users-management" aria-selected="true">
                    <i class="fas fa-users me-2"></i>Gerenciamento de Usuários
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="companies-tab" data-bs-toggle="pill" data-bs-target="#companies-management" type="button" role="tab" aria-controls="companies-management" aria-selected="false">
                    <i class="fas fa-building me-2"></i>Gerenciamento de Empresas
                  </button>
                </li>
              </ul>
              
              <!-- Tab content para sub-abas -->
              <div class="tab-content" id="adminSubTabsContent">
                <!-- Gerenciamento de Usuários -->
                <div class="tab-pane fade show active" id="users-management" role="tabpanel" aria-labelledby="users-tab">
                  <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="mb-0"><i class="fas fa-users me-2"></i>Gerenciamento de Usuários</h4>
                    <button class="btn btn-success" onclick="openUserForm()">
                      <i class="fas fa-user-plus me-1"></i> Novo Usuário
                    </button>
                  </div>
                  
                  <!-- Search and filter -->
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                        <input type="text" class="form-control" id="userSearchInput" placeholder="Buscar usuários...">
                      </div>
                    </div>
                    <div class="col-md-6 text-md-end mt-2 mt-md-0">
                      <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-secondary user-filter active" data-filter="all">Todos</button>
                        <button type="button" class="btn btn-outline-secondary user-filter" data-filter="Admin">Admins</button>
                        <button type="button" class="btn btn-outline-secondary user-filter" data-filter="User">Usuários</button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Users table -->
                  <div class="table-responsive">
                    <table class="user-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Nome</th>
                          <th>Função</th>
                          <th>Empresas</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody id="users-table-body">
                        <!-- Users will be loaded here -->
                      </tbody>
                    </table>
                    
                    <!-- Empty state -->
                    <div id="no-users-message" class="text-center p-5 d-none">
                      <i class="fas fa-users fa-3x mb-3 text-muted"></i>
                      <p class="text-muted">Nenhum usuário encontrado</p>
                    </div>
                    
                    <!-- Loading state -->
                    <div id="users-loading" class="text-center p-5">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                      </div>
                      <p class="mt-2 text-muted">Carregando usuários...</p>
                    </div>
                  </div>
                </div>
                
                <!-- Gerenciamento de Empresas -->
                <div class="tab-pane fade" id="companies-management" role="tabpanel" aria-labelledby="companies-tab">
                  <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="mb-0"><i class="fas fa-building me-2"></i>Gerenciamento de Empresas</h4>
                    <button class="btn btn-success" onclick="openCompanyForm()">
                      <i class="fas fa-plus me-1"></i> Nova Empresa
                    </button>
                  </div>
                  
                  <!-- Search and filter -->
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <div class="input-group">
                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                        <input type="text" class="form-control" id="companySearchInput" placeholder="Buscar empresas...">
                      </div>
                    </div>
                    <div class="col-md-6 text-md-end mt-2 mt-md-0">
                      <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-secondary company-filter active" data-filter="all">Todas</button>
                        <button type="button" class="btn btn-outline-secondary company-filter" data-filter="active">Ativas</button>
                        <button type="button" class="btn btn-outline-secondary company-filter" data-filter="inactive">Inativas</button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Companies table -->
                  <div class="table-responsive">
                    <table class="user-table">
                      <thead>
                        <tr>
                          <th>Nome da Empresa</th>
                          <th>Ad Account ID</th>
                          <th>Status</th>
                          <th>Data de Criação</th>
                          <th>Usuários Vinculados</th>
                          <th>Saldo</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody id="companies-table-body">
                        <!-- Companies will be loaded here -->
                      </tbody>
                    </table>
                    
                    <!-- Empty state -->
                    <div id="no-companies-message" class="text-center p-5 d-none">
                      <i class="fas fa-building fa-3x mb-3 text-muted"></i>
                      <p class="text-muted">Nenhuma empresa encontrada</p>
                    </div>
                    
                    <!-- Loading state -->
                    <div id="companies-loading" class="text-center p-5 d-none">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                      </div>
                      <p class="mt-2 text-muted">Carregando empresas...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- User Form Modal -->
            <div class="modal fade" id="userModal" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="userModalTitle">Adicionar Usuário</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="user-form" class="user-form">
                      <input type="hidden" id="isEditing" value="false">
                      <input type="hidden" id="originalEmail" value="">
                      
                      <div class="mb-3">
                        <label for="userEmail" class="form-label">Email</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-envelope"></i></span>
                          <input type="email" class="form-control" id="userEmail" required>
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label for="userName" class="form-label">Nome Completo</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-user"></i></span>
                          <input type="text" class="form-control" id="userName" required placeholder="Digite o nome completo">
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label for="userPassword" class="form-label">Senha</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-lock"></i></span>
                          <input type="password" class="form-control" id="userPassword">
                          <button class="btn btn-outline-secondary user-form-toggle-password" type="button">
                            <i class="fas fa-eye"></i>
                          </button>
                        </div>
                        <small class="text-muted" id="passwordHint">Deixe em branco para manter a senha atual (apenas edição)</small>
                      </div>
                      
                      <div class="mb-3">
                        <label for="userRole" class="form-label">Função</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
                          <select class="form-select" id="userRole" required>
                            <option value="User">Usuário</option>
                            <option value="Admin">Administrador</option>
                          </select>
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label class="form-label"><i class="fas fa-building me-1"></i>Empresas</label>
                        <div class="d-flex justify-content-end mb-1">
                          <button type="button" class="btn btn-sm btn-link" id="selectAllCompanies">Selecionar todos</button>
                          <button type="button" class="btn btn-sm btn-link" id="deselectAllCompanies">Limpar</button>
                        </div>
                        <div id="companies-checkboxes" class="company-checkbox-list">
                          <!-- Companies will be loaded here -->
                        </div>
                      </div>
                      
                      <div id="modal-form-error" class="alert alert-danger mt-3" style="display: none;"></div>
                      
                      <div class="text-end">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                          <i class="fas fa-save me-1"></i>Salvar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Company Form Modal -->
            <div class="modal fade" id="companyModal" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="companyModalTitle">Adicionar Empresa</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="company-form" class="company-form">
                      <input type="hidden" id="isEditingCompany" value="false">
                      <input type="hidden" id="originalCompanyName" value="">
                      
                      <div class="mb-3">
                        <label for="companyName" class="form-label">Nome da Empresa</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-building"></i></span>
                          <input type="text" class="form-control" id="companyName" required>
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label for="companyAdAccountId" class="form-label">ID da Conta de Anúncio</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-ad"></i></span>
                          <input type="text" class="form-control" id="companyAdAccountId" required placeholder="Ex: 1010333534298546">
                        </div>
                        <div class="form-text">
                          <i class="fas fa-info-circle me-1"></i>
                          ID da conta de anúncio (apenas números) usado para buscar as métricas
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label for="companyDescription" class="form-label">Descrição (Opcional)</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-info-circle"></i></span>
                          <textarea class="form-control" id="companyDescription" rows="3"></textarea>
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label for="companyStatus" class="form-label">Status</label>
                        <div class="input-group">
                          <span class="input-group-text"><i class="fas fa-toggle-on"></i></span>
                          <select class="form-select" id="companyStatus" required>
                            <option value="active">Ativa</option>
                            <option value="inactive">Inativa</option>
                          </select>
                        </div>
                      </div>
                      
                      <div id="modal-company-form-error" class="alert alert-danger mt-3" style="display: none;"></div>
                      
                      <div class="text-end">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary">
                          <i class="fas fa-save me-1"></i>Salvar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          `;
          tabContent.appendChild(adminPanel);
          
          // IMPORTANTE: Anexar listener do formulário APÓS criar o modal
          setupUserFormListener();
          setupCompanyFormListener();
          
          // Add event listener for companies tab to load data when clicked
          document.getElementById('companies-tab')?.addEventListener('click', function() {
            setTimeout(() => {
              loadCompaniesForManagement();
            }, 100);
          });
          
          // Add event listeners for select/deselect all companies
          document.getElementById('selectAllCompanies')?.addEventListener('click', function() {
            document.querySelectorAll('.company-check').forEach(checkbox => {
              checkbox.checked = true;
            });
          });
          
          document.getElementById('deselectAllCompanies')?.addEventListener('click', function() {
            document.querySelectorAll('.company-check').forEach(checkbox => {
              checkbox.checked = false;
            });
          });
          
          // Add event listener for password toggle in user form
          document.querySelector('.user-form-toggle-password')?.addEventListener('click', function() {
            const passwordInput = document.getElementById('userPassword');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
              passwordInput.type = 'text';
              icon.classList.remove('fa-eye');
              icon.classList.add('fa-eye-slash');
            } else {
              passwordInput.type = 'password';
              icon.classList.remove('fa-eye-slash');
              icon.classList.add('fa-eye');
            }
          });
          
          // Add event listeners for user filtering
          document.querySelectorAll('.user-filter')?.forEach(button => {
            button.addEventListener('click', function() {
              // Update active button
              document.querySelectorAll('.user-filter').forEach(btn => btn.classList.remove('active'));
              this.classList.add('active');
              
              // Apply filter
              const filter = this.dataset.filter;
              filterUsers(filter);
            });
          });
          
          // Add event listeners for company filtering
          document.querySelectorAll('.company-filter')?.forEach(button => {
            button.addEventListener('click', function() {
              // Update active button
              document.querySelectorAll('.company-filter').forEach(btn => btn.classList.remove('active'));
              this.classList.add('active');
              
              // Apply filter - placeholder for now
              const filter = this.dataset.filter;
              console.log('Company filter:', filter);
            });
          });
          
          // Add event listener for user search
          document.getElementById('userSearchInput')?.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            searchUsers(searchTerm);
          });
          
          // Add event listener for company search
          document.getElementById('companySearchInput')?.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            console.log('Company search:', searchTerm);
          });
          
          // Load users and companies for the admin panel
          console.log('Loading users and companies for admin panel');
          loadUsers();
          loadCompanies();
          
          // Make the admin panel tab clickable to show content
          document.querySelector('.nav-link[href="#admin-panel"]').addEventListener('click', function() {
            console.log('Admin tab clicked');
            const adminPanel = document.getElementById('admin-panel');
            if (adminPanel) {
              // Show the admin panel tab
              document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
              });
              adminPanel.classList.add('show', 'active');
              
              // Update active tab
              document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
              });
              this.classList.add('active');
            }
          });
        }
      }
    }
    
    // Insert user info into navbar
    navbarRight.innerHTML += userInfoHTML;
  } catch (error) {
    console.error('Error setting up user interface:', error);
  }
}

// Load companies for user with access restrictions
async function loadCompaniesBasedOnAccess(user) {
  try {
    console.log('Loading companies for user:', user.email);
    console.log('User role:', user.role);
    console.log('User empresa access:', user.empresa);
    
    const response = await fetch('/api/companies', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erro ao carregar empresas');
    }
    
    const companies = await response.json();
    console.log('All companies from API:', companies);
    
    // If user is not admin, filter companies based on access
    let accessibleCompanies = companies;
    if (user.role !== 'Admin' && Array.isArray(user.empresa)) {
      accessibleCompanies = companies.filter(company => {
        // Handle both name and empresa properties for backward compatibility
        const companyName = company.name || company.empresa;
        return user.empresa.includes(companyName);
      });
      console.log('Filtered accessible companies:', accessibleCompanies);
    }
    
    // Store accessible companies in session storage
    sessionStorage.setItem('accessibleCompanies', JSON.stringify(accessibleCompanies));
    
    // Update company filter dropdown
    const companySelect = document.getElementById('company-select');
    if (companySelect) {
      companySelect.innerHTML = '<option value="">Todas as Empresas</option>';
      
      if (accessibleCompanies.length > 0) {
        accessibleCompanies.forEach(company => {
          // Handle both name and empresa properties
          const companyName = company.name || company.empresa;
          
          const option = document.createElement('option');
          option.value = companyName;
          option.textContent = companyName;
          companySelect.appendChild(option);
        });
      } else {
        // If no accessible companies, show message
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'Nenhuma empresa disponível';
        companySelect.appendChild(option);
      }
      
      // Add a custom data attribute to show if user is restricted
      companySelect.dataset.restricted = user.role !== 'Admin' ? 'true' : 'false';
      
      // Add a badge showing access level near the select
      const filterContainer = companySelect.closest('.col-md-4');
      if (filterContainer) {
        const accessBadge = document.createElement('div');
        accessBadge.className = 'mt-1';
        
        if (user.role === 'Admin') {
          accessBadge.innerHTML = `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Acesso total</span>`;
        } else {
          accessBadge.innerHTML = `
            <span class="badge bg-warning text-dark">
              <i class="fas fa-filter me-1"></i>Acesso restrito (${accessibleCompanies.length} ${accessibleCompanies.length === 1 ? 'empresa' : 'empresas'})
            </span>`;
        }
        
        filterContainer.appendChild(accessBadge);
      }
    }
  } catch (error) {
    console.error('Error loading companies:', error);
    
    // Show error in dropdown
    const companySelect = document.getElementById('company-select');
    if (companySelect) {
      companySelect.innerHTML = '<option value="">Erro ao carregar empresas</option>';
    }
  }
}

// Admin functions for user management
async function loadUsers() {
  if (document.getElementById('users-table-body')) {
    try {
      // Show loading, hide empty state
      document.getElementById('users-loading').style.display = 'block';
      document.getElementById('no-users-message').classList.add('d-none');
      
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const users = await response.json();
      const tableBody = document.getElementById('users-table-body');
      tableBody.innerHTML = '';
      
      // Get current user email to highlight
      const currentUserEmail = JSON.parse(sessionStorage.getItem('currentUser'))?.email;
      
      if (users.length === 0) {
        // Show empty state
        document.getElementById('no-users-message').classList.remove('d-none');
      } else {
        users.forEach(user => {
          const row = document.createElement('tr');
          
          // Highlight current user
          if (user.email === currentUserEmail) {
            row.classList.add('table-active');
          }
          
          // Format companies array for display
          const companies = Array.isArray(user.empresa) 
            ? user.empresa.join(', ') 
            : (user.empresa || 'Nenhuma');
          
          // Add role badge color
          const roleBadge = user.role === 'Admin' 
            ? '<span class="badge bg-danger">Admin</span>'
            : '<span class="badge bg-primary">User</span>';
          
          // Format company badges
          let companyBadges = 'Nenhuma';
          if (Array.isArray(user.empresa) && user.empresa.length > 0) {
            companyBadges = user.empresa.map(company => 
              `<span class="badge bg-light text-dark me-1">${company}</span>`
            ).join('');
          }
          
          row.innerHTML = `
            <td data-label="Email">
              ${user.email === currentUserEmail ? '<i class="fas fa-user-circle me-1 text-primary"></i>' : ''}
              ${user.email}
            </td>
            <td data-label="Nome">${user.nome || '<span class="text-muted">Não informado</span>'}</td>
            <td data-label="Função">${roleBadge}</td>
            <td data-label="Empresas">${companyBadges}</td>
            <td data-label="Ações">
              <button class="btn btn-sm btn-edit action-btn" onclick="editUser('${user.email}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              ${user.email !== currentUserEmail ? 
                `<button class="btn btn-sm btn-delete action-btn" onclick="deleteUser('${user.email}')">
                  <i class="fas fa-trash-alt"></i> Excluir
                </button>` : 
                '<!-- Cannot delete current user -->'
              }
            </td>
          `;
          tableBody.appendChild(row);
        });
      }
      
      // Hide loading
      document.getElementById('users-loading').style.display = 'none';
      
      // Apply current filter
      const currentFilter = document.querySelector('.user-filter.active')?.dataset.filter || 'all';
      filterUsers(currentFilter);
      
      // Apply current search
      const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
      if (searchTerm) {
        searchUsers(searchTerm);
      }
      
    } catch (error) {
      console.error('Error loading users:', error);
      document.getElementById('users-loading').style.display = 'none';
      
      // Show error message
      const tableBody = document.getElementById('users-table-body');
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger p-3">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Erro ao carregar usuários. Por favor, tente novamente.
          </td>
        </tr>
      `;
    }
  }
}

// Load all companies for admin user form
async function loadCompanies() {
  if (document.getElementById('companies-checkboxes')) {
    try {
      console.log('Loading all companies for admin user form');
      
      // Limpar container de checkboxes e mostrar mensagem de carregamento
      const checkboxesContainer = document.getElementById('companies-checkboxes');
      checkboxesContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Carregando empresas...</p></div>';
        // Usando a rota de produção apropriada para obter empresas
      const response = await fetch('/api/companies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      console.log('Companies API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar empresas: ${response.status} ${response.statusText}`);
      }      // A rota /api/companies retorna o array diretamente
      const companies = await response.json();
      console.log('API response:', companies);
      console.log('Companies for admin form:', companies);
      console.log('Number of companies loaded:', companies.length);
      
      checkboxesContainer.innerHTML = '';
      
      if (!Array.isArray(companies) || companies.length === 0) {
        console.warn('Companies API returned empty array or invalid data');
        checkboxesContainer.innerHTML = '<div class="alert alert-warning text-center p-3"><i class="fas fa-exclamation-triangle me-2"></i>Nenhuma empresa encontrada no sistema</div>';
        return;
      }
      
      companies.forEach(company => {
        // Handle both name and empresa properties for backward compatibility
        const companyName = company.name || company.empresa;
        if (!companyName) {
          console.warn('Company missing name property:', company);
          return;
        }
        
        const div = document.createElement('div');
        div.className = 'company-checkbox';
        div.innerHTML = `
          <div class="form-check">
            <input class="form-check-input company-check" type="checkbox" value="${companyName}" id="company-${companyName.replace(/\s+/g, '-')}">
            <label class="form-check-label" for="company-${companyName.replace(/\s+/g, '-')}">
              ${companyName}
            </label>
          </div>
        `;
        checkboxesContainer.appendChild(div);
      });
      
      // If no companies were added to the DOM
      if (checkboxesContainer.children.length === 0) {
        console.warn('No companies were added to the DOM');
        checkboxesContainer.innerHTML = '<div class="text-center text-muted p-3">Nenhuma empresa encontrada para exibir</div>';
      } else {
        console.log(`${checkboxesContainer.children.length} companies added to the DOM`);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      
      // Show error in container
      const checkboxesContainer = document.getElementById('companies-checkboxes');
      checkboxesContainer.innerHTML = '<div class="text-danger p-3"><i class="fas fa-exclamation-triangle me-2"></i>Erro ao carregar empresas</div>';
    }
  }
}

// Open user form modal for adding new user
function openUserForm() {
  const userModalElement = document.getElementById('userModal');
  
  // Clean up any existing modal instance
  const existingInstance = bootstrap.Modal.getInstance(userModalElement);
  if (existingInstance) {
    try {
      existingInstance.dispose();
    } catch (e) {
      console.log('Modal instance already disposed');
    }
  }
  
  // Reset body state before creating new modal
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  
  // Remove any stuck backdrops
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());
  
  // Reset modal attributes completely
  userModalElement.removeAttribute('aria-hidden');
  userModalElement.removeAttribute('style');
  userModalElement.classList.remove('show');
  
  // Clear and reset form completely
  const userForm = document.getElementById('user-form');
  if (userForm) {
    userForm.reset();
  }
  
  const modal = new bootstrap.Modal(userModalElement);
  document.getElementById('userModalTitle').textContent = 'Adicionar Usuário';
  document.getElementById('isEditing').value = 'false';
  document.getElementById('passwordHint').style.display = 'none';
  document.getElementById('userPassword').required = true;
  
  // Clear error message if it was previously shown
  const errorDiv = document.getElementById('modal-form-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }
  
  // Clear all checkboxes
  document.querySelectorAll('.company-check').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Reset submit button state
  const submitBtn = userModalElement.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save me-1"></i>Salvar';
  }
  
  modal.show();
}

// Open user form for editing
async function editUser(email) {
  try {
    console.log('Loading user data for editing:', email);
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erro ao carregar usuários');
    }
    
    const users = await response.json();
    const user = users.find(u => u.email === email);
    
    console.log('User data found:', user);
    
    if (user) {
      const userModalElement = document.getElementById('userModal');
      
      // Clean up any existing modal instance
      const existingInstance = bootstrap.Modal.getInstance(userModalElement);
      if (existingInstance) {
        try {
          existingInstance.dispose();
        } catch (e) {
          console.log('Modal instance already disposed');
        }
      }
      
      // Reset body state before creating new modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Remove any stuck backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      const modal = new bootstrap.Modal(userModalElement);
      document.getElementById('userModalTitle').textContent = 'Editar Usuário';
      document.getElementById('isEditing').value = 'true';
      document.getElementById('originalEmail').value = user.email;
      document.getElementById('userEmail').value = user.email;
      document.getElementById('userName').value = user.nome || '';
      document.getElementById('userRole').value = user.role || 'User'; // Default to User if not set
      document.getElementById('userPassword').value = '';
      document.getElementById('userPassword').required = false;
      document.getElementById('passwordHint').style.display = 'block';
      
      // Clear error message if it was previously shown
      const errorDiv = document.getElementById('modal-form-error');
      errorDiv.style.display = 'none';
      
      // Make sure empresa is an array
      const empresaArray = user.empresa && Array.isArray(user.empresa) ? 
        user.empresa : 
        (user.empresa ? [user.empresa] : []);
      
      console.log('User empresa access array:', empresaArray);
      
      // Update company checkboxes
      document.querySelectorAll('.company-check').forEach(checkbox => {
        checkbox.checked = empresaArray.includes(checkbox.value);
      });
      
      modal.show();
    } else {
      console.warn(`Usuário ${email} não encontrado`);
      // Não mostrar toast para usuário não encontrado durante navegação
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    // Apenas log do erro, sem toast intrusivo
    console.warn('Falha ao carregar dados do usuário');
  }
}

// Utility function to clean up modal state and DOM
function cleanupModal(modalElement, modalInstance, isDynamic = false) {
  if (modalInstance) {
    try {
      modalInstance.dispose();
    } catch (e) {
      console.log('Modal instance already disposed');
    }
  }
  
  if (modalElement) {
    setTimeout(() => {
      // Only remove the element if it's a dynamic modal (created on the fly)
      if (isDynamic) {
        modalElement.remove();
      }
      
      // Clear any modal backdrop that might be stuck
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Reset body state
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Reset modal attributes for reuse
      if (!isDynamic) {
        modalElement.removeAttribute('aria-hidden');
        modalElement.removeAttribute('style');
        modalElement.classList.remove('show');
      }
    }, 300);
  }
}

// Delete user confirmation
function deleteUser(email) {
  // Create a custom modal for deletion confirmation
  const modalId = 'deleteConfirmModal';
  
  // Remove existing modal if it exists (simple cleanup)
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    const existingInstance = bootstrap.Modal.getInstance(existingModal);
    cleanupModal(existingModal, existingInstance, true);
  }
  
  const modalDiv = document.createElement('div');
  modalDiv.className = 'modal fade';
  modalDiv.id = modalId;
  modalDiv.tabIndex = '-1';
  modalDiv.setAttribute('aria-hidden', 'true');
  
  modalDiv.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">
            <i class="fas fa-exclamation-triangle me-2"></i>Confirmar Exclusão
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p>Tem certeza que deseja excluir o usuário <strong>${email}</strong>?</p>
          <p class="text-danger"><i class="fas fa-info-circle me-1"></i> Esta ação não pode ser desfeita.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
            <i class="fas fa-trash-alt me-1"></i>Excluir Usuário
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalDiv);
  const deleteModal = document.getElementById(modalId);

  // Create Bootstrap modal
  const modal = new bootstrap.Modal(deleteModal);
  
  // Set up the confirm button action
  document.getElementById('confirmDeleteBtn').onclick = async function() {
    try {
      // Show loading state
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Excluindo...';
      
      const response = await fetch(`/api/users/${email}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }
      
      // Hide modal
      modal.hide();
      
      // Show success toast
      showToast('Sucesso!', `O usuário ${email} foi excluído com sucesso.`, 'success');
      
      // Reload users table
      loadUsers();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Show error message in modal
      const modalBody = deleteModal.querySelector('.modal-body');
      modalBody.innerHTML += `
        <div class="alert alert-danger mt-3">
          <i class="fas fa-times-circle me-1"></i> ${error.message || 'Erro ao excluir usuário'}
        </div>
      `;
      
      // Reset button
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-trash-alt me-1"></i>Excluir Usuário';
    }
  };
  
  // Enhanced cleanup when modal is hidden
  deleteModal.addEventListener('hidden.bs.modal', function() {
    cleanupModal(deleteModal, modal, true);
  });
  
  // Show the modal
  modal.show();
}

// Show toast notification
function showToast(title, message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Set icon based on type
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'warning') icon = 'exclamation-triangle';
  if (type === 'error') icon = 'times-circle';
  
  // Create toast element
  const toastId = `toast-${Date.now()}`;
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center border-0 bg-${type === 'error' ? 'danger' : type}`;
  toastEl.id = toastId;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body text-white">
        <i class="fas fa-${icon} me-2"></i>
        <strong>${title}</strong> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toastEl);
  
  // Initialize and show toast
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 5000
  });
  toast.show();
  
  // Remove toast element after it's hidden
  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// Setup user form listener - DEVE ser chamada APÓS criar o modal
function setupUserFormListener() {
  const userForm = document.getElementById('user-form');
  if (!userForm) {
    console.error('❌ ERRO: Formulário user-form não encontrado ao tentar anexar listener!');
    return;
  }
  
  console.log('✅ Anexando listener ao formulário user-form');
  
  userForm.addEventListener('submit', async function(e) {
    console.log('🚨 FORMULÁRIO ENVIADO! Event listener funcionando!');
    e.preventDefault();
    
    // Get form values
    const isEditing = document.getElementById('isEditing').value === 'true';
    const originalEmail = document.getElementById('originalEmail').value;
    const email = document.getElementById('userEmail').value;
    const nome = document.getElementById('userName').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const errorDiv = document.getElementById('modal-form-error');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    // Get selected companies
    const selectedCompanies = [];
    document.querySelectorAll('.company-check:checked').forEach(checkbox => {
      selectedCompanies.push(checkbox.value);
    });
    
    // Debug: verificar empresas selecionadas
    console.log('🐛 DEBUG: Empresas selecionadas:', selectedCompanies);
    console.log('🐛 DEBUG: Número de checkboxes marcados:', document.querySelectorAll('.company-check:checked').length);
    console.log('🐛 DEBUG: Todos os checkboxes:', Array.from(document.querySelectorAll('.company-check')).map(cb => ({ value: cb.value, checked: cb.checked })));
    
    // Validate form
    if (selectedCompanies.length === 0) {
      errorDiv.textContent = 'Selecione pelo menos uma empresa';
      errorDiv.style.display = 'block';
      return;
    }
    
    // Validate password for new users
    if (!isEditing && (!password || password.trim() === '')) {
      errorDiv.textContent = 'Senha é obrigatória para novos usuários';
      errorDiv.style.display = 'block';
      return;
    }
    
    // Show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';
    errorDiv.style.display = 'none';
    
    // Create user data object
    const userData = {
      email,
      nome,
      role,
      empresa: selectedCompanies
    };
    
    // Add password only if provided (for edits) or creating new user
    if (password || !isEditing) {
      userData.password = password;
    }
    
    // Debug log
    console.log('🐛 DEBUG: Dados sendo enviados para API:', {
      isEditing,
      userData,
      passwordLength: password ? password.length : 0,
      selectedCompaniesCount: selectedCompanies.length
    });
    
    try {
      let response;
      
      if (isEditing) {
        // Update existing user
        response = await fetch(`/api/users/${originalEmail}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
          credentials: 'include'
        });
      } else {
        // Create new user
        console.log('🚀 ENVIANDO POST para /api/users');
        response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
          credentials: 'include'
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('🐛 DEBUG: Erro da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || 'Erro ao salvar usuário');
      }
      
      console.log('🐛 DEBUG: Resposta da API:', {
        status: response.status,
        statusText: response.statusText
      });
      
      const data = await response.json();
      console.log('🐛 DEBUG: Dados recebidos da API:', data);
      
      // Hide modal with proper cleanup
      const userModalElement = document.getElementById('userModal');
      const modalInstance = bootstrap.Modal.getInstance(userModalElement);
      
      if (modalInstance) {
        modalInstance.hide();
        
        // Clean up modal state after hiding
        userModalElement.addEventListener('hidden.bs.modal', function cleanup() {
          // Remove this event listener to avoid multiple bindings
          userModalElement.removeEventListener('hidden.bs.modal', cleanup);
          
          // Clean up modal state (false = not a dynamic modal, don't remove from DOM)
          cleanupModal(userModalElement, modalInstance, false);
        });
      }
      
      // Show success message
      showToast(
        isEditing ? 'Usuário atualizado!' : 'Usuário criado!',
        isEditing ? `As informações de ${email} foram atualizadas.` : `Usuário ${email} criado com sucesso.`,
        'success'
      );
      
      // If current user was updated, refresh session data
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
      if (currentUser && currentUser.email === originalEmail) {
        // Update session storage with updated user data
        currentUser.role = role;
        currentUser.empresa = selectedCompanies;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Refresh page if role changed (to update admin panel visibility)
        if (currentUser.role !== role) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      }
      
      // Reload users list
      loadUsers();
      
    } catch (error) {
      console.error('Error saving user:', error);
      
      // Show error message
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Filter users by role
function filterUsers(filter) {
  const rows = document.querySelectorAll('#users-table-body tr');
  let visibleCount = 0;
  
  rows.forEach(row => {
    const userRole = row.querySelector('[data-label="Função"]')?.textContent;
    
    if (filter === 'all' || userRole === filter) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Show/hide no users message
  const noUsersMessage = document.getElementById('no-users-message');
  if (noUsersMessage) {
    noUsersMessage.classList.toggle('d-none', visibleCount > 0);
  }
}

// Search users
function searchUsers(searchTerm) {
  const rows = document.querySelectorAll('#users-table-body tr');
  let visibleCount = 0;
  
  rows.forEach(row => {
    const email = row.querySelector('[data-label="Email"]')?.textContent.toLowerCase();
    const role = row.querySelector('[data-label="Função"]')?.textContent.toLowerCase();
    const companies = row.querySelector('[data-label="Empresas"]')?.textContent.toLowerCase();
    
    // Get current filter
    const currentFilter = document.querySelector('.user-filter.active')?.dataset.filter || 'all';
    const userRole = row.querySelector('[data-label="Função"]')?.textContent;
    
    // Check if matches both search and filter
    const matchesSearch = !searchTerm || 
      email.includes(searchTerm) || 
      role.includes(searchTerm) || 
      companies.includes(searchTerm);
    
    const matchesFilter = currentFilter === 'all' || userRole === currentFilter;
    
    if (matchesSearch && matchesFilter) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  // Show/hide no users message
  const noUsersMessage = document.getElementById('no-users-message');
  if (noUsersMessage) {
    noUsersMessage.classList.toggle('d-none', visibleCount > 0);
  }
}
