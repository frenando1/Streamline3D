# 🧊 Streamline 3D — Gerenciador Inteligente de Assets

<p align="center">
  <img src="img/Gemini_Generated_Image_7z15la7z15la7z15-removebg-preview.png" alt="Streamline 3D Logo" width="180">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Blender-E87D0D?style=for-the-badge&logo=blender&logoColor=white" alt="Blender API">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

---

O **Streamline 3D** é um ecossistema moderno voltado para a centralização, organização e visualização fluida de assets tridimensionais (como modelos, texturas, HDRIs e materiais). O projeto unifica uma interface web baseada em **Three.js**, persistência na nuvem com **Supabase**, sincronização via **Rclone** e um microsserviço automatizado que traduz arquivos nativos do Blender (`.blend`) em formatos interativos prontos para a web (`.glb`).

---

## 📢 Status do Projeto

> ⚠️ **Nota Importante:** Este sistema está atualmente em fase de desenvolvimento e funciona estritamente como um **protótipo / MVP (Minimum Viable Product)**. O projeto não é sério; é apenas um **wrapper (rober)** demonstrativo projetado para provar a viabilidade da integração entre a interface web, banco de dados remoto e o pipeline de automação do Blender de forma automatizada.

---

## 🚀 Funcionalidades Principais

* **🎛️ Visualização 3D Nativa:** Renderização instantânea de arquivos `.glb` direto no browser com iluminação dinâmica, órbita suave via `OrbitControls` e enquadramento inteligente por Bounding Box.
* **📦 Pipeline de Conversão Inteligente (`.blend` ➡️ `.glb`):** Backend Node.js conectado à API Python do Blender (`bpy`) que limpa, otimiza e exporta dados geométricos em tempo de execução.
* **🏷️ Organização Avançada:** Categorização automática em categorias fundamentais: **Models**, **Textures**, **HDRIs**, **Materials**, **Brushes** e **Plugins** com suporte a coleções sob demanda.
* **🔐 Ecossistema Seguro:** Fluxo completo de autenticação corporativa (Registro, Login, Recuperação de senha) gerenciado via **Supabase Auth**.
* **☁️ Cloud Sync Integrado:** Ponte otimizada com o executável **Rclone** para espelhamento e descarregamento de assets pesados para storages remotos (como Google Drive).

---

## 📂 Arquitetura do Sistema

A árvore do projeto separa rigidamente a camada visual gerenciada pelo bundler **Vite** da lógica nativa de processamento local:

```text
Streamline3D/
├── css/
│   └── style.css              # Grid responsivo e design focado em Dark Mode
├── img/                       # Identidade visual e logos da aplicação
├── js/
│   ├── model.js               # Camada de Dados & Integração direta Supabase
│   ├── view.js                # Manipulação do DOM & Engine Gráfica Three.js
│   └── controller.js          # Orquestrador de eventos de Interface / Negócio
├── backend/
│   ├── server.js              # Servidor Express (API de uploads e subprocessos)
│   └── conversor.py           # Script autônomo Python (Blender bpy API)
├── rclone-v1.74.3/            # Binário portátil do Rclone para controle cloud (Ignorado no push)
├── index.html                 # Ponto de entrada do app (HTML5 estrutural)
├── .env                       # Variáveis de ambiente privativas (Ignorado no push)
└── package.json               # Gerenciador de scripts e dependências da stack

```

---

## 🛠️ Pré-requisitos

Antes de iniciar, certifique-se de possuir em seu ambiente local:

* **Node.js** (v18.0.0 ou superior)
* **Blender LTS** devidamente adicionado ao seu `PATH` global (para ativação via CLI)
* Uma instância configurada no **Supabase**

---

## 🔧 Configuração e Inicialização

### 1. Instalação de Dependências

Obtenha as dependências necessárias para rodar tanto o ecossistema do cliente quanto o servidor:

```bash
# Instalar dependências do Frontend (Vite)
npm install

# Instalar dependências do Pipeline de Conversão (Backend)
cd backend
npm install express multer cors
cd ..

```

### 2. Variáveis Globais

Crie um arquivo `.env` na raiz do seu projeto e preencha com as credenciais obtidas no seu painel do Supabase:

```env
VITE_SUPABASE_URL=[https://seu-subdominio.supabase.co](https://seu-subdominio.supabase.co)
VITE_SUPABASE_ANON_KEY=sua_chave_publica_anonima

```

### 3. Rodando o Ambiente

Inicie os dois ecossistemas em instâncias separadas do seu terminal:

**Painel Web (Frontend):**

```bash
npm run dev

```

🌐 *Disponível em `http://localhost:5173*`

**Microsserviço Core (Backend):**

```bash
node backend/server.js

```

⚙️ *Ouvindo requisições de conversão e pontes de dados na porta `3000*`

---

## 💻 Pipeline Técnico: Conversão Headless

O motor de conversão opera de forma assíncrona para manter a interface web fluida:

```
[Upload .blend] ➡️ [Server Express] ➡️ [Blender Headless via CLI] ➡️ [conversor.py (bpy)] ➡️ [Output .glb] ➡️ [Three.js Client Render]

```

1. O cliente despacha o arquivo `.blend` para o endpoint `/api/convert`.
2. O Node.js armazena temporariamente o arquivo e invoca um processo em plano de fundo:
```bash
blender -b -P backend/conversor.py -- <input.blend> <output.glb>

```


3. O script `conversor.py` força um reset de fábrica vazio via `bpy.ops.wm.read_factory_settings()`, injeta a cena do usuário, remapeia as texturas e executa a compilação binária do formato glTF.
4. O binário resultante é retornado via stream HTTP diretamente para a View do app, renderizando instantaneamente.

---

## 🛠️ Comandos Disponíveis

| Comando | Operação |
| --- | --- |
| `npm run dev` | Inicia o compilador em tempo real do Vite. |
| `npm run build` | Consolida e minimiza a aplicação para deploy em `/dist`. |
| `npm run preview` | Testa o build estático de produção localmente. |

---

## ⚡ Tecnologias Utilizadas

O **Streamline 3D** utiliza uma stack moderna estruturada especificamente para alto desempenho gráfico e automações nativas:

* **[Three.js](https://threejs.org/):** Visualização e controle de órbita 3D nativa no browser via WebGL.
* **Vanilla JS (MVC):** Arquitetura purista baseada em ES6 Modules dividida estritamente em Model-View-Controller.
* **[Vite](https://vitejs.dev/):** Ferramental rápido de build e gerenciamento de módulos.
* **[Node.js](https://nodejs.org/) & Express:** Servidor back-end utilitário focado em streams de dados e gerenciamento de arquivos pesados via `Multer`.
* **[Blender Python API (bpy)](https://docs.blender.org/api/current/index.html):** Execução automatizada e headless em linha de comando para tratamento e otimização geométrica de arquivos de cena de arte 3D.
* **[Supabase](https://supabase.com/):** Camada BaaS responsável pela autenticação via JWT (Supabase Auth) e banco relacional PostgreSQL.
* **[Rclone](https://rclone.org/):** Sincronizador portátil acoplado ao servidor para descarregar assets diretamente para provedores de nuvem (Google Drive, AWS S3, etc).

---

## 📄 Licença

Este ecossistema está sob as diretrizes das licenças **MIT** e **CC-BY-SA**. Sinta-se livre para customizar, expandir e integrar em sua própria pipeline de desenvolvimento de arte 3D!