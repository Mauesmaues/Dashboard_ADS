// Script para remover totalizadores em bloquinhos do topo

// Função para executar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando remoção dos totalizadores em bloquinhos...');
    
    // Função que será executada após o carregamento da página e após cada atualização de dados
    function removerTotalizadoresTopo() {
        console.log('Procurando e removendo totalizadores em bloquinhos...');
        
        // Seletores comuns para cards ou containers que possam conter totalizadores
        const seletoresPossiveis = [
            '.summary-card', 
            '.metric-card', 
            '.totalizador', 
            '.card-metric', 
            '.metric-summary',
            '.metrics-cards',
            '.cards-container',
            '.stats-container',
            '.metric-container',
            '.summary-container',
            '.summary-row',
            '.total-summary'
        ];
        
        // Procurar por elementos que possam conter os totalizadores
        seletoresPossiveis.forEach(seletor => {
            const elementos = document.querySelectorAll(seletor);
            if (elementos && elementos.length > 0) {
                console.log(`Encontrados ${elementos.length} elementos com seletor ${seletor}`);
                elementos.forEach(elemento => {
                    console.log(`Removendo elemento:`, elemento);
                    elemento.style.display = 'none';
                });
            }
        });
        
        // Procurar por divs antes das tabelas que possam conter totalizadores
        const tabelas = document.querySelectorAll('table.table');
        tabelas.forEach(tabela => {
            // Verificar elementos irmãos anteriores à tabela
            let elemento = tabela.previousElementSibling;
            while (elemento) {
                if (elemento.classList.contains('row') || 
                    elemento.classList.contains('card') || 
                    elemento.classList.contains('summary') ||
                    elemento.classList.contains('metrics') ||
                    elemento.classList.contains('totalizador') ||
                    elemento.classList.contains('stats')) {
                    console.log('Removendo elemento antes da tabela:', elemento);
                    elemento.style.display = 'none';
                }
                elemento = elemento.previousElementSibling;
            }
            
            // Verificar se o pai da tabela tem outros filhos antes da tabela que podem ser totalizadores
            const pai = tabela.parentElement;
            if (pai) {
                Array.from(pai.children).forEach(filho => {
                    if (filho !== tabela && 
                        (filho.classList.contains('row') || 
                         filho.classList.contains('metrics-summary') ||
                         filho.classList.contains('card') ||
                         filho.classList.contains('summary') ||
                         filho.classList.contains('totalizador') ||
                         filho.classList.contains('stats'))) {
                        console.log('Removendo elemento filho do pai da tabela:', filho);
                        filho.style.display = 'none';
                    }
                });
            }
        });
        
        // Procurar por qualquer div que contenha "total", "summary" ou "metric" no ID
        const regexID = /total|summary|metric|stat|totalizador/i;
        document.querySelectorAll('div').forEach(div => {
            if (div.id && regexID.test(div.id)) {
                // Verificar se não é uma parte essencial da interface
                if (!div.id.includes('tableBody') && 
                    !div.id.includes('companyTableBody') &&
                    !div.classList.contains('table-responsive')) {
                    console.log('Removendo div com ID relacionado a totalizadores:', div.id);
                    div.style.display = 'none';
                }
            }
            
            // Verificar também elementos antes das tabelas geradas dinamicamente
            if (div.classList.contains('table-responsive')) {
                let prevElement = div.previousElementSibling;
                while (prevElement) {
                    if (prevElement.tagName !== 'DIV' || 
                        !prevElement.classList.contains('spinner-border')) {
                        console.log('Removendo elemento antes da tabela responsiva:', prevElement);
                        prevElement.style.display = 'none';
                    }
                    prevElement = prevElement.previousElementSibling;
                }
            }
        });
        
        console.log('Finalizada remoção dos totalizadores em bloquinhos');
    }
    
    // Executar uma vez logo após o carregamento
    setTimeout(removerTotalizadoresTopo, 500);
    
    // Monitorar botões que possam atualizar os dados e, consequentemente, recriar os totalizadores
    const botoesAtualizar = [
        document.getElementById('applyFilters'),
        document.getElementById('daily-tab'),
        document.getElementById('company-tab'),
        document.getElementById('exportDailyBtn'),
        document.getElementById('exportCompanyBtn')
    ];
    
    botoesAtualizar.forEach(botao => {
        if (botao) {
            botao.addEventListener('click', function() {
                // Aguardar um pouco para que os dados sejam carregados
                setTimeout(removerTotalizadoresTopo, 500);
            });
        }
    });
    
    // Executar periodicamente para garantir que os totalizadores não reapareçam
    setInterval(removerTotalizadoresTopo, 2000);
});
