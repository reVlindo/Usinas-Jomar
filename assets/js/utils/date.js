/**
 * Utilitários de Data
 */
const DateUtils = {
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  },
  
  formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    return d.toLocaleDateString('pt-BR') + ' ' + 
           d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
  
  formatTime(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },
  
  formatApiDate(date) {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  getRelativeDay(daysAgo) {
    if (daysAgo === 0) return 'Hoje';
    if (daysAgo === 1) return 'Ontem';
    
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  },
  
  getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: this.formatApiDate(d),
        label: this.getRelativeDay(i),
        originalDate: d
      });
    }
    return days;
  }
};
