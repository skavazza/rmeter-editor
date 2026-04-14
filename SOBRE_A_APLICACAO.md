# Rainmeter Editor - Documentação Detalhada

## 📋 Visão Geral

**Rainmeter Editor** é uma aplicação desktop moderna e de código aberto que fornece uma interface gráfica visual para criação e edição de *skins* do Rainmeter. A aplicação elimina a necessidade de editar manualmente arquivos INI, permitindo que os usuários projetem skins do Rainmeter de forma intuitiva e visual.

**Plataforma:** Windows exclusivamente (Rainmeter é compatível apenas com Windows)

**Versão Atual:** 0.7.0

---

## 🎯 Propósito Principal

A aplicação resolve um problema central: criar skins Rainmeter visualmente sem necessidade de conhecimento técnico sobre sintaxe INI. Oferece um ambiente de design visual similar a ferramentas de design web, mas específico para Rainmeter.

---

## ✨ Funcionalidades Principais

### 1. **Editor Visual Drag-and-Drop**
- Interface intuitiva para criar e arranjar camadas (layers)
- Tipos de elementos suportados:
  - **Texto** - elementos de texto com fontes locais
  - **Imagens** - inserção de imagens PNG, JPG, etc.
  - **Barras** - elementos visuais de progresso/monitoramento
  - **Rotadores** - elementos rotativos para visualização dinâmica
  - **Skins** - configuração geral da skin

### 2. **Gerenciamento de Camadas**
- Painel lateral (sidebar) com lista de camadas
- Reordenação via drag-and-drop
- Seleção, edição e exclusão de elementos
- Sistema hierárquico de camadas

### 3. **Edição de Propriedades**
- Painel de propriedades específicas para cada tipo de elemento
- Configuração em tempo real dos atributos:
  - **TextProperties** - fonte, tamanho, cor, alinhamento
  - **ImageProperties** - dimensões, posição, opacidade
  - **BarProperties** - comprimento, altura, valores
  - **RotatorProperties** - rotação, velocidade, direção
  - **SkinProperties** - configurações globais da skin

### 4. **Gerenciamento de Fontes e Imagens**
- Suporte a fontes locais do sistema
- Integração com OpenType.js para processamento de fontes
- Precarregamento de fontes para melhor desempenho
- Detecção automática de nomes de fontes
- Bundling de assets com a skin exportada

### 5. **Exportação para Rainmeter**
- Gera arquivos INI compatíveis com Rainmeter
- Cria estrutura correta de pastas
- Inclui todos os assets (imagens, fontes) na pasta da skin
- Pronto para uso direto no Rainmeter

### 6. **Integração Nativa Windows**
- Diálogos de arquivo nativos do Windows
- Auto-atualização automática via GitHub Releases
- Interface nativa usando Tauri
- Desempenho otimizado com backend Rust

---

## 🏗️ Arquitetura Técnica

### **Stack Tecnológico**

#### Frontend
- **React 18.2** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Bundler moderno
- **TailwindCSS** - Estilização
- **Radix UI** - Componentes acessíveis

#### Canvas e Rendering
- **Fabric.js 6.5.3** - Manipulação de canvas e desenho
- **OpenType.js 1.3.4** - Processamento de fontes
- **Fontname 1.0.1** - Detecção de nomes de fontes

#### Drag-and-Drop
- **@dnd-kit** - Sistema moderno de drag-and-drop
  - `@dnd-kit/core` - Core do sistema
  - `@dnd-kit/sortable` - Ordenação de camadas
  - `@dnd-kit/modifiers` - Modificadores de comportamento

#### Backend
- **Tauri 2.x** - Framework desktop Rust/Electron alternativo
- **Rust** - Backend de alto desempenho

#### Plugins Tauri
- `@tauri-apps/plugin-dialog` - Diálogos de arquivo
- `@tauri-apps/plugin-fs` - Operações de sistema de arquivos
- `@tauri-apps/plugin-shell` - Execução de comandos shell
- `@tauri-apps/plugin-process` - Gerenciamento de processos
- `@tauri-apps/plugin-updater` - Auto-atualização

