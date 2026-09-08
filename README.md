# know• 

> **know** — Plataforma prática, moderna e inteligente de estudo ativo por questões com IA integrada, banco de dados local com mais de 39.000 questões e acompanhamento analítico de progresso.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%2039k%2B%20Questões-orange.svg)](https://www.sqlite.org/)
[![Port](https://img.shields.io/badge/Port-3000-blue.svg)](http://localhost:3000)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-8A2BE2.svg)](https://ai.google.dev/)
[![Status](https://img.shields.io/badge/Status-Ready%20to%20Use-brightgreen.svg)](#)

---

## 📖 Sobre o know

O **know** foi desenhado do zero para transformar a rotina de concurseiros e vestibulandos. Em vez de interfaces lentas, anúncios ou dependência constante de conexão, o **know** roda **localmente na porta 3000**, unindo a velocidade do Node.js/SQLite com o poder analítico da inteligência artificial.

Com um banco de dados já pré-carregado contendo **mais de 39.000 questões**, **24 disciplinas** e **897 assuntos**, você tem em mãos um ecossistema completo para resolução, revisão de erros e acompanhamento do seu progresso diário.

---

## ✨ Principais Destaques

- ⚡ **Rápido e Direto na Porta 3000:** Inicie com `npm start` e abra no seu navegador favorito (`http://localhost:3000`).
- 📚 **39.000+ Questões & 24 Disciplinas:** Banco local `data/prisma.db` com cobertura abrangente de Português, Matemática, Biologia, Física, Química, História, Geografia, Filosofia, Sociologia, Direito e muito mais.
- ✦ **Assistente de Estudos com IA (Gemini):**
  - **Tira-Dúvidas Global:** Acesse o botão `✦ IA` no topo para solicitar cronogramas personalizados, planos de revisão, macetes mnemônicos e métodos de estudo.
  - **Explicação Passo a Passo no Quiz:** Se errar ou tiver dúvida em uma questão, peça à IA para detalhar a lógica da questão, desmascarar pegadinhas e explicar por que cada distrator está incorreto.
- 🎯 **Ambiente de Resolução Focado:**
  - Layout centrado de leitura limpa.
  - Validação imediata com comentários pedagógicos.
  - Atalhos de teclado no quiz (`1`-`5` ou `A`-`E` para marcar, `Enter` para confirmar e seta `→` para a próxima).
  - Botão **🔍 Pesquisar no Google** com enunciado higienizado para consultar fóruns ou resoluções comentadas externas.
- 🔍 **Filtro Inteligente com Busca Tolerante a Acentos:**
  - Encontre qualquer matéria ou tópico instantaneamente digitando no campo de busca (ex: "fisica", "quimica organica", "funcao afim").
- 📊 **Métricas e Análise de Progresso:**
  - Dashboard em tempo real com total de resoluções, taxa geral de acerto e maestria percentual por disciplina.
- 🎨 **Design System Moderno:**
  - Suporte completo a **Modo Escuro** e **Modo Claro** com persistência.
  - Paleta com toques em azul celeste (`#8CD3FF`) e coral (`#FF513E`).
  - Ícones vetoriais limpos e universais (Lucide SVG).
- 🔒 **Privacidade e Dados Locais:**
  - Todas as suas resoluções e notas ficam armazenadas no seu próprio disco rígido.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18.x ou superior recomendada)
- [Git](https://git-scm.com/)

---

### Passo a Passo Rápido

#### 1. Clonar o Repositório
```bash
git clone https://github.com/gergelim/prisma-study-tool.git
cd prisma-study-tool
```

#### 2. Instalar as Dependências
```bash
npm install
```

#### 3. (Opcional) Configurar a Chave da IA (Google Gemini)
Para utilizar o Assistente com IA (`✦ IA`), você pode configurar sua chave de API de duas maneiras:
- **Pela interface web:** Clique no botão `✦ IA` no canto superior direito e selecione a engrenagem `⚙️` para inserir sua chave.
- **Ou via arquivo `.env`:** Crie um arquivo `.env` na raiz do projeto com o conteúdo:
  ```env
  GEMINI_API_KEY=sua_chave_aqui
  ```
  *(Você pode gerar uma chave gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey)).*

#### 4. Iniciar a Aplicação
```bash
npm start
```

Você verá a seguinte mensagem no terminal:
```text
  ╔══════════════════════════════════════════╗
  ║       🎯  Prisma Study Tool v1.0         ║
  ╠══════════════════════════════════════════╣
  ║  ► Acesse: http://localhost:3000         ║
  ╠══════════════════════════════════════════╣
  ║  Pressione Ctrl+C para encerrar          ║
  ╚══════════════════════════════════════════╝
```

#### 5. Acessar no Navegador
Abra seu navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧭 Guia das Seções

| Seção | O que você encontra |
|---|---|
| **🏠 Início (Dashboard)** | Visão geral do progresso, total de questões resolvidas, precisão global e atalho para a próxima questão pendente. |
| **📋 Questões** | Catálogo completo das mais de 39.000 questões. Filtre por disciplina, tópico, texto livre e status (todas, resolvidas, pendentes ou erradas). |
| **🎯 Resolver (Quiz)** | Modo focado para responder questões uma a uma, com suporte a teclado, tempo por questão e explicação imediata da IA. |
| **📊 Progresso** | Detalhamento estatístico da sua taxa de acerto e evolução por matéria. |
| **✦ IA (Assistente)** | Mentor virtual para tirar dúvidas conceituais, gerar roteiros de estudo e orientar seu método de aprendizagem. |
| **📥 Importar** | Módulo de importação contínua para sincronizar novas listas ou reparar lotes parciais. |

---

## ⌨️ Atalhos de Teclado no Quiz

Durante a resolução de questões, você pode navegar sem tirar as mãos do teclado:

- **`1`, `2`, `3`, `4`, `5`** ou **`A`, `B`, `C`, `D`, `E`**: Seleciona a alternativa correspondente.
- **`Enter`**: Confirma a resposta selecionada.
- **`Seta Direita (→)`**: Avança para a próxima questão.
- **`Esc`**: Fecha modais de zoom de imagens ou janelas ativas.

---

## ❓ Perguntas Frequentes (FAQ)

### 1. A porta 3000 já está em uso na minha máquina. Como alterar?
Basta definir a variável de ambiente `PORT` antes de iniciar:
- **Windows (PowerShell):**
  ```powershell
  $env:PORT=8080; npm start
  ```
- **Windows (CMD):**
  ```cmd
  set PORT=8080 && npm start
  ```
- **Linux / macOS:**
  ```bash
  PORT=8080 npm start
  ```

### 2. Onde ficam guardadas as 39.000 questões e meu progresso?
Tudo fica no arquivo SQLite local:
```text
data/prisma.db
```
Esse banco de dados viaja com o projeto e é atualizado automaticamente sempre que você responde ou importa questões.

### 3. Preciso de internet para usar o app?
- **Para resolver as 39.000 questões:** Não! O banco de dados e a interface funcionam 100% offline.
- **Para o assistente de IA ou buscas externas no Google:** É necessária conexão com a internet.

---

## 🛠️ Tecnologias

- **Servidor Web:** Node.js & Express.js
- **Banco de Dados:** SQLite3 gerenciado por `better-sqlite3` (alta performance e execução síncrona local)
- **Frontend:** SPA responsiva em Vanilla HTML5, CSS Custom Properties e ES Modules
- **Inteligência Artificial:** Google Gemini API
- **Ícones & UI:** Lucide Icons & Google Fonts (Inter)

---

## 📄 Licença

Distribuído sob a licença MIT. Bons estudos e excelente preparação! 🚀
