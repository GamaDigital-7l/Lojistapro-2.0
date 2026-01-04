# Lojista Pro 2.0 - Implantação com Docker

Este guia contém as instruções para executar a aplicação Lojista Pro 2.0 utilizando Docker e Docker Compose, ideal para implantação em servidores como o ZimaOS.

## Pré-requisitos

- Docker instalado no seu sistema.
- Docker Compose instalado no seu sistema.

Na maioria das distribuições Linux (incluindo o CasaOS, que roda no Zima), você pode instalar ambos com os gerenciadores de pacote padrão.

## Estrutura dos Arquivos Docker

- **`Dockerfile`**: Define a receita para criar a imagem da nossa aplicação. Ele usa o Nginx para servir os arquivos.
- **`nginx.conf`**: Arquivo de configuração para o Nginx, otimizado para aplicações de página única (SPA) como esta.
- **`docker-compose.yml`**: Orquestrador que simplifica o processo de build e execução do nosso container.
- **`.env.example`**: Arquivo de exemplo para variáveis de ambiente. **Nota:** Atualmente, as chaves do Supabase estão definidas diretamente no código. Para uma segurança aprimorada no futuro, o ideal seria refatorar o código para ler estas chaves do ambiente.

## Como Executar a Aplicação

Siga os passos abaixo no terminal do seu ZimaOS (ou qualquer outra máquina com Docker).

### 1. Navegue até a Pasta do Projeto

Certifique-se de que você está no diretório raiz do projeto, onde o arquivo `docker-compose.yml` está localizado.

```bash
cd /caminho/para/seu/projeto
```

### 2. Construa e Inicie o Container

Execute o seguinte comando. Ele irá construir a imagem Docker (se ainda não existir) e iniciar o container em segundo plano (`-d` significa "detached mode").

```bash
docker-compose up -d
```

O primeiro build pode levar alguns minutos, dependendo da sua conexão com a internet. Builds subsequentes serão muito mais rápidos.

### 3. Verifique o Status do Container

Você pode verificar se o container está rodando corretamente com o comando:

```bash
docker-compose ps
```

Você deverá ver um serviço chamado `lojista-pro-app` com o status `Up`.

### 4. Acesse a Aplicação

A aplicação agora está rodando e acessível no seu navegador. Abra o seguinte endereço:

`http://<IP_DO_SEU_ZIMAOS>:8080`

Substitua `<IP_DO_SEU_ZIMAOS>` pelo endereço IP local do seu servidor.

## Comandos Úteis do Docker Compose

- **Parar a aplicação:**
  ```bash
  docker-compose down
  ```

- **Ver os logs do container em tempo real:**
  ```bash
  docker-compose logs -f
  ```

- **Forçar a reconstrução da imagem (após fazer alterações no código):**
  ```bash
  docker-compose up -d --build
  ```

---
Seguindo estes passos, sua aplicação estará rodando de forma isolada, segura e eficiente dentro de um container Docker.
