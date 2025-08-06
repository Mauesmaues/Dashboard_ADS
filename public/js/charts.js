// Configurações de gráficos para BI Supabase

// Objetos de gráficos para atualizar depois
let graficoRegistros = null;
let graficoCPL = null;
let graficoRegistrosEmpresa = null;
let graficoCPLEmpresa = null;

// Gráficos principais (nome em inglês para compatibilidade)
let registersChart = null;
let cplChart = null;

// Gráficos de empresa (nome em inglês para compatibilidade)
let companyRegistersChart = null;
let companyCplChart = null;

// Elementos de totais
let elementoTotalRegistros = null;
let elementoTotalCustoPrime = null;
let elementoTotalGastos = null;
let elementoTotalCPL = null;

// Função para destruir gráficos existentes antes de criar novos
function destruirGraficosExistentes() {
    // Destruir gráficos diários se existirem
    if (graficoRegistros) {
        graficoRegistros.destroy();
        graficoRegistros = null;
    }
    
    if (graficoCPL) {
        graficoCPL.destroy();
        graficoCPL = null;
    }
}

// Função para destruir gráficos de empresas existentes
function destruirGraficosEmpresasExistentes() {
    // Destruir gráficos de empresas se existirem
    if (companyRegistersChart) {
        companyRegistersChart.destroy();
        companyRegistersChart = null;
    }
    
    if (companyCplChart) {
        companyCplChart.destroy();
        companyCplChart = null;
    }
}

// Initialize charts with empty data
function initializeCharts() {
    // Verificar e destruir gráficos existentes antes de criar novos
    destruirGraficosExistentes();
    
    // Initialize totals elements
    totalRegistersElement = document.getElementById('totalRegisters');
    totalRoosterCostElement = document.getElementById('totalRoosterCost');
    totalExpenseElement = document.getElementById('totalExpense');
    totalCPLElement = document.getElementById('totalCPL');

    // Verificar se o elemento canvas existe
    const registersCanvas = document.getElementById('registersChart');
    const cplCanvas = document.getElementById('cplChart');
    
    if (!registersCanvas || !cplCanvas) {
        console.error('Canvas elements not found for daily charts');
        return;
    }
    
    // Registers chart (bar chart)
    const registersCtx = registersCanvas.getContext('2d');
    registersChart = new Chart(registersCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total de Cliques',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Cliques por Dia'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // CPL chart (line chart)
    const cplCtx = cplCanvas.getContext('2d');
    cplChart = new Chart(cplCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPC Médio',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Gasto Total',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'CPC e Gastos por Dia'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CPC Médio (R$)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrencyShort(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Gasto Total (R$)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrencyShort(value);
                        }
                    }
                }
            }
        }
    });
}

