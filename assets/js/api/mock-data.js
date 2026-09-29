/**
 * Dados Simulados para Desenvolvimento
 */
const MockData = {
  plants: [
    {
      id: 'mock-001',
      name: 'Patrícia Silva Caldeira Neves',
      plantId: 'FOX-PLANT-001',
      deviceSn: 'FOX-INV-001',
      installedKwp: 10.65,
      annualExpectedKwh: 13580,
      status: 1, // Online
    },
    {
      id: 'mock-002', 
      name: 'João Carlos Ferreira',
      plantId: 'FOX-PLANT-002',
      deviceSn: 'FOX-INV-002',
      installedKwp: 5.5,
      annualExpectedKwh: 7150,
      status: 2, // Alarme
    },
    {
      id: 'mock-003',
      name: 'Comércio Super Atacado Ltda',
      plantId: 'FOX-PLANT-003',
      deviceSn: 'FOX-INV-003',
      installedKwp: 33.0,
      annualExpectedKwh: 42900,
      status: 1, // Online
    }
  ],
  
  getRealTimeData(plantId) {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour <= 18;
    const factor = isDay ? Math.sin((hour - 6) * Math.PI / 12) : 0; // Curve form
    
    const maxP = plantId === 'FOX-PLANT-003' ? 25.0 : (plantId === 'FOX-PLANT-002' ? 4.0 : 8.5);
    const power = isDay ? (maxP * factor + (Math.random() * 0.5)).toFixed(2) : 0;
    
    let status = 1; // Online
    if (plantId === 'FOX-PLANT-002') status = 2; // Alarme
    
    return {
      status: status,
      generationPower: parseFloat(power),
      pvPower: parseFloat(power) * 1.05,
      feedinPower: parseFloat(power) * 0.8,
      pvVolt: isDay ? (200 + Math.random() * 50).toFixed(1) : 0,
      pvCurrent: isDay ? (power / 0.2).toFixed(1) : 0,
      invTemperat: (30 + (power * 1.5) + Math.random() * 5).toFixed(1)
    };
  },
  
  getDayReport(plantId, date) {
    const hours = [];
    const values = [];
    let total = 0;
    
    const maxP = plantId === 'FOX-PLANT-003' ? 25.0 : (plantId === 'FOX-PLANT-002' ? 4.0 : 8.5);
    
    for (let i = 0; i < 24; i++) {
      hours.push(`${String(i).padStart(2, '0')}:00`);
      
      let val = 0;
      if (i >= 6 && i <= 18) {
        const factor = Math.sin((i - 6) * Math.PI / 12);
        val = maxP * factor * (0.8 + Math.random() * 0.4);
      }
      values.push(parseFloat(val.toFixed(2)));
      total += val;
    }
    
    return {
      date: date,
      today: parseFloat((total * 0.5).toFixed(1)), // Simplified area estimation
      accumulated: parseFloat((total * 0.5 * 100).toFixed(1)),
      series: {
        labels: hours,
        data: values
      }
    };
  },
  
  getAlarms(plantId) {
    if (plantId === 'FOX-PLANT-002') {
      return [
        { code: 'A102', message: 'Grid Voltage Out of Range', severity: 'High', time: new Date(Date.now() - 3600000).toISOString() },
        { code: 'W04', message: 'High Temperature Warning', severity: 'Medium', time: new Date(Date.now() - 7200000).toISOString() }
      ];
    }
    return [];
  }
};
