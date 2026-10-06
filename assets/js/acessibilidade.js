const ENDERECO_VLIBRAS = "https://vlibras.gov.br/app";

const ligadoDesligado = ["Desligado", "Ligado"];

const grupos = [
    {
        titulo: "Texto",
        itens: [
            { chave: "titulos", texto: "Destacar títulos", estados: ligadoDesligado },
            { chave: "links", texto: "Destacar links", estados: ligadoDesligado },
            { chave: "fonte", texto: "Fonte legível", estados: ligadoDesligado },
            { chave: "letras", texto: "Espaço entre letras", estados: ["Padrão", "Pequeno", "Médio", "Grande"] },
            { chave: "linha", texto: "Altura da linha", estados: ["Padrão", "Pequena", "Média", "Grande"] },
            { chave: "alinhar", texto: "Alinhamento", estados: ["Padrão", "Esquerda", "Centro", "Direita", "Justificado"] }
        ]
    },
    {
        titulo: "Cores",
        itens: [
            { chave: "contraste", texto: "Contraste", estados: ["Padrão", "Alto", "Escuro", "Claro", "Invertido"] },
            { chave: "saturacao", texto: "Saturação", estados: ["Padrão", "Baixa", "Alta", "Preto e branco"] }
        ]
    },
    {
        titulo: "Leitura e navegação",
        itens: [
            { chave: "guia", texto: "Guia de leitura", estados: ligadoDesligado },
            { chave: "mascara", texto: "Máscara de leitura", estados: ligadoDesligado },
            { chave: "cursor", texto: "Cursor grande", estados: ligadoDesligado },
            { chave: "foco", texto: "Destacar foco", estados: ligadoDesligado },
            { chave: "imagens", texto: "Ocultar imagens", estados: ligadoDesligado },
            { chave: "animacao", texto: "Pausar animações", estados: ligadoDesligado },
            { chave: "som", texto: "Silenciar sons", estados: ligadoDesligado },
            { chave: "voz", texto: "Ler em voz alta", estados: ["Parado", "Lendo"] }
        ]
    }
];

const filtrosContraste = ["", "contrast(1.5)", "invert(1) hue-rotate(180deg) contrast(1.1)", "brightness(1.15) contrast(1.5)", "invert(1)"];
const filtrosSaturacao = ["", "saturate(0.5)", "saturate(2)", "grayscale(1)"];

const fatores = [1, 1.1, 1.2, 1.3];
const porcentagens = ["100%", "110%", "120%", "130%"];

let configuracao = {};
let guia = null;
let mascaraCima = null;
let mascaraBaixo = null;

function todosOsItens() {
    return grupos.flatMap(function (grupo) {
        return grupo.itens;
    });
}

function zerar() {
    configuracao = { tamanho: 0 };
    todosOsItens().forEach(function (item) {
        configuracao[item.chave] = 0;
    });
}

function lerSalvo() {
    zerar();
    try {
        const salvo = JSON.parse(localStorage.getItem("acessibilidade"));
        if (salvo) {
            Object.keys(configuracao).forEach(function (chave) {
                configuracao[chave] = salvo[chave] || 0;
            });
        }
    } catch (erro) {
        zerar();
    }
    configuracao.voz = 0;
}

function gravar() {
    try {
        localStorage.setItem("acessibilidade", JSON.stringify(configuracao));
    } catch (erro) {
        return;
    }
}

function ajustarTexto() {
    document.querySelectorAll("body *").forEach(function (elemento) {
        if (elemento.closest(".acess-caixa, [vw]")) {
            return;
        }

        if (!elemento.dataset.tamanhoOriginal) {
            elemento.dataset.tamanhoOriginal = parseFloat(getComputedStyle(elemento).fontSize);
        }

        if (configuracao.tamanho === 0) {
            elemento.style.removeProperty("font-size");
        } else {
            elemento.style.fontSize = elemento.dataset.tamanhoOriginal * fatores[configuracao.tamanho] + "px";
        }
    });
}

function aplicar() {
    const raiz = document.documentElement;

    todosOsItens().forEach(function (item) {
        item.estados.forEach(function (estado, numero) {
            raiz.classList.toggle("acess-" + item.chave + "-" + numero, configuracao[item.chave] === numero && numero > 0);
        });
    });

    raiz.classList.toggle("acess-texto-maior", configuracao.tamanho > 0);
    raiz.style.filter = (filtrosContraste[configuracao.contraste] + " " + filtrosSaturacao[configuracao.saturacao]).trim();

    guia.hidden = configuracao.guia === 0;
    mascaraCima.hidden = configuracao.mascara === 0;
    mascaraBaixo.hidden = configuracao.mascara === 0;

    document.querySelectorAll("audio, video").forEach(function (midia) {
        midia.muted = configuracao.som === 1;
    });

    document.querySelectorAll(".acess-opcao").forEach(function (botao) {
        const chave = botao.dataset.chave;
        const item = todosOsItens().find(function (i) {
            return i.chave === chave;
        });
        botao.setAttribute("aria-pressed", configuracao[chave] > 0);
        botao.querySelector("small").textContent = item.estados[configuracao[chave]];
    });

    ajustarTexto();

    document.getElementById("acess-valor").textContent = porcentagens[configuracao.tamanho];
    document.getElementById("acess-menos").disabled = configuracao.tamanho === 0;
    document.getElementById("acess-mais").disabled = configuracao.tamanho === 3;
}

