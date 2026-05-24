// SÃO JOÃO EM ARCOVERDE - COM SQLITE
// Integrado com dados do SQLite

let todosOsShows = [];
let todosOsLocais = [];
let db;

// FUNÇÕES UTILITÁRIAS

function montarEndereco(local) {
    return [local.rua, local.bairro, local.complemento]
        .filter(Boolean)
        .join(' - ');
}

function calcularHorarioPorOrdem(ordem) {
    const horarios = {
        1: "19:00", 2: "20:30", 3: "22:00", 4: "23:30", 5: "01:00"
    };
    return horarios[ordem] || "21:00";
}

// BANCO DE DADOS SQLITE

async function iniciarBanco() {
    const SQL = await initSqlJs({
        locateFile: file =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    const response = await fetch('./db/sjDbTeste.db');
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    console.log("Banco carregado");

}

// CARREGAR PROGRAMAÇÃO

async function carregarProgramacao() {
    try {
        const resultado = db.exec(`
            select
                c.dia_semana,
                c.data,
                a.nome as atracao
            from
                atracoes a
            join
                calendario_atracoes ca on ca.id_atracao = a.id
            join
                calendario c on c.id = ca.id_dia
            order by
                c.data;
        `);

        if (!resultado.length) {
            renderizarShows([]);

            return;
        }

        const valores = resultado[0].values;

        // Mapeia os dados do banco
        todosOsShows = valores.map((linha, index) => {
            return {
                dia: `${String(linha[0]).toUpperCase()} ${linha[1]}`,
                data: linha[1],
                artista: linha[2],
                horario: calcularHorarioPorOrdem((index % 5) + 1),
                polo: "Palco Principal",
                descricao: "",
            };
        });

        console.log(todosOsShows);
        renderizarShows(todosOsShows);
        preencherFiltroDias(todosOsShows);
        console.log("✅ Programação carregada!");
    } catch (erro) {
        console.error("❌ Erro ao carregar programação:", erro);
    }
}

// CARREGAR LOCAIS (RESTAURANTES + HOTEIS)

async function carregarLocais() {

    try {
        todosOsLocais = [];
        // RESTAURANTES
        const restaurantes = db.exec(`
            select
                r.telefone as contato,
                r.nome as restaurante,
                er.bairro as bairro,
                er.rua as rua,
                er.complemento as complemento
                
            from 
                endereco_restaurante er
            JOIN
                restaurantes r on r.id = er.id_restaurante
            group by
                contato, restaurante, bairro, rua, complemento
            order by
                bairro;
        `);

        if (restaurantes.length) {
            const cols = restaurantes[0].columns;
            restaurantes[0].values.forEach(linha => {
                const r = {};
                cols.forEach((c, i) => {
                    r[c] = linha[i];
                });
                todosOsLocais.push({
                    categoria: 'comer',
                    nome: r.restaurante,
                    endereco: montarEndereco(r),
                    contato: r.contato,
                    descricao: 'Restaurante'
                });
            });
        }
        // HOTÉIS

        const hoteis = db.exec(`
            select 
                h.telefone as contato,
                h.nome as nome, 
                eh.bairro as bairro,
                eh.rua as rua,
                eh.complemento as complemento
            FROM
                endereco_hoteis eh
            JOIN
                hoteis h on h.id = eh.id_hotel
            group by contato, nome, bairro, rua, complemento
            order by bairro;
        `);

        if (hoteis.length) {
            const cols = hoteis[0].columns;
            hoteis[0].values.forEach(linha => {
                const h = {};
                cols.forEach((c, i) => {
                    h[c] = linha[i];
                });
                todosOsLocais.push({
                    categoria: 'ficar',
                    nome: h.nome,
                    endereco: montarEndereco(h),
                    contato: h.contato,
                    descricao: 'Hotel'
                });
            });
        }

        console.log("Locais carregados!");

        const pontosTuristicos = db.exec(`
                select 
                    t.nome as nome,
                    t.categoria as categoria,
                    t.descricao as descricao,
                    t.endereco as endereco
                from
                    turismo t
                order by
                    nome;
            `);

        if (pontosTuristicos.length) {
            const cols = pontosTuristicos[0].columns;
            pontosTuristicos[0].values.forEach(linha => {
                const t = {};
                cols.forEach((c, i) => {
                    t[c] = linha[i];
                });
                todosOsLocais.push({
                    categoria: 'turismo',
                    nome: t.nome,
                    endereco: t.endereco,
                    contato: '',
                    descricao: `${t.descricao || 'Ponto Turístico'}`
                });
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar locais:", erro);
    }
}

// FILTROS DA PROGRAMAÇÃO

function preencherFiltroDias(lista) {
    const select = document.getElementById('filtro-dia');
    if (!select) return;

    select.innerHTML = '<option value="todos">  Todos os Dias</option>';

    const diasUnicos = [...new Set(lista.map(show => show.dia))];
    const ordemDias = ["SÁBADO", "DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA"];

    diasUnicos.sort((a, b) => {
        const diaA = a.split(' ')[0];
        const diaB = b.split(' ')[0];
        return ordemDias.indexOf(diaA) - ordemDias.indexOf(diaB);
    });

    diasUnicos.forEach(dia => {
        const opcao = document.createElement('option');
        opcao.value = dia;
        opcao.textContent = dia;
        select.appendChild(opcao);
    });
}

function filtrarPorDia(diaEscolhido) {
    if (diaEscolhido === "todos") {
        renderizarShows(todosOsShows);
    } else {
        const showsFiltrados = todosOsShows.filter(show => show.dia === diaEscolhido);
        renderizarShows(showsFiltrados);
    }
}

// RENDERIZAR SHOWS

function renderizarShows(listaDeShows) {
    const container = document.getElementById('lista-programacao');
    if (!container) return;

    container.innerHTML = '';

    if (listaDeShows.length === 0) {
        container.innerHTML = "<p> Nenhum show encontrado para este filtro.</p>";
        return;
    }

    const listaOrdenada = listaDeShows;
    let diaAtual = '';

    listaOrdenada.forEach(show => {
        if (diaAtual !== show.dia) {
            diaAtual = show.dia;
            const headerDia = document.createElement('div');
            headerDia.className = 'header-dia';
            headerDia.innerHTML = `<h2>${show.dia}</h2>`;
            container.appendChild(headerDia);
        }


        const card = document.createElement('div');
        card.className = 'card-show';
        card.innerHTML = `
            <div class="horario-destaque"> ${show.horario}</div>
            <div class="info-show">
                <h3> ${show.artista}</h3>
                <p class="polo-info"> 
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                <path d="M12.166 8.94c-0.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-0.726-0.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 0.862-0.305 1.867-0.834 2.94M8 16c0 0 6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10" />
                <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                </svg>
                ${show.polo}</p>
                ${show.descricao ? `<p class="descricao-show">📝${show.descricao}</p>` : ''}
            </div>
            
                
        `;
        container.appendChild(card);
    });
}

// RENDERIZAR LOCAIS (EXPLORAR)

function renderizarLocais(categoriaDesejada, tela) {
    const container = document.getElementById(`conteudo-${tela}`);
    if (!container) return;

    container.innerHTML = '';

    if (todosOsLocais.length === 0) {
        container.innerHTML = "<p>📡 Carregando informações de locais...</p>";
        return;
    }

    const locaisFiltrados = todosOsLocais.filter(local => local.categoria === categoriaDesejada);

    if (locaisFiltrados.length === 0) {
        const nomesCategoria = { turismo: "pontos turísticos", comer: "restaurantes", ficar: "hospedagens" };
        container.innerHTML = `<div class="info-message">📍 Nenhum ${nomesCategoria[categoriaDesejada] || 'local'} cadastrado ainda.</div>`;
        return;
    }

    locaisFiltrados.forEach(local => {
        const card = document.createElement('div');
        card.className = 'card-local';
        card.innerHTML = `
            <h3>
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <path d="M19 2H9C7.897 2 7 2.897 7 4v6H5c-1.103 0-2 0.897-2 2v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4c0-1.103-0.897-2-2-2zM5 12h6v8H5zM19 20h-6v-8c0-1.103-0.897-2-2-2H9V4h10z" />
            <path d="M11 6h2v2h-2zM15 6h2v2h-2zM15 10.031h2V12h-2zM15 14h2v2h-2zM7 14.001h2v2H7z" />
            </svg>
             ${local.nome}</h3>
            <p class="local-descricao">${local.descricao || ''}</p>
            <p class="local-endereco">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM12 20c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
            <path d="M8 16l5.991-2L16 8l-6 2z" />
            </svg>
             ${local.endereco}</p>
            ${local.contato ? `<p class="local-contato">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <path d="M17.707 12.293a0.999 0.999 0 0 0-1.414 0l-1.594 1.594c-0.739-0.22-2.118-0.72-2.992-1.594s-1.374-2.253-1.594-2.992l1.594-1.594a0.999 0.999 0 0 0 0-1.414l-4-4a0.999 0.999 0 0 0-1.414 0L3.581 5.005c-0.38 0.38-0.594 0.902-0.586 1.435 0.023 1.424 0.4 6.37 4.298 10.268s8.844 4.274 10.269 4.298h0.028c0.528 0 1.027-0.208 1.405-0.586l2.712-2.712a0.999 0.999 0 0 0 0-1.414zM17.58 19.005c-1.248-0.021-5.518-0.356-8.873-3.712-3.366-3.366-3.692-7.651-3.712-8.874L7 4.414 9.586 7 8.293 8.293a1 1 0 0 0-0.272 0.912c0.024 0.115 0.611 2.842 2.271 4.502s4.387 2.247 4.502 2.271a0.991 0.991 0 0 0 0.912-0.271L17 14.414 19.586 17z" />
            </svg>
             ${local.contato}</p>` : ''}
        `;
        container.appendChild(card);
    });
}

// ACONTECENDO AGORA

function mostrarAcontecendoAgora() {
    const container = document.getElementById('acontecendo-agora');

    if (!container) return;

    const destaques = todosOsShows.slice(0, 3);

    container.innerHTML = '';

    destaques.forEach(show => {
        container.innerHTML += `
            <div class="card-destaque-alerta">
                <div class="alerta-conteudo">
                    <strong>${show.artista}</strong>
                    <div> ${show.horario}</div>
                    <div> ${show.polo}</div>
                </div>
            </div>
        `;
    });
}

// MAPA OFFLINE

function mostrarMapa() {
    const container = document.getElementById('conteudo-cultura');
    if (!container) return;

    container.innerHTML = `
        <div class="mapa-offline">
            <h3>🗺️ Mapa do Evento</h3>
            <p>💡 Dica: Salve a imagem no seu celular para ver com zoom!</p>
            <div class="mapa-placeholder">
                📍 MAPA DOS POLOS - SÃO JOÃO ARCOVERDE 📍
                <div style="font-size: 12px; margin-top: 10px;">
                    🎪 Palco Principal - Parque de Exposições<br>
                    🎭 Polo Cultural - Praça da Bíblia<br>
                    🎸 Palco Alternativo - Centro
                </div>
            </div>
            <p class="mapa-obs">* Mapa oficial será disponibilizado em breve</p>
        </div>
    `;
}

// NAVEGAÇÃO ENTRE TELAS

function posicionarBotaoInstalar(idTela) {
    const botaoInstalar = document.getElementById('btn-instalar-app');
    const slot = document.querySelector(`[data-install-slot="${idTela}"]`);

    if (botaoInstalar && slot && botaoInstalar.parentElement !== slot) {
        slot.appendChild(botaoInstalar);
    }
}

function navegarPara(idTela) {

    posicionarBotaoInstalar(idTela);

    document.querySelectorAll('.tela')
        .forEach(tela => {
            tela.classList.remove('ativa');
        });

    setTimeout(() => {
        document.getElementById(idTela)
            .classList.add('ativa');
    }, 50);

    switch (idTela) {
        case 'tela-inicio':
            break;
        case 'tela-programacao':
            const selectDias = document.getElementById('filtro-dia');
            if (selectDias && selectDias.value) {
                filtrarPorDia(selectDias.value);
            }
            break;
        case 'tela-explorar':
            const container = document.getElementById('conteudo-explorar');
            if (container && !container.innerHTML.trim()) {
                container.innerHTML = '<div class="info-message">🎯 Selecione uma categoria acima para explorar Arcoverde!</div>';
            }
            break;
    }
}

// CONTADOR REGRESSIVO

const dataEvento = new Date("2026-06-13T18:00:00");

const contador = document.getElementById("contador");
const diasEv = document.getElementById("dias");
const horasEv = document.getElementById("horas");
const minutosEv = document.getElementById("minutos")
const segundosEv = document.getElementById("segundos")

function atualizarContador() {

    const agora = new Date();

    const diferenca = dataEvento - agora;

    if (diferenca <= 0) {
        contador.style.display = "none";
        return;
    }

    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24)
    );

    const horas = Math.floor(
        (diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)

    );

    const minutos = Math.floor(
        (diferenca % (1000 * 60 * 60)) / (1000 * 60)
    );

    const segundos = Math.floor(
        (diferenca % (1000 * 60)) / 1000
    );

    diasEv.textContent = String(dias).padStart(2, "0");
    horasEv.textContent = String(horas).padStart(2, "0");
    minutosEv.textContent = String(minutos).padStart(2, "0");
    segundosEv.textContent = String(segundos).padStart(2, "0");
}

// inicia o contador
atualizarContador();
setInterval(atualizarContador, 1000);

// SERVICE WORKER

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Service Worker falhou:', err));
    });
}

