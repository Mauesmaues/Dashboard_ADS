// Lógica principal da aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa dados e interface
    initializeApp();
});

// Inicializa a aplicação
async function initializeApp() {
    try {
        showLoading(true);
        
        // Primeiro verifica se o usuário está autenticado
        const authResponse = await fetch('/api/auth/check', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!authResponse.ok) {
            // Não autenticado, redireciona para o login
            console.log('Usuário não autenticado. Redirecionando para página de login...');
            window.location.href = '/login.html';
            return;
        }
        
        // Usuário autenticado, obtém dados do usuário
        const userData = await authResponse.json();
        console.log('Usuário autenticado:', userData.user.email);
        
        // Inicializa tooltips do Bootstrap
        inicializarTooltips();
        
        // Carrega datas padrão
        await carregarDataspadrao();
        
        // Carrega empresas para o dropdown
        await carregarEmpresas();
        
        // Inicializa filtros de data
        if (window.filters && typeof window.filters.initializeDateFilters === 'function') {
            window.filters.initializeDateFilters();
        }
        
        // Configura listeners de eventos
        setupEventListeners();
        
        // Aguarda um pouco para garantir que o DOM está completamente pronto
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Inicializa gráficos vazios
        if (typeof initializeCharts === 'function') {
            console.log('Initializing charts...');
            initializeCharts();
        } else {
            console.warn('initializeCharts function not found');
        }
        
        // Carrega dados iniciais
        await loadMetricsData();
        
        // Configura listeners de troca de abas
        const dailyTab = document.getElementById('daily-tab');
        if (dailyTab) {
            dailyTab.addEventListener('click', () => {
                if (typeof toggleCharts === 'function') {
                    toggleCharts(false);
                }
            });
        }
        
        const companyTab = document.getElementById('company-tab');
        if (companyTab) {
            companyTab.addEventListener('click', () => {
                if (typeof toggleCharts === 'function') {
                    toggleCharts(true);
                }
                
                // Carrega dados de empresa se ainda não foram carregados
                const companyTableBody = document.getElementById('companyTableBody');
                if (companyTableBody && companyTableBody.children.length === 0) {
                    loadCompanyMetricsData();
                }
            });
        }
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorMessage('Falha ao inicializar a aplicação. Verifique a conexão com o servidor.');
    } finally {
        showLoading(false);
    }
}

// Carrega o intervalo de datas padrão (primeiro dia do mês até o dia atual)
async function carregarDataspadrao() {
    try {
        showLoading(true);
        
        const resposta = await fetch('/api/default-dates', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Inclui cookies para autenticação
        });
        
        // Trata erros de autenticação
        if (resposta.status === 401) {
            console.log('Sessão expirada ou não autenticado. Redirecionando para login...');
            window.location.href = '/login.html';
            return;
        }
        
        if (!resposta.ok) throw new Error('Failed to fetch default dates');
        
        const data = await resposta.json();
        console.log('Dados de range recebidos:', data);
        
        const startDateEl = document.getElementById('startDate');
        const endDateEl = document.getElementById('endDate');
        
        if (startDateEl && endDateEl) {
            startDateEl.value = data.startDate;
            endDateEl.value = data.endDate;
            
            // Initialize date pickers com range baseado nos dados reais
            initializeDatePickers(data);
            
            // Log para debug
            console.log(`Datas configuradas: ${data.startDate} até ${data.endDate}`);
            if (data.hasData) {
                console.log(`Range baseado em dados reais (${data.totalDays} dias de dados)`);
            } else {
                console.log('Range padrão (nenhum dado encontrado)');
            }
        } else {
            console.error('Date input elements not found');
            // Fallback to current month
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const formattedStart = `${String(startOfMonth.getDate()).padStart(2, '0')}/${String(startOfMonth.getMonth() + 1).padStart(2, '0')}/${startOfMonth.getFullYear()}`;
            const formattedEnd = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            
            if (startDateEl) startDateEl.value = formattedStart;
            if (endDateEl) endDateEl.value = formattedEnd;
        }
    } catch (error) {
        console.error('Error loading default dates:', error);
        
        // Fallback to current month
        const startDateEl = document.getElementById('startDate');
        const endDateEl = document.getElementById('endDate');
        
        if (startDateEl && endDateEl) {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const formattedStart = `${String(startOfMonth.getDate()).padStart(2, '0')}/${String(startOfMonth.getMonth() + 1).padStart(2, '0')}/${startOfMonth.getFullYear()}`;
            const formattedEnd = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            
            startDateEl.value = formattedStart;
            endDateEl.value = formattedEnd;
        }
        
        // Initialize date pickers even if there was an error
        initializeDatePickers();
    } finally {
        showLoading(false);
    }
}