#### UI/UX
- **Lucide React** - Ícones modernos
- **React Icons** - Ícones adicionais
- **React Toaster** - Notificações toast
- **Class Variance Authority** - Sistema de variantes CSS

---

## 📁 Estrutura de Pastas

### Frontend (src/)
```
src/
├── App.tsx                          # Componente raiz
├── App.css                          # Estilos globais
├── main.tsx                         # Ponto de entrada
├── index.css                        # Estilos base
├── vite-env.d.ts                    # Tipos Vite
├── components/                      # Componentes React
│   ├── Layout.tsx                   # Layout principal
│   ├── Toolbar.tsx                  # Barra de ferramentas
│   ├── Topbar.tsx                   # Barra superior
│   ├── CanvasRenderer.tsx           # Renderização do canvas
│   ├── LayersSidebar.tsx            # Painel de camadas
│   ├── PropertiesSidebar.tsx        # Painel de propriedades
│   ├── ExportModal.tsx              # Modal de exportação
│   ├── DownloadProgress.tsx         # Progresso de download
│   ├── ScaleControl.tsx             # Controle de zoom
│   ├── FontSelector.tsx             # Seletor de fontes
│   ├── mode-toggle.tsx              # Toggle de tema
│   ├── app-sidebar.tsx              # Sidebar da app
│   ├── Layout.tsx                   # Componente de layout
│   ├── customUI/                    # Componentes UI customizados
│   │   └── PropertyInput.tsx
│   ├── PropertiesSidebar/           # Subcomponentes de propriedades
│   │   ├── TextProperties.tsx
│   │   ├── ImageProperties.tsx
│   │   ├── BarProperties.tsx
│   │   ├── RotatorProperties.tsx
│   │   └── SkinProperties.tsx
│   └── ui/                          # Componentes Radix UI
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── select.tsx
│       ├── slider.tsx
│       └── ...
├── context/                         # Context API React
│   ├── CanvasContext.tsx            # Estado do canvas
│   ├── LayerContext.tsx             # Estado das camadas
│   └── ToolContext.tsx              # Estado das ferramentas
├── hooks/                           # Custom hooks
│   ├── use-mobile.tsx               # Detecção de dispositivo
│   └── use-toast.ts                 # Hook de notificações
├── services/                        # Lógica de negócio
│   ├── CanvasManager.ts             # Gerenciamento do canvas
│   ├── LayerManager.ts              # Gerenciamento de camadas
│   ├── ExportToINI.ts               # Exportação para INI
│   ├── FontPreload.ts               # Precarregamento de fontes
│   ├── LocalFontManager.ts          # Gerenciamento de fontes locais
│   ├── CheckForAppUpdates.ts        # Verificação de atualizações
│   ├── getFontName.ts               # Obtenção de nome de fonte
│   └── singleFontLoad.ts            # Carregamento único de fonte
├── lib/                             # Utilitários
│   └── utils.ts                     # Funções auxiliares
├── test/                            # Código de teste
└── assets/
    └── fonts/                       # Fontes locais
```

### Backend (src-tauri/)
```
src-tauri/
├── Cargo.toml                       # Dependências Rust
├── tauri.conf.json                  # Configuração Tauri
├── build.rs                         # Script de build
├── src/
│   ├── lib.rs                       # Biblioteca Rust
│   └── main.rs                      # Ponto de entrada
├── capabilities/                    # Configuração de permissões
│   ├── default.json
│   └── desktop.json
└── icons/                           # Ícones da aplicação
```

---

## 🔄 Fluxo de Funcionamento

### 1. **Inicialização**
- React carrega o App.tsx
- ThemeProvider configura tema (claro/escuro)
- LayerProvider fornece estado global de camadas
- Layout.tsx renderiza a interface principal

### 2. **Adição de Elementos**
- Usuário clica em ícone na Toolbar (Text, Image, Bar, Rotator)
- Elemento é criado e adicionado ao canvas via CanvasManager
- Nova camada é adicionada ao LayerContext
- Interface atualiza com novo elemento

