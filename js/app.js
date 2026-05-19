// ============================================
// SÃO JOÃO DE ARCOVERDE - APP OFFLINE v2
// Integrado com dados do SQLite
// ============================================





let todosOsShows = [];
let todosOsLocais = [];

// ============================================
// FUNÇÕES DE ORDENAÇÃO E UTILITÁRIOS
// ============================================

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
}

function mostrarToast(mensagem) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 20px; right: 20px;
            background: #333; color: white; text-align: center;
            padding: 12px; border-radius: 8px; z-index: 1000;
            transition: opacity 0.3s; opacity: 0; font-size: 14px;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
}

function calcularHorarioPorOrdem(ordem) {
    const horarios = {
        1: "19:00", 2: "20:30", 3: "22:00", 4: "23:30", 5: "01:00"
    };
    return horarios[ordem] || "21:00";
}

// ============================================
// CARREGAMENTO DOS DADOS
// ============================================

// Função para iniciar o banco

let db;

async function iniciarBanco(){
    const SQL = await initSqlJs({locateFile: file =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    const response = await fetch('./db/sjDbTeste.db');

    const buffer = await response.arrayBuffer();

    db = new SQL.Database(new Uint8Array(buffer));

    console.log("banco carregado");

}

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

async function carregarLocais() {

    try {
        todosOsLocais = [];
        // RESTAURANTES
        const restaurantes = db.exec(`
            SELECT *
            FROM restaurantes
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
                    nome: r.nome,
                    endereco: `${r.rua || ''}, ${r.numero || ''}`,
                    contato: r.telefone,
                    descricao: '🍽️ Restaurante'
                });
            });
        }
        // HOTÉIS

        const hoteis = db.exec(`
            SELECT *
            FROM hoteis
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
                    endereco: `${h.rua || ''}, ${h.numero || ''}`,
                    contato: h.telefone,
                    descricao: '🏨 Hotel'
                });
            });
        }

        console.log("Locais carregados!");

    } catch (erro) {
        console.error("Erro ao carregar locais:", erro);
    }
}

// ============================================
// FUNÇÕES DA PROGRAMAÇÃO
// ============================================

function preencherFiltroDias(lista) {
    const select = document.getElementById('filtro-dia');
    if (!select) return;
    
    select.innerHTML = '<option value="todos">📅 Todos os Dias</option>';
    
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
                <p class="polo-info">${show.polo}</p>
                ${show.descricao ? `<p class="descricao-show">📝 ${show.descricao}</p>` : ''}
            </div>
            
                
        `;
        container.appendChild(card);
    });
}

// ============================================
// ROTEIRO PERSONALIZADO
// ============================================

// ============================================
// "ACONTECENDO AGORA"
// ============================================

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

// ============================================
// TELA EXPLORAR
// ============================================

function renderizarLocais(categoriaDesejada) {
    const container = document.getElementById('conteudo-explorar');
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
            <h3>🏠 ${local.nome}</h3>
            <p class="local-descricao">${local.descricao || ''}</p>
            <p class="local-endereco">📍 ${local.endereco}</p>
            ${local.contato ? `<p class="local-contato">📞 ${local.contato}</p>` : ''}
        `;
        container.appendChild(card);
    });
}

function mostrarMapa() {
    const container = document.getElementById('conteudo-explorar');
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

// ============================================
// NAVEGAÇÃO ENTRE TELAS
// ============================================

function navegarPara(idTela) {

    document.querySelectorAll('.tela')
    .forEach(tela => {
        tela.classList.remove('ativa');
    });

    setTimeout(() => {
        document.getElementById(idTela)
        .classList.add('ativa');
    }, 50);


    switch(idTela) {
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

// ============================================
// SERVICE WORKER
// ============================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Service Worker falhou:', err));
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando App São João de Arcoverde v2...');
    await iniciarBanco();
    await carregarProgramacao();
    
    

    // Garantir tela inicial visível
   
    console.log('✅ App pronto!');
});

// Expor funções globalmente
window.navegarPara = navegarPara;
window.filtrarPorDia = filtrarPorDia;
window.renderizarLocais = renderizarLocais;
window.mostrarMapa = mostrarMapa;


//bomba

const dataEvento = new Date ("2026-06-13T18:00:00");

const contador = document.getElementById("contador");
const diasEv = document.getElementById("dias");
const horasEv = document.getElementById("horas");
const minutosEv = document.getElementById("minutos")
const segundosEv = document.getElementById("segundos")

function atualizarContador (){

    const agora = new Date();

    const diferenca = dataEvento - agora;

    if(diferenca<= 0){
        contador.style.display = "none";
        return;
    }

    const dias = Math.floor(diferenca / (1000 * 60 * 60 *24)
  );

    const horas = Math.floor(
        (diferenca % (1000 *60 * 60 * 24)) / (1000 * 60 * 60)

  );

   const minutos =Math.floor (
    (diferenca % (1000 * 60 *60))/ (1000 * 60)
  );

   const segundos = Math.floor (
    (diferenca % (1000 * 60)) / 1000
  );

  diasEv.textContent = String(dias).padStart(2,"0");
  horasEv.textContent = String(horas).padStart(2,"0");
  minutosEv.textContent = String(minutos).padStart(2, "0");
  segundosEv.textContent = String(segundos).padStart(2,"0");
}

atualizarContador();
setInterval(atualizarContador, 1000);