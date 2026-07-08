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

> ⚠️ **Nota de Desenvolvimento:** Este sistema encontra-se atualmente em fase de **Protótipo / MVP (Minimum Viable Product)**. Trata-se de um *wrapper* demonstrativo projetado para validar a viabilidade técnica entre a interface web, o banco de dados remoto e o pipeline automatizado de conversão do Blender.

---

## 🚀 Funcionalidades Principais

* **🎛️ Visualização 3D Nativa:** Renderização instantânea de arquivos `.glb` direto no browser com iluminação dinâmica, órbita suave via `OrbitControls` e enquadramento inteligente por Bounding Box.
* **📦 Pipeline de Conversão Inteligente (`.blend` ➡️ `.glb`):** Backend Node.js conectado à API Python do Blender (`bpy`) que limpa, otimiza e exporta dados geométricos em tempo de execução.
* **🏷️ Organização Avançada:** Categorização automática em divisões fundamentais: *Models*, *Textures*, *HDRIs*, *Materials*, *Brushes* e *Plugins* com suporte a coleções sob demanda.
* **🔐 Ecossistema Seguro:** Fluxo completo de autenticação corporativa (Registro, Login, Recuperação de senha) gerenciado via **Supabase Auth**.
* **☁️ Cloud Sync Integrado:** Ponte otimizada com o executável **Rclone** para espelhamento e descarregamento de assets pesados para storages remotos externos.

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

Antes de iniciar, certifique-se de possuir instalado em seu ambiente de desenvolvimento:

* **Node.js** (v18.0.0 ou superior)
* **Blender LTS** devidamente adicionado ao seu `PATH` global do sistema (essencial para ativação via CLI)
* Uma instância ativa e configurada no **Supabase**

---

## 🔧 Configuração e Inicialização

### 1. Instalação de Dependências

Instale os pacotes necessários para rodar tanto a aplicação do cliente (frontend) quanto o servidor de conversão (backend):

```bash
# Instalar dependências do Frontend (Vite)
npm install

# Instalar dependências do Pipeline de Conversão (Backend)
cd backend
npm install express multer cors
cd ..

```

### 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e preencha com as credenciais obtidas no painel do seu projeto Supabase:

```env
VITE_SUPABASE_URL=[https://seu-subdominio.supabase.co](https://seu-subdominio.supabase.co)
VITE_SUPABASE_ANON_KEY=sua_chave_publica_anonima

```

### 3. Executando a Aplicação

Inicie os dois ecossistemas em instâncias separadas do seu terminal:

**Painel Web (Frontend):**

```bash
npm run dev

```

🌐 *Disponível localmente em: `http://localhost:5173*`

**Microsserviço Core (Backend):**

```bash
node backend/server.js

```

⚙️ *Ouvindo requisições de conversão e pontes de dados na porta: `3000*`

---

## 💻 Pipeline Técnico: Conversão Headless

O motor de conversão opera de forma assíncrona para manter a interface web fluida e responsiva:

```text
[Upload .blend] ➡️ [Server Express] ➡️ [Blender Headless via CLI] ➡️ [conversor.py (bpy)] ➡️ [Output .glb] ➡️ [Three.js Client Render]

```

1. O cliente despacha o arquivo `.blend` para o endpoint `/api/convert`.
2. O Node.js armazena temporariamente o arquivo e invoca um subprocesso em plano de fundo:
```bash
blender -b -P backend/conversor.py -- <input.blend> <output.glb>

```


3. O script `conversor.py` força um reset de fábrica vazio via `bpy.ops.wm.read_factory_settings()`, injeta a cena do usuário, remapeia as texturas e executa a compilação binária do formato glTF.
4. O binário resultante (`.glb`) é retornado via stream HTTP diretamente para a View da aplicação, renderizando o modelo instantaneamente na tela.

---

## 🛠️ Comandos Disponíveis

| Comando | Operação |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento em tempo real do Vite. |
| `npm run build` | Consolida e minimiza a aplicação para deploy na pasta `/dist`. |
| `npm run preview` | Testa localmente o build estático gerado para produção. |

---

## ⚡ Tecnologias Utilizadas

O **Streamline 3D** utiliza uma stack moderna estruturada especificamente para alto desempenho gráfico e automações nativas:

* **[Three.js](https://threejs.org/):** Visualização e controle de órbita 3D nativa no browser via WebGL.
* **Vanilla JS (Arquitetura MVC):** Estrutura purista baseada em ES6 Modules, dividida estritamente em Model, View e Controller.
* **[Vite](https://vitejs.dev/):** Ferramental ultra-rápido de build e gerenciamento de módulos.
* **[Node.js](https://nodejs.org/) & Express:** Servidor backend focado em streams de dados e gerenciamento de arquivos pesados via `Multer`.
* **[Blender Python API (bpy)](https://docs.blender.org/api/current/index.html):** Execução automatizada e *headless* em linha de comando para tratamento e otimização geométrica de arquivos de cena 3D.
* **[Supabase](https://supabase.com/):** Camada BaaS responsável pela autenticação segura via JWT (Supabase Auth) e banco de dados relacional PostgreSQL.
* **[Rclone](https://rclone.org/):** Sincronizador portátil acoplado ao servidor para descarregar assets diretamente para provedores de nuvem (Google Drive, AWS S3, etc.).

---

## 📄 Licença

Este projeto está sob as diretrizes da licença **MIT**. Sinta-se livre para customizar, expandir e integrar em sua própria pipeline de desenvolvimento de arte 3D!