### 3. **Interação com Canvas**
- Fabric.js gerencia interações do canvas
- Drag-and-drop é tratado pelo @dnd-kit
- Propriedades são atualizadas em tempo real via PropertiesSidebar
- Visual no canvas é atualizado imediatamente

### 4. **Exportação**
- Usuário clica em "Exportar"
- ExportModal coleta parâmetros de exportação
- ExportToINI gera arquivo INI no formato Rainmeter
- Assets (fontes, imagens) são copiados para pasta da skin
- Arquivo .rmskin é gerado (se aplicável)

### 5. **Atualização**
- CheckForAppUpdates verifica GitHub Releases
- Se nova versão disponível, notifica usuário
- Tauri plugin-updater realiza download e instalação

---

## 🎨 Componentes Principais

### **Layout**
Estrutura principal com 3 painéis:
- **Esquerdo (sidebar-left):** Toolbar e tools
- **Centro:** Canvas editor com Fabric.js
- **Direito (sidebar-right):** Camadas e Propriedades

### **CanvasRenderer**
- Implementação de Fabric.js
- Renderização de todos os elementos
- Manipulação interativa de objetos

### **LayersSidebar**
- Lista de camadas com drag-and-drop
- Seleção e edição de camadas
- Visibilidade e lock de camadas

### **PropertiesSidebar**
- Painéis dinâmicos baseados no tipo de elemento
- Edição de propriedades em tempo real
- Validação de inputs

---

## 📊 Estado da Aplicação

### **LayerContext**
Gerencia:
- Lista de all camadas
- Camada selecionada atualmente
- Operações CRUD de camadas
- Ordem/hierarquia das camadas

### **CanvasContext**
Gerencia:
- Instância do Fabric canvas
- Zoom/escala
- Posição e transformações
- Renderização

### **ToolContext**
Gerencia:
- Ferramenta selecionada atualmente
- Modos de interação
- Configurações de ferramentas

---

## 🚀 Fluxo de Desenvolvimento

### Build
```
npm run build
# Compila TypeScript e Vite, bundifica frontend
```

### Desenvolvimento
```
npm run tauri dev
# Inicia Vite dev server e Tauri em modo desenvolvimento
# Hot reload activado
```

### Distribuição
- Gera executável Windows (.exe) via Tauri
- Instalador auto-updatable
- Distribuição via GitHub Releases

---

## 🎯 Casos de Uso

1. **Designers visuais** - Criar skins sem conhecer INI
2. **Monitores de sistema** - Skins de monitoramento visual
3. **Customização de desktop** - Widgets e painéis personalizados
4. **Começantes em Rainmeter** - Entrada visual sem curva de aprendizado
5. **Prototipagem rápida** - Testar ideias visualmente antes de INI manual

---

## 📦 Dependências Críticas

| Biblioteca | Versão | Propósito |
|-----------|--------|----------|
| React | 18.2.0 | Framework UI |
| Fabric.js | 6.5.3 | Canvas manipulation |
| Tauri | 2.x | Desktop framework |
| Vite | Latest | Bundler frontend |
| TypeScript | Latest | Tipagem estática |
| TailwindCSS | Latest | Estilização |
| Radix UI | 1.x | Componentes acessíveis |
| OpenType.js | 1.3.4 | Processamento de fontes |

---

## 🔒 Segurança e Atualizações

- Auto-verificação de atualizações via GitHub
- Instalador nativo Windows com SmartScreen handling
- Backend Rust para operações sensíveis do SO
- Permissões granulares via Tauri capabilities

---

## 🌐 Comunidade

- **Discord** - Suporte e discussão
- **Reddit** - Compartilhamento de skins
- **GitHub Issues** - Bugs e feature requests
- **Código aberto** - Contribuições bem-vindas

---

## 📝 Licença

MIT License - Código aberto e livre para uso e modificação

---

**Última atualização:** Março 2026
**Versão documentada:** 0.7.0