// Initialize company charts with empty data
function initializeCompanyCharts() {
    // Verificar e destruir gráficos de empresas existentes antes de criar novos
    destruirGraficosEmpresasExistentes();
    
    // Verificar se os elementos canvas existem
    const companyRegistersCanvas = document.getElementById('companyRegistersChart');
    const companyCplCanvas = document.getElementById('companyCplChart');
    
    if (!companyRegistersCanvas || !companyCplCanvas) {
        console.error('Canvas elements not found for company charts');
        return;
    }
    
    // Company registers chart (bar chart)
    const companyRegistersCtx = companyRegistersCanvas.getContext('2d');
    companyRegistersChart = new Chart(companyRegistersCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total de Registros',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',  // Horizontal bar chart
            plugins: {                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Registros por Empresa'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });

    // Company CPL chart (bar chart)
    const companyCplCtx = document.getElementById('companyCplChart').getContext('2d');
    companyCplChart = new Chart(companyCplCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPL Meta',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'CPL Total',
                    data: [],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',  // Horizontal bar chart
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'CPL por Empresa'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrencyShort(value);
                        }
                    }
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts(metricsData) {
    if (!metricsData || metricsData.length === 0) {
        clearCharts();
        return;
    }

    // Initialize charts if they don't exist or reinitialize if needed
    try {
        if (!registersChart || !cplChart) {
            console.log('Charts need to be initialized');
            
            initializeCharts();
            
            // Verificar se a inicialização foi bem-sucedida
            if (!registersChart || !cplChart) {
                console.error('Charts failed to initialize properly');
                console.error('registersChart:', registersChart);
                console.error('cplChart:', cplChart);
                return;
            }
            
            console.log('Charts initialized successfully');
        }
    } catch (error) {
        console.error('Error checking or initializing charts:', error);
        // Tenta reinicializar os gráficos em caso de erro
        try {
            destruirGraficosExistentes();
            initializeCharts();
        } catch (reinitError) {
            console.error('Failed to reinitialize charts:', reinitError);
            return;
        }
    }

    // Sort data by date (ascending)
    metricsData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare data for charts (usando métricas de campanhas)
    const labels = metricsData.map(item => item.formattedDate || item.date);
    const clicksData = metricsData.map(item => item.totalClicks || item.totalRecords);
    const cpcData = metricsData.map(item => item.avgCPC || item.cplTarget);
    const spendData = metricsData.map(item => item.totalSpend || item.expense);

    console.log('Chart data prepared:', {
        labels,
        clicksData,
        cpcData, 
        spendData
    });

    // Update clicks chart (antigo registers chart)
    registersChart.data.labels = labels;
    registersChart.data.datasets[0].data = clicksData;
    registersChart.update();

    // Update CPC/Spend chart (antigo CPL chart)
    cplChart.data.labels = labels;
    cplChart.data.datasets[0].data = cpcData;   // CPC Médio
    cplChart.data.datasets[1].data = spendData; // Gasto Total
    cplChart.update();

    // Update totals (para campanhas)
    updateCampaignTotals(metricsData);
}

// Update company charts with new data
function updateCompanyCharts(metricsData) {
    if (!metricsData || metricsData.length === 0) {
        clearCompanyCharts();
        return;
    }

    // Initialize charts if they don't exist or reinitialize if needed
    try {
        if (!companyRegistersChart || !companyCplChart) {
            console.log('Company charts need to be initialized');
            initializeCompanyCharts();
        }
        
        // Verificar novamente se os gráficos foram criados com sucesso
        if (!companyRegistersChart || !companyCplChart) {
            console.error('Failed to initialize company charts');
            return;
        }
        
    } catch (error) {
        console.error('Error checking or initializing company charts:', error);
        // Tenta reinicializar os gráficos em caso de erro
        try {
            destruirGraficosEmpresasExistentes();
            initializeCompanyCharts();
            
            // Verificar se a reinicialização funcionou
            if (!companyRegistersChart || !companyCplChart) {
                console.error('Failed to reinitialize company charts');
                return;
            }
        } catch (reinitError) {
            console.error('Failed to reinitialize company charts:', reinitError);
            return;
        }
    }

    // Sort data by total records (descending)
    metricsData.sort((a, b) => b.totalRecords - a.totalRecords);

    // Prepare data for charts
    const labels = metricsData.map(item => item.company);
    const registersData = metricsData.map(item => item.totalRecords);
    const cplTargetData = metricsData.map(item => item.cplTarget);
    const totalCplData = metricsData.map(item => item.totalCPL);

    try {
        // Update company registers chart
        if (companyRegistersChart && companyRegistersChart.data) {
            companyRegistersChart.data.labels = labels;
            companyRegistersChart.data.datasets[0].data = registersData;
            companyRegistersChart.update();
        }

        // Update company CPL chart
        if (companyCplChart && companyCplChart.data) {
            companyCplChart.data.labels = labels;
            companyCplChart.data.datasets[0].data = cplTargetData;
            companyCplChart.data.datasets[1].data = totalCplData;
            companyCplChart.update();
        }
    } catch (updateError) {
        console.error('Error updating company charts:', updateError);
    }

    // Update company totals
    updateCompanyTotals(metricsData);
}

// Clear charts data
function clearCharts() {
    try {
        if (registersChart) {
            registersChart.data.labels = [];
            registersChart.data.datasets[0].data = [];
            registersChart.update();
        }
        
        if (cplChart) {
            cplChart.data.labels = [];
            cplChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            cplChart.update();
        }
    } catch (error) {
        console.error('Error clearing charts:', error);
        // Se houver erro ao limpar, tenta reinicializar
        try {
            destruirGraficosExistentes();
            initializeCharts();
        } catch (reinitError) {
            console.error('Failed to reinitialize charts after clear error:', reinitError);
        }
    }
    
    // Reset totals
    resetTotals();
}

// Clear company charts data
function clearCompanyCharts() {
    try {
        if (companyRegistersChart) {
            companyRegistersChart.data.labels = [];
            companyRegistersChart.data.datasets[0].data = [];
            companyRegistersChart.update();
        }
        
        if (companyCplChart) {
            companyCplChart.data.labels = [];
            companyCplChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            companyCplChart.update();
        }
    } catch (error) {
        console.error('Error clearing company charts:', error);
        // Se houver erro ao limpar, tenta reinicializar
        try {
            destroyExistingCompanyCharts();
            initializeCompanyCharts();
        } catch (reinitError) {
            console.error('Failed to reinitialize company charts after clear error:', reinitError);
        }
    }
    
    // Reset company totals
    resetCompanyTotals();
}

// Format currency for chart tooltips
function formatCurrencyShort(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Format currency value with R$ symbol
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Update totals for campaign data (N8N)
function updateCampaignTotals(metricsData) {
    console.log('updateCampaignTotals called with:', metricsData);
    
    // Obter elementos do DOM para totais de empresas
    const companyTotalRegistersElement = document.getElementById('companyTotalRegisters');
    const companyTotalExpenseElement = document.getElementById('companyTotalExpense');
    const companyTotalCPLElement = document.getElementById('companyTotalCPL');
    
    if (!metricsData || metricsData.length === 0) {
        console.log('No campaign data, resetting totals');
        
        // Atualizar totais com zeros
        if (companyTotalRegistersElement) companyTotalRegistersElement.textContent = '0';
        if (companyTotalExpenseElement) companyTotalExpenseElement.textContent = formatCurrency(0);
        if (companyTotalCPLElement) companyTotalCPLElement.textContent = formatCurrency(0);
        
        console.log('Totais de campanhas resetados para zero');
        return;
    }
    
    console.log('Processing campaign totals for', metricsData.length, 'records');
    
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let weightedCPC = 0;
    let totalWeight = 0;
    
    metricsData.forEach((metric, index) => {
        console.log(`Processing campaign metric ${index}:`, {
            totalSpend: metric.totalSpend || metric.expense,
            totalClicks: metric.totalClicks || metric.totalRecords,
            totalImpressions: metric.totalImpressions,
            avgCPC: metric.avgCPC || metric.cplTarget
        });
        
        totalSpend += metric.totalSpend || metric.expense || 0;
        totalClicks += metric.totalClicks || metric.totalRecords || 0;
        totalImpressions += metric.totalImpressions || 0;
        
        // For weighted average CPC
        const clicks = metric.totalClicks || metric.totalRecords || 0;
        if (clicks > 0) {
            const cpc = metric.avgCPC || metric.cplTarget || 0;
            weightedCPC += cpc * clicks;
            totalWeight += clicks;
        }
    });
    
    // Calculate weighted average CPC
    const avgCPC = totalWeight > 0 ? (weightedCPC / totalWeight) : 0;
    
    // Atualizar elementos do DOM
    if (companyTotalRegistersElement) {
        companyTotalRegistersElement.textContent = totalClicks.toLocaleString('pt-BR');
    }
    if (companyTotalExpenseElement) {
        companyTotalExpenseElement.textContent = formatCurrency(totalSpend);
    }
    if (companyTotalCPLElement) {
        companyTotalCPLElement.textContent = formatCurrency(avgCPC);
    }
    
    console.log('Totais de campanhas atualizados:', { 
        totalSpend: formatCurrency(totalSpend),
        totalClicks: totalClicks.toLocaleString('pt-BR'),
        totalImpressions: totalImpressions.toLocaleString('pt-BR'),
        avgCPC: formatCurrency(avgCPC)
    });
}

// Update totals for daily data
function updateTotals(metricsData) {
    console.log('updateTotals called with:', metricsData);
    console.log('metricsData length:', metricsData?.length);
    console.log('metricsData is array:', Array.isArray(metricsData));
    
    if (!metricsData || metricsData.length === 0) {
        console.log('No metrics data, resetting totals');
        resetTotals();
        return;
    }
    
    console.log('Processing totals for', metricsData.length, 'records');
    
    let totalRecords = 0;
    let totalRoosterCost = 0;
    let totalExpense = 0;
    let weightedCPL = 0;
    let totalWeight = 0;
    
    metricsData.forEach((metric, index) => {
        console.log(`Processing metric ${index}:`, {
            totalRecords: metric.totalRecords,
            roosterCost: metric.roosterCost,
            expense: metric.expense,
            totalCPL: metric.totalCPL
        });
        
        totalRecords += metric.totalRecords || 0;
        totalRoosterCost += metric.roosterCost || 0;
        totalExpense += metric.expense || 0;
        
        // For weighted average CPL
        if (metric.totalRecords > 0) {
            weightedCPL += (metric.totalCPL || 0) * metric.totalRecords;
            totalWeight += metric.totalRecords;
        }
    });
    
    // Calculate weighted average CPL
    const avgCPL = totalWeight > 0 ? (weightedCPL / totalWeight) : 0;
    
    // Update UI elements with animation if they exist
    if (totalRegistersElement) {
        animateElement(totalRegistersElement, totalRecords.toLocaleString('pt-BR'));
    }
    
    if (totalRoosterCostElement) {
        animateElement(totalRoosterCostElement, formatCurrency(totalRoosterCost));
    }
    
    if (totalExpenseElement) {
        animateElement(totalExpenseElement, formatCurrency(totalExpense));
    }
    
    if (totalCPLElement) {
        animateElement(totalCPLElement, formatCurrency(avgCPL));
    }
    
    console.log('Totais atualizados:', { 
        totalRecords, 
        totalRoosterCost: formatCurrency(totalRoosterCost),
        totalExpense: formatCurrency(totalExpense),
        avgCPL: formatCurrency(avgCPL)
    });
}

// Update totals for company data
function updateCompanyTotals(metricsData) {
    if (!metricsData || metricsData.length === 0) {
        resetCompanyTotals();
        return;
    }
    
    let totalRecords = 0;
    let totalRoosterCost = 0;
    let totalExpense = 0;
    let weightedCPL = 0;
    let totalWeight = 0;
    
    metricsData.forEach(metric => {
        totalRecords += metric.totalRecords || 0;
        totalRoosterCost += metric.roosterCost || 0;
        totalExpense += metric.expense || 0;
        
        // For weighted average CPL
        if (metric.totalRecords > 0) {
            weightedCPL += (metric.totalCPL || 0) * metric.totalRecords;
            totalWeight += metric.totalRecords;
        }
    });
    
    // Calculate weighted average CPL
    const avgCPL = totalWeight > 0 ? (weightedCPL / totalWeight) : 0;
    
    // Update UI elements with animation if they exist
    const companyTotalRegistersElement = document.getElementById('companyTotalRegisters');
    const companyTotalRoosterCostElement = document.getElementById('companyTotalRoosterCost');
    const companyTotalExpenseElement = document.getElementById('companyTotalExpense');
    const companyTotalCPLElement = document.getElementById('companyTotalCPL');
    
    if (companyTotalRegistersElement) {
        animateElement(companyTotalRegistersElement, totalRecords.toLocaleString('pt-BR'));
    }
    
    if (companyTotalRoosterCostElement) {
        animateElement(companyTotalRoosterCostElement, formatCurrency(totalRoosterCost));
    }
    
    if (companyTotalExpenseElement) {
        animateElement(companyTotalExpenseElement, formatCurrency(totalExpense));
    }
    
    if (companyTotalCPLElement) {
        animateElement(companyTotalCPLElement, formatCurrency(avgCPL));
    }
    
    console.log('Totais de empresas atualizados:', { 
        totalRecords, 
        totalRoosterCost: formatCurrency(totalRoosterCost),
        totalExpense: formatCurrency(totalExpense),
        avgCPL: formatCurrency(avgCPL)
    });
}

// Adicionar animação quando os totalizadores são atualizados
function animateElement(element, newValue) {
    // Adicionar classe para animação
    element.classList.add('value-updated');
    
    // Atualizar o valor
    element.textContent = newValue;
    
    // Remover a classe após a animação
    setTimeout(() => {
        element.classList.remove('value-updated');
    }, 500);
}

// Reset totals when no data is available
function resetTotals() {
    if (totalRegistersElement) totalRegistersElement.textContent = '0';
    if (totalRoosterCostElement) totalRoosterCostElement.textContent = formatCurrency(0);
    if (totalExpenseElement) totalExpenseElement.textContent = formatCurrency(0);
    if (totalCPLElement) totalCPLElement.textContent = formatCurrency(0);
}

// Reset company totals when no data is available
function resetCompanyTotals() {
    const companyTotalRegistersElement = document.getElementById('companyTotalRegisters');
    const companyTotalRoosterCostElement = document.getElementById('companyTotalRoosterCost');
    const companyTotalExpenseElement = document.getElementById('companyTotalExpense');
    const companyTotalCPLElement = document.getElementById('companyTotalCPL');
    
    if (companyTotalRegistersElement) companyTotalRegistersElement.textContent = '0';
    if (companyTotalRoosterCostElement) companyTotalRoosterCostElement.textContent = formatCurrency(0);
    if (companyTotalExpenseElement) companyTotalExpenseElement.textContent = formatCurrency(0);
    if (companyTotalCPLElement) companyTotalCPLElement.textContent = formatCurrency(0);
}

// Execute after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {    // Inicializa os gráficos (apenas uma vez no carregamento da página)
    try {
        initializeCharts();
        initializeCompanyCharts();
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
    
      // Update charts when window resizes
    window.addEventListener('resize', () => {
        if (registersChart && typeof registersChart.resize === 'function') registersChart.resize();
        if (cplChart && typeof cplChart.resize === 'function') cplChart.resize();
        if (companyRegistersChart && typeof companyRegistersChart.resize === 'function') companyRegistersChart.resize();
        if (companyCplChart && typeof companyCplChart.resize === 'function') companyCplChart.resize();
    });
});

// Adicionar event listeners para os botões de atualização
function setupChartButtonListeners() {
    const refreshButtons = document.querySelectorAll('.chart-refresh');
    
    refreshButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Determinar qual visualização está ativa
            const isCompanyViewActive = document.getElementById('company-tab').classList.contains('active');
            
            try {
                if (isCompanyViewActive) {
                    // Recarregar dados para visualização de empresa
                    await window.loadCompanyMetricsData();
                } else {
                    // Recarregar dados para visualização diária
                    await window.loadMetricsData();
                }
                
                // Mostrar notificação de sucesso
                const message = 'Dados atualizados com sucesso!';
                showToast(message, 'success');
            } catch (error) {
                console.error('Error refreshing charts:', error);
                showToast('Erro ao atualizar os gráficos', 'error');
            }
        });
    });
}

// Função para exibir toast de notificação
function showToast(message, type = 'info') {
    // Criar container de toast se não existir
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Definir classes baseadas no tipo
    let bgClass = 'bg-info';
    if (type === 'success') bgClass = 'bg-success';
    if (type === 'error') bgClass = 'bg-danger';
    
    // Criar elemento toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} text-white border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Adicionar toast ao container
    toastContainer.innerHTML += toastHtml;
    
    // Inicializar e mostrar toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        delay: 3000
    });
    toast.show();
    
    // Remover toast após fechado
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

// Inicializar listeners dos botões
document.addEventListener('DOMContentLoaded', () => {
    setupChartButtonListeners();
});
