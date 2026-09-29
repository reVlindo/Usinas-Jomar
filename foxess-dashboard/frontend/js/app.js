// Scripts para index.html (Dashboard Geral)

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('#unidades-table tbody');
    if (!tableBody) return; // Not on index page

    const unidades = await fetchUnidades();
    document.getElementById('total-plantas').innerText = unidades.length;

    let totalGeração = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    tableBody.innerHTML = '';

    if (unidades.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma unidade cadastrada</td></tr>';
        return;
    }

    for (const uni of unidades) {
        const dados = await fetchUnidadeDados(uni.datalogger_sn);
        
        let status = 'Aguardando';
        let statusClass = '';
        let geracao = 0;
        let ultimaAtualizacao = '-';

        if (dados) {
            status = dados.status;
            statusClass = status === 'ONLINE' ? 'text-success' : 'text-danger';
            
            if (status === 'ONLINE') onlineCount++;
            else offlineCount++;

            // Soma a geração do dia
            if (dados.report && dados.report.length > 0) {
                const dayValue = dados.report[0].value || 0;
                geracao = dayValue;
                totalGeração += dayValue;
            }

            ultimaAtualizacao = new Date(dados.last_update).toLocaleTimeString('pt-BR');
        } else {
            offlineCount++;
        }

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => window.location.href = `dashboard.html?id=${uni.id}&sn=${uni.datalogger_sn}`;
        
        tr.innerHTML = `
            <td><strong>${uni.nome}</strong><br><small class="text-muted">SN: ${uni.datalogger_sn}</small></td>
            <td>${formatNumber(uni.kwp)}</td>
            <td>${formatNumber(geracao)} kWh</td>
            <td class="${statusClass}">${status}</td>
            <td>${ultimaAtualizacao}</td>
        `;
        tableBody.appendChild(tr);
    }

    document.getElementById('plantas-online').innerText = onlineCount;
    document.getElementById('plantas-offline').innerText = offlineCount;
    document.getElementById('geracao-total').innerText = formatNumber(totalGeração) + ' kWh';
});
