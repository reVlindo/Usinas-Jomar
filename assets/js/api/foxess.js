/**
 * FoxESS API Client - Atualizado para usar o Datalogger SN 769W2DTF132A592
 */
const FoxESS = {
  apiKey: null,
  baseUrl: 'https://www.foxesscloud.com',
  dataloggerSN: '769W2DTF132A592', // Padrão solicitado
  
  init(apiKey, dataloggerSN) {
    this.apiKey = apiKey;
    if (dataloggerSN) {
      this.dataloggerSN = dataloggerSN;
    }
  },
  
  _getHeaders(path) {
    if (!this.apiKey) return null;
    
    const timestamp = Date.now().toString();
    // Assinatura MD5 conforme documentação: path + \r\n + token + \r\n + timestamp
    const signature = md5(`${path}\r\n${this.apiKey}\r\n${timestamp}`);
    
    return {
      'token': this.apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'Content-Type': 'application/json',
      'lang': 'pt'
    };
  },
  
  async _request(method, path, body = null) {
    const headers = this._getHeaders(path);
    if (!headers) {
      throw new Error("API Key não configurada. Configure na aba Configurações.");
    }
    
    try {
      const options = {
        method,
        headers: headers
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(this.baseUrl + path, options);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.errno !== 0) {
        console.error('FoxESS API Error:', data);
        throw new Error(`Erro na API (${data.errno}): ${data.msg || 'Erro desconhecido'}`);
      }
      
      return data.result;
    } catch (error) {
      console.error('Request failed:', error);
      throw error; // Re-throw para ser tratado pela UI
    }
  },
  
  // Como o endpoint /op/v0/device/real/query exige o SN do Inversor e não do Datalogger,
  // Precisamos buscar a lista de dispositivos para encontrar o SN do inversor associado.
  async getDeviceList() {
    return this._request('GET', `/op/v0/device/list`);
  },
  
  async getDeviceByDatalogger() {
    // Para simplificar e evitar múltiplas chamadas excessivas, vamos tentar listar as plantas e dispositivos
    // Caso a API não tenha um endpoint direto para buscar por loggerSN, usamos a lista de dispositivos.
    const devices = await this.getDeviceList();
    if (devices && devices.data) {
      const device = devices.data.find(d => d.loggerSN === this.dataloggerSN || d.deviceSN === this.dataloggerSN);
      return device;
    }
    return null;
  },
  
  async getRealTimeData(deviceSn) {
    const variables = ['generationPower','pvPower','gridConsumptionPower','feedinPower','SoC','pvVolt','pvCurrent','batVolt','batCurrent','batTemperature','invTemperat'];
    return this._request('POST', '/op/v0/device/real/query', {
      sn: deviceSn || this.dataloggerSN, // Tenta usar o dataloggerSN se deviceSN não for fornecido, a API pode aceitar
      variables: variables
    });
  },
  
  async getHistoryReport(deviceSn, startDate, endDate) {
    const start = new Date(startDate);
    
    return this._request('POST', '/op/v0/device/report/query', {
      sn: deviceSn || this.dataloggerSN,
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate(),
      dimension: 'day',
      variables: ['generation']
    });
  }
};