// Carrega empresas para o menu suspenso
async function carregarEmpresas() {
    try {
        showLoading(true);
        
        console.log('🔍 [DEBUG] Iniciando carregamento de empresas...');
        
        // Usar endpoint correto para campanhas N8N que considera permissões de usuário
        const resposta = await fetch('/api/campanhas/empresas', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Inclui cookies para autenticação
        });
        
        console.log('🔍 [DEBUG] Status da resposta:', resposta.status);
        
        if (resposta.status === 401) {
            // Não autenticado, redireciona para página de login
            window.location.href = '/login.html';
            return;
        }
        
        if (!resposta.ok) throw new Error('Falha ao buscar empresas');
        
        const response = await resposta.json();
        console.log('🔍 [DEBUG] Resposta completa do servidor:', response);
        
        // O endpoint retorna { sucesso: true, empresas: [...] }
        if (!response.sucesso || !Array.isArray(response.empresas)) {
            console.error('🔍 [DEBUG] Formato de resposta inválido:', response);
            throw new Error('Formato de resposta inválido');
        }
        
        const empresas = response.empresas;
        console.log('🔍 [DEBUG] Array de empresas:', empresas);
        console.log('🔍 [DEBUG] Total de empresas encontradas:', empresas.length);
        
        // Preenche o menu suspenso de empresas - usando o ID correto do HTML (company-select)
        const seletorEmpresa = document.getElementById('company-select');
        if (!seletorEmpresa) {
            console.error('Menu suspenso de empresas não encontrado');
            return;
        }
        
        seletorEmpresa.innerHTML = '<option value="">Todas as Empresas</option>';
        
        empresas.forEach((empresa, index) => {
            console.log(`🔍 [DEBUG] Processando empresa ${index + 1}:`, empresa);
            const opcao = document.createElement('option');
            opcao.value = empresa.nome;
            opcao.textContent = empresa.nome;
            seletorEmpresa.appendChild(opcao);
            console.log(`🔍 [DEBUG] Adicionada opção: ${empresa.nome}`);
        });

        console.log('✅ [DEBUG] Empresas carregadas no menu:', empresas.map(e => e.nome).join(', '));
        console.log('🔍 [DEBUG] Total de opções no select:', seletorEmpresa.children.length);
        
        // Carregar dados automaticamente após carregar empresas
        console.log('🔄 [DEBUG] Carregando dados de empresas automaticamente...');
        setTimeout(() => {
            loadCompanyMetricsData();
        }, 1000);
    } catch (erro) {
        console.error('❌ [DEBUG] Erro ao carregar empresas:', erro);
        showErrorMessage('Falha ao carregar empresas. Verifique se você está logado.');
    } finally {
        showLoading(false);
    }
}

