/**
 * Utilitários de Energia e Cálculos
 */
const EnergyUtils = {
  // Geração esperada (kWh)
  calculateDailyExpected(annualKwh) {
    if (!annualKwh) return 0;
    // Cálculo simples por enquanto. 
    // Futuro: Adicionar fatores sazonais por mês.
    return annualKwh / 365;
  },
  
  calculatePerformance(actual, expected) {
    if (!expected || expected === 0) return 0;
    return (actual / expected) * 100;
  },
  
  getPerformanceStatus(percent) {
    if (percent >= 95) {
      return { label: 'Dentro do Esperado', class: 'text-success', icon: '✅' };
    } else if (percent >= 75) {
      return { label: 'Levemente Abaixo', class: 'text-warning', icon: '⚠️' };
    } else {
      return { label: 'Abaixo do Esperado', class: 'text-danger', icon: '❌' };
    }
  },
  
  formatKw(value) {
    if (value === null || value === undefined) return '0.00 kW';
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kW';
  },
  
  formatKwh(value) {
    if (value === null || value === undefined) return '0.0 kWh';
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh';
  },
  
  formatMwh(value) {
    if (value === null || value === undefined) return '0.00 MWh';
    if (value < 1000) {
      return this.formatKwh(value);
    }
    return (value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MWh';
  }
};
