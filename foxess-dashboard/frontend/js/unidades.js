// Scripts para unidades.html

const showForm = () => {
    document.getElementById('form-unidade').style.display = 'block';
};

const hideForm = () => {
    document.getElementById('form-unidade').style.display = 'none';
    document.getElementById('cadastro-form').reset();
    document.getElementById('form-msg').innerText = '';
};

const carregarUnidades = async () => {
    const unidades = await fetchUnidades();
    const tbody = document.querySelector('#lista-unidades tbody');
    tbody.innerHTML = '';

    if (unidades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma unidade cadastrada</td></tr>';
        return;
    }

    unidades.forEach(uni => {
        tbody.innerHTML += `
            <tr>
                <td>${uni.nome}</td>
                <td>${uni.datalogger_sn}</td>
                <td>${formatNumber(uni.kwp)}</td>
                <td>${formatNumber(uni.geracao_esperada_anual)}</td>
                <td>
                    <a href="dashboard.html?id=${uni.id}&sn=${uni.datalogger_sn}" class="btn btn-primary" style="font-size: 12px; padding: 4px 8px;">Acessar</a>
                </td>
            </tr>
        `;
    });
};

const salvarUnidade = async (e) => {
    e.preventDefault();
    const payload = {
        nome: document.getElementById('u-nome').value,
        endereco: document.getElementById('u-endereco').value,
        foxess_plant_id: document.getElementById('u-plant-id').value,
        datalogger_sn: document.getElementById('u-datalogger').value,
        kwp: parseFloat(document.getElementById('u-kwp').value),
        geracao_esperada_anual: parseFloat(document.getElementById('u-kwh').value)
    };

    try {
        const res = await fetch('/api/unidades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('form-msg').innerText = "Sucesso!";
            document.getElementById('form-msg').className = "text-success mt-2";
            setTimeout(() => {
                hideForm();
                carregarUnidades();
            }, 1000);
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        document.getElementById('form-msg').innerText = "Erro: " + err.message;
        document.getElementById('form-msg').className = "text-danger mt-2";
    }
};

document.addEventListener('DOMContentLoaded', carregarUnidades);