// Initialize date picker components
function initializeDatePickers(dateRangeData = null) {
    // Configurações base do date picker
    const dateOptions = {
        dateFormat: 'd/m/Y',
        locale: 'pt',
        showMonths: 1,
        animate: true,
        disableMobile: "true",
        rangeSeparator: ' até ',
        position: "auto",
        monthSelectorType: "dropdown",
        yearSelectorType: "dropdown"
    };
    
    // Se temos dados reais, configurar limites baseados nos dados
    if (dateRangeData && dateRangeData.hasData) {
        console.log('Configurando date pickers com range real dos dados...');
        
        // Converter datas para o formato do flatpickr
        const minDate = dateRangeData.firstRecord || dateRangeData.startDate;
        const maxDate = dateRangeData.lastRecord || dateRangeData.endDate;
        
        dateOptions.minDate = minDate;
        dateOptions.maxDate = maxDate;
        
        console.log(`Date picker configurado com limites: ${minDate} até ${maxDate}`);
    } else {
        // Usar configuração padrão (máximo hoje)
        dateOptions.maxDate = 'today';
        console.log('Date picker configurado com limite padrão (máximo hoje)');
    }
    
    // Destruir date pickers existentes se houver
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl && startDateEl._flatpickr) {
        startDateEl._flatpickr.destroy();
    }
    if (endDateEl && endDateEl._flatpickr) {
        endDateEl._flatpickr.destroy();
    }
    
    // Inicializar date picker para data de início
    flatpickr('#startDate', {
        ...dateOptions,
        onClose: function(selectedDates, dateStr) {
            // Atualiza a data mínima do endDate para a data selecionada no startDate
            const endDatePicker = document.getElementById('endDate')._flatpickr;
            if (selectedDates[0]) {
                endDatePicker.set('minDate', selectedDates[0]);
            }
        }
    });
    
    // Inicializar date picker para data de fim
    flatpickr('#endDate', {
        ...dateOptions,
        onClose: function(selectedDates, dateStr) {
            // Atualiza a data máxima do startDate para a data selecionada no endDate
            const startDatePicker = document.getElementById('startDate')._flatpickr;
            if (selectedDates[0]) {
                startDatePicker.set('maxDate', selectedDates[0]);
            }
        }
    });
    
    console.log('Date pickers inicializados com sucesso');
}

// Set up event listeners
function setupEventListeners() {
    // Apply filters button
    document.getElementById('applyFilters').addEventListener('click', async () => {
        showLoading(true);
        try {
            await loadMetricsData();
            await loadCompanyMetricsData();
        } catch (error) {
            console.error('Error applying filters:', error);
            showErrorMessage('Falha ao aplicar os filtros. Verifique a conexão com o servidor.');
        } finally {
            showLoading(false);
        }
    });
    
    // Date filter preset buttons
    document.querySelectorAll('.btn-filter').forEach(button => {
        button.addEventListener('click', async () => {
            showLoading(true);
            try {
                // Small delay to allow the filter to be applied first
                setTimeout(async () => {
                    await loadMetricsData();
                    await loadCompanyMetricsData();
                    showLoading(false);
                }, 300);
            } catch (error) {
                console.error('Error applying date filter preset:', error);
                showErrorMessage('Falha ao aplicar o filtro de data. Verifique a conexão com o servidor.');
                showLoading(false);
            }
        });
    });
    
    // Export daily data button
    document.getElementById('exportDailyBtn').addEventListener('click', exportToExcel);
    
    // Export company data button
    document.getElementById('exportCompanyBtn').addEventListener('click', exportCompanyDataToExcel);
    
    // Tab change event - load company data when switching to company tab
    document.getElementById('company-tab').addEventListener('click', async () => {
        if (document.getElementById('companyTableBody').children.length === 0) {
            await loadCompanyMetricsData();
        }
    });
}

// Load metrics data based on filters
async function loadMetricsData() {
    try {
        // Get filter values
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const company = document.getElementById('company-select')?.value;
        
        // Expor função globalmente para acesso em charts.js
        window.loadMetricsData = loadMetricsData;
        
        // Validate dates
        if (!startDate || !endDate) {
            showErrorMessage('Por favor, preencha as datas de início e fim.');
            return;
        }
        
        console.log(`Carregando dados com filtros: data inicial=${startDate}, data final=${endDate}, empresa=${company || 'todas'}`);
        
        // Show loading indicator
        showLoading(true);
        
        // Build query URL
        let url = `/api/metrics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        if (company) {
            url += `&company=${encodeURIComponent(company)}`;
            console.log(`Aplicando filtro de empresa: ${company}`);
        }
        
        console.log(`Fazendo requisição para: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Include cookies for authentication
        });
        
        // Handle authentication errors
        if (response.status === 401) {
            console.log('Session expired or not authenticated. Redirecting to login...');
            window.location.href = '/login.html';
            return false;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch metrics data');
        }
        
        const metricsData = await response.json();
        
        // Check if data is valid
        if (!Array.isArray(metricsData)) {
            throw new Error('Dados recebidos em formato inválido');
        }
        
        console.log(`Dados carregados: ${metricsData.length} registros`);
        
        // Update UI with data
        populateMetricsTable(metricsData);
        
        // Update charts
        if (typeof updateCharts === 'function') {
            updateCharts(metricsData);
        } else {
            console.warn('updateCharts function not found');
        }
        
        return true;
    } catch (error) {
        console.error('Error loading metrics data:', error);
        showErrorMessage('Falha ao carregar dados. Verifique se você está logado e tem permissão para acessar estes dados.');
        return false;
    } finally {
        showLoading(false);
    }
}

