const moment = require('moment-timezone');

// Funções utilitárias para formatação e cálculos de data
// Configurando timezone padrão para Brasil
moment.tz.setDefault('America/Sao_Paulo');
class FormatadorData {
  /**
   * Formatar uma data para formato de exibição (DD/MM/AAAA)
   * @param {string|Date} data - Data para formatar
   * @return {string} Data formatada
   */
  static formatarParaExibicao(data) {
    return moment(data).format('DD/MM/YYYY');
  }

  /**
   * Formatar uma data para consultas na API (AAAA-MM-DD)
   * @param {string} data - Data no formato DD/MM/AAAA
   * @return {string} Data formatada para API
   */
  static formatarParaConsulta(data) {
    return moment(data, 'DD/MM/YYYY').format('YYYY-MM-DD');
  }
  /**
   * Converte uma data no formato DD/MM/AAAA para string ISO em UTC
   * considerando que a data de entrada está no fuso horário do Brasil (UTC-3)
   * @param {string} data - Data no formato DD/MM/AAAA 
   * @param {boolean} inicioDoDia - Se true, configura para início do dia (00:00:00), senão fim do dia (23:59:59)
   * @return {string} Data em formato ISO ajustada para UTC
   */
  static formatarParaUTC(data, inicioDoDia = true) {
    // Força o timezone para Brasil/São Paulo
    moment.tz.setDefault('America/Sao_Paulo');
    
    // Cria a data no timezone do Brasil
    const momentoBR = moment.tz(data, 'DD/MM/YYYY', 'America/Sao_Paulo');
    
    // Define como início ou fim do dia no horário brasileiro
    if (inicioDoDia) {
      momentoBR.startOf('day');
    } else {
      momentoBR.endOf('day');
    }
    
    // Converte para UTC mantendo o mesmo instante (isso adiciona 3 horas automaticamente)
    return momentoBR.utc().format();
  }
  /**
   * Converte uma data UTC do banco para o formato brasileiro
   * @param {string} dataUTC - Data em formato ISO ou UTC 
   * @return {string} Data formatada no padrão brasileiro DD/MM/YYYY
   */
  static formatFromUTC(utcDate) {
    // Força o timezone para Brasil/São Paulo
    moment.tz.setDefault('America/Sao_Paulo');
    
    // Cria objeto moment a partir da data UTC
    // E converte explicitamente para o fuso horário do Brasil
    return moment.utc(utcDate).tz('America/Sao_Paulo').format('DD/MM/YYYY');
  }

  /**
   * Get first and last day of current month
   * @return {Object} Object with startDate and endDate
   */
  static getCurrentMonthRange() {
    const now = moment();
    return {
      startDate: moment().startOf('month').format('DD/MM/YYYY'),
      endDate: now.format('DD/MM/YYYY')
    };
  }

  /**
   * Check if a date string is valid in DD/MM/YYYY format
   * @param {string} dateStr - Date string to validate
   * @return {boolean} True if valid
   */
  static isValidDate(dateStr) {
    return moment(dateStr, 'DD/MM/YYYY', true).isValid();
  }

  /**
   * Format a number as currency (R$)
   * @param {number} value - Value to format
   * @return {string} Formatted currency
   */
  static formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  /**
   * Format a number with 2 decimal places
   * @param {number} value - Value to format
   * @return {string} Formatted number
   */
  static formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}

module.exports = FormatadorData;
