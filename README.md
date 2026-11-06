# Nexus CORE

**Sistema de gerenciamento e distribuição de cirurgias autorizadas**

O Nexus CORE é uma aplicação web desenvolvida para apoiar o gerenciamento e a distribuição de cirurgias previamente autorizadas, auxiliando na organização dos procedimentos, na validação de materiais e equipamentos necessários e no acompanhamento das operações hospitalares.

O projeto foi desenvolvido como parte de uma atividade acadêmica em equipe, integrando uma interface web, uma API backend e uma camada de persistência de dados.

---

## Sobre o projeto

O sistema foi concebido para organizar o fluxo de distribuição cirúrgica a partir de registros de procedimentos já autorizados, provenientes de uma base que simula a integração com um sistema externo.

A aplicação permite consultar os procedimentos disponíveis, verificar os requisitos de materiais e equipamentos e organizar sua distribuição considerando o hospital, a data e a sala cirúrgica.

O objetivo é centralizar essas informações em um ambiente integrado, reduzindo a necessidade de controles dispersos e facilitando o acompanhamento das operações.

## Funcionalidades

- **Dashboard de cirurgias autorizadas:** visualização dos procedimentos disponíveis para distribuição.
- **Consulta por código:** localização de procedimentos por meio de seus identificadores.
- **Validação de materiais e OPME:** verificação dos materiais e itens necessários para a realização dos procedimentos.
- **Validação de equipamentos:** conferência dos equipamentos necessários antes da distribuição.
- **Distribuição cirúrgica:** organização dos procedimentos por hospital, data e sala cirúrgica.
- **Acompanhamento de confirmações:** controle do processo de confirmação dentro do prazo de 24 horas.
- **Autenticação:** gerenciamento do acesso às funcionalidades protegidas da aplicação.

## Tecnologias utilizadas

### Frontend

| Tecnologia | Utilização |
|---|---|
| React | Construção da interface |
| TypeScript | Tipagem estática |
| Vite | Ambiente de desenvolvimento e build |
| Tailwind CSS | Estilização da aplicação |
| React Router | Navegação entre páginas |
| Lucide React | Ícones da interface |

### Backend

| Tecnologia | Utilização |
|---|---|
| Node.js | Ambiente de execução |
| Express | Construção da API e gerenciamento de rotas |
| TypeScript | Tipagem e organização do código |
| Supabase | Integração com banco de dados e autenticação |
| JWT | Autenticação baseada em tokens |

### Ferramentas

- Git e GitHub
- VSCodium / VSCode
- npm

## Arquitetura geral

O projeto utiliza uma arquitetura cliente-servidor, separando a interface responsável pela interação com o usuário da camada responsável pelo processamento das operações.

```text
                 Nexus CORE
                      |
          +-----------+-----------+
          |                       |
       Frontend                 Backend
          |                       |
     React + Vite          Node.js + Express
          |                       |
          |                 Regras de negócio
          |                 Validações
          |                 Autenticação
          |                       |
          +------ HTTP/API -------+
                                  |
                              Supabase
                                  |
                              Persistência
```

O frontend envia requisições HTTP para o backend, que processa as solicitações, aplica as validações necessárias e realiza as operações correspondentes por meio da integração com o Supabase.

## Backend

O backend concentra o processamento das requisições, as regras de negócio e a comunicação com os serviços de dados.

Entre as responsabilidades implementadas estão:

- Gerenciamento das rotas da API.
- Processamento e validação das requisições.
- Integração com o Supabase.
- Implementação do fluxo de autenticação utilizando Supabase e JWT.
- Aplicação das regras de negócio relacionadas à distribuição cirúrgica.
- Validação das condições necessárias para alteração dos recursos associados aos agendamentos.

Uma das regras implementadas impede alterações nos recursos após a realização do agendamento, contribuindo para manter a consistência das informações da operação.

## Fluxo de distribuição cirúrgica

De forma geral, o processo de distribuição considera as seguintes etapas:

1. Consulta das cirurgias previamente autorizadas.
2. Identificação do procedimento por meio de seu código.
3. Verificação dos materiais, OPME e equipamentos necessários.
4. Definição do hospital, data e sala cirúrgica.
5. Registro e acompanhamento da distribuição.
6. Acompanhamento da confirmação dentro do prazo estabelecido de 24 horas.

## Estrutura do projeto

O repositório contém a aplicação frontend e o backend em uma mesma estrutura de projeto.

```text
Site-Hospitalar/
│
├── nexus-core/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
│
└── README.md
```

A estrutura acima apresenta uma visão simplificada da organização do projeto.

## Como executar o projeto

### Pré-requisitos

- Node.js
- npm
- Git
- Projeto e credenciais de acesso ao Supabase

### 1. Clonar o repositório

```bash
git clone https://github.com/LucasLimadeSousa/Site-Hospitalar.git
cd Site-Hospitalar
```

### 2. Configurar o frontend

Entre na pasta do frontend:

```bash
cd nexus-core
```

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

### 3. Configurar o backend

Em outro terminal, a partir da raiz do projeto:

```bash
cd backend
npm install
```

Configure as variáveis de ambiente conforme os nomes definidos no arquivo de configuração do backend e disponibilizados no arquivo `.env.example`, caso presente.

Inicie o servidor:

```bash
npm run dev
```

**Observação:** as credenciais do Supabase e demais informações sensíveis devem ser configuradas localmente. Nunca devem ser adicionadas ao repositório.

## Equipe e desenvolvimento

O Nexus CORE foi desenvolvido em equipe, com atividades distribuídas entre frontend e backend.

A implementação do backend envolveu o desenvolvimento da API, autenticação, integração com o Supabase e regras de negócio relacionadas ao processo de distribuição cirúrgica.

O projeto também proporcionou a aplicação prática de conceitos de desenvolvimento web, integração entre serviços, persistência de dados, versionamento e trabalho colaborativo com Git.

---

**Nexus CORE** — Sistema de gerenciamento e distribuição de cirurgias autorizadas.