// Load company metrics data based on filters
async function loadCompanyMetricsData() {
    try {
        // Get filter values
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const company = document.getElementById('company-select')?.value;
        
        console.log('🔍 [DEBUG] Valores dos campos:');
        console.log('   - startDate element:', document.getElementById('startDate'));
        console.log('   - startDate value:', startDate);
        console.log('   - endDate element:', document.getElementById('endDate'));
        console.log('   - endDate value:', endDate);
        console.log('   - company element:', document.getElementById('company-select'));
        console.log('   - company value:', company);
        
        // Validate dates
        if (!startDate || !endDate) {
            console.log('❌ [DEBUG] Validação falhou - datas não preenchidas');
            showErrorMessage('Por favor, preencha as datas de início e fim.');
            return false;
        }
        
        console.log(`Carregando dados por empresa: data inicial=${startDate}, data final=${endDate}, filtro empresa=${company || 'todas'}`);
        
        // Show loading indicator
        showCompanyLoading(true);
        
        // Build query URL
        let url = `/api/company-metrics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        if (company) {
            url += `&company=${encodeURIComponent(company)}`;
            console.log(`Aplicando filtro de empresa para métricas por empresa: ${company}`);
        }
        
        console.log(`Fazendo requisição para: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Include cookies for authentication
        });
        
        // Handle authentication errors
        if (response.status === 401) {
            window.location.href = '/login.html';
            return false;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch company metrics');
        }
        
        const metricsData = await response.json();
        
        console.log('🔍 [DEBUG] Response da API company-metrics:', response.url);
        console.log('🔍 [DEBUG] Dados recebidos:', metricsData);
        console.log('🔍 [DEBUG] Total de empresas retornadas:', metricsData.length);
        
        if (metricsData.length > 0) {
            metricsData.forEach((empresa, index) => {
                console.log(`🔍 [DEBUG] Empresa ${index + 1}: ${empresa.company} - R$ ${empresa.expense} - ${empresa.cliques || empresa.totalRecords} cliques`);
            });
        } else {
            console.log('🔍 [DEBUG] ❌ Nenhuma empresa retornada pela API');
        }
        
        // Check if data is valid
        if (!Array.isArray(metricsData)) {
            throw new Error('Dados recebidos em formato inválido');
        }
        
        console.log(`Dados por empresa carregados: ${metricsData.length} registros`);
        
        // Update UI with data
        populateCompanyMetricsTable(metricsData);
        
        // Update company charts
        if (typeof updateCompanyCharts === 'function') {
            updateCompanyCharts(metricsData);
        } else {
            console.warn('updateCompanyCharts function not found');
        }
        
        return true;
    } catch (error) {
        console.error('Error loading company metrics data:', error);
        showErrorMessage('Falha ao carregar dados por empresa. Verifique se você está logado e tem permissão para acessar estes dados.');
        return false;
    } finally {
        showCompanyLoading(false);
    }
}

