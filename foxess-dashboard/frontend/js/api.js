const API_BASE = '/api';

const fetchUnidades = async () => {
    try {
        const res = await fetch(`${API_BASE}/unidades`);
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

const fetchUnidadeDados = async (dataloggerSn) => {
    try {
        const res = await fetch(`${API_BASE}/unidades/${dataloggerSn}/dados`);
        if (!res.ok) throw new Error('Dados não disponíveis');
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

const formatNumber = (num, decimals = 2) => {
    return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};