function textoDaPagina() {
    const selecionado = window.getSelection().toString().trim();
    if (selecionado) {
        return selecionado;
    }

    const copia = document.body.cloneNode(true);
    copia.querySelectorAll("script, style, noscript, .acess-caixa, .acess-pular, [vw], .mg-botao, .mg-convite, .mg-janela").forEach(function (elemento) {
        elemento.remove();
    });
    return copia.textContent.replace(/\s+/g, " ").trim();
}

function alternarVoz() {
    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    if (configuracao.voz === 1) {
        configuracao.voz = 0;
        aplicar();
        return;
    }

    const fala = new SpeechSynthesisUtterance(textoDaPagina());
    fala.lang = "pt-BR";
    fala.onend = function () {
        configuracao.voz = 0;
        aplicar();
    };
    window.speechSynthesis.speak(fala);
    configuracao.voz = 1;
    aplicar();
}

function montarPainel() {
    const pular = document.createElement("a");
    pular.className = "acess-pular";
    pular.href = "#conteudo-principal";
    pular.textContent = "Pular para o conteúdo";
    document.body.prepend(pular);

    const alvo = document.querySelector("main") || document.querySelector("h1");
    if (alvo) {
        alvo.id = "conteudo-principal";
        alvo.tabIndex = -1;
    }

    const blocos = grupos.map(function (grupo) {
        const botoes = grupo.itens.map(function (item) {
            return '<button class="acess-opcao" type="button" data-chave="' + item.chave + '" aria-pressed="false"><b>' + item.texto + "</b><small></small></button>";
        }).join("");
        return "<h3>" + grupo.titulo + '</h3><div class="acess-grade">' + botoes + "</div>";
    }).join("");

    const caixa = document.createElement("div");
    caixa.className = "acess-caixa";
    caixa.innerHTML =
        '<button class="acess-botao" id="acess-botao" type="button" aria-label="Abrir configurações de acessibilidade" aria-expanded="false" aria-controls="acess-painel">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5M12 15l-3.5 6M12 15l3.5 6"/></svg>' +
        "</button>" +
        '<div class="acess-painel" id="acess-painel" role="dialog" aria-label="Configurações de acessibilidade" hidden>' +
        '<div class="acess-topo"><h2>Acessibilidade</h2><button type="button" id="acess-fechar" aria-label="Fechar">×</button></div>' +
        '<div class="acess-tamanho"><span>Tamanho do texto</span>' +
        '<button type="button" id="acess-menos" aria-label="Diminuir o texto">A−</button>' +
        '<output id="acess-valor">100%</output>' +
        '<button type="button" id="acess-mais" aria-label="Aumentar o texto">A+</button></div>' +
        blocos +
        '<button class="acess-restaurar" type="button" id="acess-restaurar">Restaurar padrão</button>' +
        "</div>";
    document.body.appendChild(caixa);

    guia = document.createElement("div");
    guia.className = "acess-guia";
    mascaraCima = document.createElement("div");
    mascaraCima.className = "acess-mascara acess-mascara-cima";
    mascaraBaixo = document.createElement("div");
    mascaraBaixo.className = "acess-mascara acess-mascara-baixo";
    document.body.append(guia, mascaraCima, mascaraBaixo);
}

function ligarEventos() {
    const botao = document.getElementById("acess-botao");
    const painel = document.getElementById("acess-painel");

    function mostrar(aberto) {
        painel.hidden = !aberto;
        botao.setAttribute("aria-expanded", aberto);
    }

    botao.addEventListener("click", function () {
        mostrar(painel.hidden);
    });

    document.getElementById("acess-fechar").addEventListener("click", function () {
        mostrar(false);
        botao.focus();
    });

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape" && !painel.hidden) {
            mostrar(false);
            botao.focus();
        }
    });

    document.addEventListener("click", function (evento) {
        if (!painel.hidden && !evento.target.closest(".acess-caixa")) {
            mostrar(false);
        }
    });

    document.addEventListener("mousemove", function (evento) {
        guia.style.top = evento.clientY + "px";
        mascaraCima.style.height = Math.max(0, evento.clientY - 60) + "px";
        mascaraBaixo.style.top = evento.clientY + 60 + "px";
    });

    document.querySelectorAll(".acess-opcao").forEach(function (item) {
        item.addEventListener("click", function () {
            const chave = item.dataset.chave;

            if (chave === "voz") {
                alternarVoz();
                return;
            }

            const total = todosOsItens().find(function (i) {
                return i.chave === chave;
            }).estados.length;
            configuracao[chave] = (configuracao[chave] + 1) % total;
            gravar();
            aplicar();
        });
    });

    document.getElementById("acess-menos").addEventListener("click", function () {
        configuracao.tamanho = Math.max(0, configuracao.tamanho - 1);
        gravar();
        aplicar();
    });

    document.getElementById("acess-mais").addEventListener("click", function () {
        configuracao.tamanho = Math.min(3, configuracao.tamanho + 1);
        gravar();
        aplicar();
    });

    document.getElementById("acess-restaurar").addEventListener("click", function () {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        zerar();
        gravar();
        aplicar();
    });
}

function iniciarVlibras() {
    const caixa = document.createElement("div");
    caixa.setAttribute("vw", "");
    caixa.className = "enabled";
    caixa.innerHTML =
        '<div vw-access-button class="active"></div>' +
        '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(caixa);

    const script = document.createElement("script");
    script.src = ENDERECO_VLIBRAS + "/vlibras-plugin.js";
    script.onload = function () {
        new window.VLibras.Widget(ENDERECO_VLIBRAS);
    };
    document.body.appendChild(script);
}

lerSalvo();
montarPainel();
ligarEventos();
aplicar();
iniciarVlibras();