// Populate metrics table with data
function populateMetricsTable(metricsData) {
    const tableBody = document.getElementById('tableBody');
    const noDataEl = document.getElementById('noData');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (metricsData.length === 0) {
        noDataEl.classList.remove('d-none');
        return;
    }
    
    noDataEl.classList.add('d-none');
    
    // Add data rows
    metricsData.forEach(metric => {
        const row = document.createElement('tr');
        // Se vier do meta_ads_insights, exibe as métricas novas
        if (metric.spend !== undefined && metric.impressions !== undefined && metric.clicks !== undefined && metric.cpc !== undefined && metric.ctr !== undefined) {
            row.innerHTML = `
                <td>${metric.formattedDate || metric.date || ''}</td>
                <td>${metric.spend != null ? formatCurrency(metric.spend) : '-'}</td>
                <td>${metric.impressions != null ? metric.impressions : '-'}</td>
                <td>${metric.clicks != null ? metric.clicks : '-'}</td>
                <td>${metric.cpc != null ? formatCurrency(metric.cpc) : '-'}</td>
                <td>${metric.ctr != null ? `${metric.ctr.toFixed(2)}%` : '-'}</td>
            `;
        } else {
            // Mantém o padrão antigo
            const formattedRoosterCost = formatCurrency(metric.roosterCost);
            const formattedExpense = formatCurrency(metric.expense);
            const formattedCplTarget = formatCurrency(metric.cplTarget);
            const formattedTotalCpl = formatCurrency(metric.totalCPL);
            row.innerHTML = `
                <td>${metric.formattedDate || metric.date}</td>
                <td>${metric.totalRecords}</td>
                <td>${formattedRoosterCost}</td>
                <td>${formattedExpense}</td>
                <td>${formattedCplTarget}</td>
                <td>${formattedTotalCpl}</td>
            `;
        }
        tableBody.appendChild(row);
    });
    
    // Add totals row at the bottom
    const totalsRow = document.createElement('tr');
    totalsRow.className = 'table-dark fw-bold';
    
    // Calculate totals
    const totalRecords = metricsData.reduce((sum, item) => sum + item.totalRecords, 0);
    const totalRoosterCost = metricsData.reduce((sum, item) => sum + item.roosterCost, 0);
    const totalExpense = metricsData.reduce((sum, item) => sum + item.expense, 0);
    
    // Calculate average CPL values
    const avgCplTarget = totalRecords > 0 ? totalExpense / totalRecords : 0;
    const avgTotalCpl = totalRecords > 0 ? (totalRoosterCost + totalExpense) / totalRecords : 0;
    
    // Format values
    const formattedTotalRoosterCost = formatCurrency(totalRoosterCost);
    const formattedTotalExpense = formatCurrency(totalExpense);
    const formattedAvgCplTarget = formatCurrency(avgCplTarget);
    const formattedAvgTotalCpl = formatCurrency(avgTotalCpl);
    
    // Create totals row
    totalsRow.innerHTML = `
        <td>TOTAL</td>
        <td>${totalRecords}</td>
        <td>${formattedTotalRoosterCost}</td>
        <td>${formattedTotalExpense}</td>
        <td>${formattedAvgCplTarget}</td>
        <td>${formattedAvgTotalCpl}</td>
    `;
    
    tableBody.appendChild(totalsRow);
}

