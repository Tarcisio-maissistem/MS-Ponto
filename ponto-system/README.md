# MS Ponto V1.0

Aplicativo web (React + Vite) para importar/exportar dados, gerenciar funcionarios e gerar relatorios/PDF.

## Contato

- Empresa: Mais Sistem Solucoes Empresariais
- Desenvolvedor: Tarcisio Rodrigues
- Telefone/WhatsApp: +55 (62) 3284-5750
- Site: https://maissistem.com.br
- Email: contato@maissistem.com.br

## Requisitos

- Windows 10/11
- Node.js 18+ (recomendado 20+)

## Rodar em desenvolvimento

```bash
cd ponto-system
npm install
npm run dev
```

Abra o endereco informado pelo Vite (normalmente `http://localhost:5173`).

## Build de producao

```bash
cd ponto-system
npm install
npm run build
```

Os arquivos finais ficam em `ponto-system/dist/`.

## Instalar/entregar para um cliente (Windows)

Este app precisa ser servido por um servidor web (nao funciona abrindo o `index.html` direto em muitos ambientes, por conta de modulos/paths).

Opcoes simples:

1) Rodar localmente via Node (mais simples)

- No PC do cliente, instale o Node.js.
- Copie a pasta `ponto-system/` (ou apenas `ponto-system/dist/`).
- Dentro de `ponto-system/`, rode:

```bash
npm install
npm run build
npm run preview -- --host
```

Depois acesse o endereco que aparecer no terminal (na rede local, use o IP do PC).

2) Hospedar o `dist/` em um servidor (recomendado para rede)

- Gere o build (`npm run build`).
- Copie o conteudo de `ponto-system/dist/` para um servidor (IIS/Apache/Nginx).
- Abra a URL do servidor no navegador do cliente.

## Instalar como servico do Windows (iniciar automaticamente)

Execute como **Administrador**:

- `MSPontoServico.bat`: unico arquivo com menu (instalar/desinstalar), ja solicita permissao de Administrador (UAC), cria o atalho e abre a pagina ao finalizar.
- `instalar_servico.bat` e `desinstalar_servico.bat`: mantidos apenas por compatibilidade (chamam o `MSPontoServico.bat`).

Depois de instalar, acesse: `http://127.0.0.1:4173`

## Backup e migracao de dados

Na aba **Configuracoes**, use:

- Exportar Tudo (.json): backup completo (funcionarios, registros e configuracoes)
- Importar Configuracao: restaurar/migrar para outro computador