// INICIALIZAÇÃO

// INSTALACAO DO APP

let promptInstalacao = null;

function appJaInstalado() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function navegadorIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function configurarBotaoInstalar() {
    const botaoInstalar = document.getElementById('btn-instalar-app');
    const telaAtiva = document.querySelector('.tela.ativa');

    posicionarBotaoInstalar(telaAtiva?.id || 'tela-inicio');

    if (!botaoInstalar || appJaInstalado()) {
        return;
    }

    if (navegadorIos()) {
        botaoInstalar.hidden = false;
    }

    botaoInstalar.addEventListener('click', async () => {
        if (!promptInstalacao) {
            alert('Para salvar como app, toque em Compartilhar e depois em Adicionar a Tela de Inicio.');
            return;
        }

        promptInstalacao.prompt();
        const escolha = await promptInstalacao.userChoice;

        if (escolha.outcome === 'accepted') {
            botaoInstalar.hidden = true;
        }

        promptInstalacao = null;
    });
}

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptInstalacao = event;

    const botaoInstalar = document.getElementById('btn-instalar-app');

    if (botaoInstalar && !appJaInstalado()) {
        botaoInstalar.hidden = false;
    }
});

window.addEventListener('appinstalled', () => {
    promptInstalacao = null;

    const botaoInstalar = document.getElementById('btn-instalar-app');

    if (botaoInstalar) {
        botaoInstalar.hidden = true;
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando App São João de Arcoverde v2...');
    configurarBotaoInstalar();
    await iniciarBanco();
    await carregarProgramacao();
    await carregarLocais();

    // Garantir tela inicial visível

    console.log('✅ App pronto!');
});

document.getElementsByClassName('btn-chegar')[0].addEventListener('click', () => {
    window.open('https://maps.app.goo.gl/N9r3HrVkKbQuSxwG9', '_blank', 'noopener');
});

// Expor funções globalmente
window.navegarPara = navegarPara;
window.filtrarPorDia = filtrarPorDia;
window.renderizarLocais = renderizarLocais;
window.mostrarMapa = mostrarMapa;



/* por já ter no banco de dados, vai ficar para uma próxima versão, caso queira testar a ordenação localmente, 
basta descomentar essa função e usar ela no lugar do sort atual em renderizarShows()

function ordenarShows(lista) {
    const ordemDias = {
        "SÁBADO": 1, "DOMINGO": 2, "SEGUNDA": 3, "TERÇA": 4,
        "QUARTA": 5, "QUINTA": 6, "SEXTA": 7
    };
    
    return [...lista].sort((a, b) => {
        const diaA = a.dia.split(' ')[0];
        const diaB = b.dia.split(' ')[0];
        if (diaA !== diaB) return ordemDias[diaA] - ordemDias[diaB];
        
        const horaA = parseInt(a.horario.split(':')[0]);
        const horaB = parseInt(b.horario.split(':')[0]);
        return horaA - horaB;
    });
} */