// Populate company metrics table with data
function populateCompanyMetricsTable(metricsData) {
    const tableBody = document.getElementById('companyTableBody');
    const noDataEl = document.getElementById('noCompanyData');
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (metricsData.length === 0) {
        noDataEl.classList.remove('d-none');
        return;
    }
    
    noDataEl.classList.add('d-none');
    
    // Add data rows
    metricsData.forEach(metric => {
        const row = document.createElement('tr');
        
        // Format currency values for campaigns
        const formattedExpense = formatCurrency(metric.expense || 0);
        const formattedCPC = formatCurrency(metric.cpc || 0);
        const totalImpressions = (metric.impressoes || 0).toLocaleString('pt-BR');
        
        // Format CTR as percentage
        const formattedCTR = metric.ctr != null ? `${metric.ctr.toFixed(2)}%` : '-';
        
        // Create table cells for campaign metrics
        row.innerHTML = `
            <td>${metric.company}</td>
            <td>${metric.totalRecords || metric.cliques || 0}</td>
            <td>${formattedExpense}</td>
            <td>${formattedCPC}</td>
            <td>${totalImpressions}</td>
            <td>${formattedCTR}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add totals row at the bottom
    const totalsRow = document.createElement('tr');
    totalsRow.className = 'table-dark fw-bold';
    
    // Calculate totals for campaigns
    const totalRecords = metricsData.reduce((sum, item) => sum + (item.totalRecords || item.cliques || 0), 0);
    const totalExpense = metricsData.reduce((sum, item) => sum + (item.expense || 0), 0);
    const totalImpressions = metricsData.reduce((sum, item) => sum + (item.impressoes || 0), 0);
    
    // Calculate average CPC and CTR
    const avgCPC = totalRecords > 0 ? totalExpense / totalRecords : 0;
    const avgCTR = totalImpressions > 0 ? (totalRecords / totalImpressions) * 100 : 0;
    
    // Format values
    const formattedTotalExpense = formatCurrency(totalExpense);
    const formattedAvgCPC = formatCurrency(avgCPC);
    const formattedTotalImpressions = totalImpressions.toLocaleString('pt-BR');
    const formattedAvgCTR = `${avgCTR.toFixed(2)}%`;
    
    // Create totals row
    totalsRow.innerHTML = `
        <td>TOTAL GERAL</td>
        <td>${totalRecords.toLocaleString('pt-BR')}</td>
        <td>${formattedTotalExpense}</td>
        <td>${formattedAvgCPC}</td>
        <td>${formattedTotalImpressions}</td>
        <td>${formattedAvgCTR}</td>
    `;
    
    tableBody.appendChild(totalsRow);
}

// Format currency value
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Export data to Excel
async function exportToExcel() {
    try {
        // Get filter values
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const company = document.getElementById('companySelect')?.value;
        
        // Validate dates
        if (!startDate || !endDate) {
            showErrorMessage('Por favor, preencha as datas de início e fim.');
            return;
        }
        
        showLoading(true);
        
        // Build export URL
        let url = `/api/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        if (company) {
            url += `&company=${encodeURIComponent(company)}`;
        }
        
        // Check authentication first
        const checkResponse = await fetch('/api/auth/check', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!checkResponse.ok) {
            // If not authenticated, redirect to login
            window.location.href = '/login.html';
            return;
        }
        
        // Trigger download (credentials will be included automatically in this request)
        window.location.href = url;
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showErrorMessage('Falha ao exportar dados para Excel. Verifique se você está logado.');
    } finally {
        showLoading(false);
    }
}

// Export company data to Excel
async function exportCompanyDataToExcel() {
    try {
        // Get filter values
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        // Validate dates
        if (!startDate || !endDate) {
            showErrorMessage('Por favor, preencha as datas de início e fim.');
            return;
        }
        
        showCompanyLoading(true);
        
        // Build export URL
        let url = `/api/export-company?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        
        // Trigger download
        window.location.href = url;
    } catch (error) {
        console.error('Error exporting company data to Excel:', error);
        showErrorMessage('Falha ao exportar dados por empresa para Excel.');
    } finally {
        showCompanyLoading(false);
    }
}

// Show/hide loading indicator
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('d-none');
        } else {
            loadingEl.classList.add('d-none');
        }
    }
}

// Show/hide company loading indicator
function showCompanyLoading(show) {
    const loadingEl = document.getElementById('loading-company');
    if (loadingEl) {
        if (show) {
            loadingEl.classList.remove('d-none');
        } else {
            loadingEl.classList.add('d-none');
        }
    }
}

// Show error message
function showErrorMessage(message) {
    // Check if we have the toast function available from auth.js
    if (typeof showToast === 'function') {
        showToast('Erro', message, 'error');
    } else {
        // Create a toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create a unique ID for the toast
        const toastId = 'error-toast-' + Date.now();
        
        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.className = 'toast align-items-center text-white bg-danger border-0';
        toastEl.id = toastId;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Adiciona o toast ao container
        toastContainer.appendChild(toastEl);
        
        // Inicializa e exibe o toast
        const toast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 5000
        });
        toast.show();
        
        // Remove o elemento quando oculto
        toastEl.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
}

// Inicializa tooltips do Bootstrap
function inicializarTooltips() {
    // Inicializa todos os tooltips
    var listaGatilhoTooltip = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var listaTooltips = listaGatilhoTooltip.map(function (elGatilho) {
        return new bootstrap.Tooltip(elGatilho);
    });
}
