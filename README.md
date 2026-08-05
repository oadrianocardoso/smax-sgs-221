# SMAX SGS 221

Conjunto modular de melhorias para o SMAX, distribuído como userscript para Tampermonkey. O projeto aprimora a triagem e a análise de chamados, destaca informações importantes, automatiza tarefas repetitivas e oferece ferramentas de apoio à gestão.

> Projeto de uso interno, desenvolvido para as páginas do SMAX em `https://suporte.tjsp.jus.br/saw/`.

## Principais funcionalidades

### Painel gerencial com inteligência artificial

Na aba de discussões do chamado, o sistema inclui um painel recolhível capaz de analisar as manifestações visíveis utilizando a API da OpenAI.

O resultado é organizado em linhas com:

- classificação da demanda;
- situação atual da discussão;
- resumo dos principais fatos;
- riscos e impactos identificados;
- pontos pendentes de decisão;
- parecer gerencial sugerido, escrito em primeira pessoa.

O parecer pode ser revisado, copiado ou inserido diretamente no editor de resposta do SMAX. O painel começa recolhido para não ocupar espaço desnecessário na página.

A análise diferencia, entre outros cenários:

- melhoria sistêmica;
- configuração controlada;
- configuração com possível evolução;
- necessidade de análise técnica adicional.

O módulo também possui cache durante a sessão, respostas estruturadas, tratamento específico de erros de autenticação, modelo, saldo e limites da API.

### Triagem visual de chamados

O grid do SMAX recebe recursos visuais que facilitam a identificação rápida de situações relevantes:

- destaque de palavras exatas, trechos e expressões configuradas;
- grupos de destaque por cores;
- identificação de chamados relacionados a magistrados;
- aplicação automática de tags na descrição;
- indicação visual do especialista responsável pelo chamado;
- cores personalizadas para cada especialista;
- redistribuição visual quando um especialista estiver marcado como ausente.

### Gestão de especialistas e equipes

O painel de configurações permite:

- selecionar a equipe ativa;
- importar especialistas cadastrados no SMAX;
- definir nome e apelido de exibição;
- associar intervalos de finais de chamados a cada especialista;
- personalizar cores de fundo e texto;
- marcar especialistas ausentes;
- manter configurações específicas por equipe.

### Palavras destacadas e tags automáticas

Cada especialista pode manter suas próprias regras de triagem:

- palavras exatas;
- correspondências parciais;
- grupos de cores;
- tags automáticas associadas a uma ou mais palavras-chave.

As regras são aplicadas dinamicamente mesmo quando o grid é atualizado, rolado ou renderizado novamente pelo SMAX.

### Alertas de usuários

É possível cadastrar usuários que precisam de atenção especial. Quando um nome configurado é localizado, o sistema exibe um alerta visual destacado.

O módulo de dados eProc também pode identificar e apresentar as classificações:

- `DETRATOR`;
- `AUTOMATIZADOR`.

### Dados eProc no chamado

Quando essas informações estão presentes na resposta interna do SMAX, um bloco adicional é incluído no formulário contendo:

- número do processo;
- usuário relacionado;
- unidade;
- lotação;
- aviso sobre discussões existentes;
- botões para copiar os valores rapidamente.

### Visualização de anexos

O tratamento de anexos foi aprimorado para:

- posicionar a área de anexos no início do formulário;
- abrir imagens em uma visualização ampliada;
- abrir documentos PDF em nova aba;
- reconhecer anexos mesmo quando o nome ou o tipo não está evidente no link;
- manter a opção de abertura direta como alternativa.

### Melhorias no editor de comentários

O editor CKEditor recebe atalhos adicionais:

- formatação padronizada de parágrafos e imagens;
- inserção de citações;
- seletor de ícones para destacar avisos, etapas, informações e resultados;
- expansão automática da área de comentários para exibir todo o histórico.

### Ações de resolução mais acessíveis

Na área de encerramento do chamado, o sistema replica no topo os controles importantes do SMAX:

- responsável selecionado, em modo somente leitura;
- salvar;
- salvar e fechar;
- alteração da fase do ciclo de vida.

Os controles adicionais acionam as funções nativas da página.

### Organização da página

Para reduzir ruído visual, o sistema pode:

- recolher automaticamente a seção de oferta de catálogo;
- ocultar seções técnicas sem uso no fluxo configurado;
- aplicar identidade visual diferenciada ao cabeçalho;
- manter os ajustes após renderizações dinâmicas do SMAX.

### Exportação de chamados

O painel permite exportar os chamados da visualização atual para CSV.

O exportador:

- utiliza o filtro ativo no grid;
- consulta os registros em páginas de 250 itens;
- contorna o limite de 10 mil registros dividindo automaticamente o intervalo da consulta;
- preserva os principais campos do chamado;
- apresenta quantidade processada e barra de progresso;
- gera um arquivo CSV compatível com planilhas, usando `;` como separador e codificação UTF-8.

## Painel de configurações

O botão flutuante de engrenagem abre uma interface central para administrar os recursos do userscript.

| Área | Recursos disponíveis |
| --- | --- |
| Geral | Ativar ou desativar destaques, especialistas, magistrados, recolhimento de seções, expansão de comentários e tags automáticas |
| Especialistas | Equipes, nomes, apelidos, faixas de finais, cores e ausências |
| Palavras destacadas | Termos exatos e parciais separados por grupos de cores |
| Tags | Regras de tags e respectivas palavras-chave |
| Detratores | Cadastro e ordenação de usuários para alerta |
| Exportação | Status do filtro e início da exportação CSV |

As preferências possuem armazenamento local e podem ser sincronizadas pelo serviço central configurado no projeto por meio de uma API compatível com Supabase/PostgREST.

## Requisitos

- navegador compatível com userscripts, como Chrome, Edge ou Firefox;
- extensão Tampermonkey instalada;
- acesso autenticado ao ambiente SMAX configurado no script;
- acesso ao serviço de configuração central, quando utilizado;
- chave da API da OpenAI somente para o painel de análise por IA.

## Instalação

1. Instale a extensão Tampermonkey no navegador.
2. Abra o arquivo [smax-sgs-221.user.js](smax-sgs-221.user.js) pela interface *Raw* do GitHub.
3. Confirme a instalação apresentada pelo Tampermonkey.
4. Atualize ou abra novamente uma página do SMAX.
5. Use o botão de engrenagem para revisar as preferências e a equipe ativa.

O arquivo principal carrega os módulos diretamente deste repositório. Ao publicar uma nova versão, atualize o número de `@version` e os parâmetros de versão dos módulos alterados para evitar o uso de cache antigo.

## Configuração da OpenAI

1. Abra um chamado que possua manifestações na aba de discussões.
2. Localize **Análise gerencial da discussão** na parte inferior da lista.
3. Clique em **Expandir** e depois em **Configurar IA**.
4. Informe uma chave válida da API da OpenAI.
5. Selecione o modelo e escolha se a chave deve ser lembrada pelo Tampermonkey.
6. Clique em **Salvar e gerar**.

A assinatura do ChatGPT não inclui, por si só, créditos para uso da API. A conta da API Platform precisa possuir faturamento e limites disponíveis.

## Privacidade e segurança

- A chave da OpenAI não deve ser adicionada ao código-fonte ou enviada ao Git.
- Quando a opção de lembrar a chave é selecionada, ela é armazenada pelo Tampermonkey no navegador.
- O texto visível das discussões é enviado à OpenAI para produzir a análise.
- As chamadas de análise utilizam `store: false`.
- O conteúdo gerado por IA deve ser revisado antes de ser registrado no chamado.
- Dados internos, credenciais e endereços de infraestrutura não devem ser publicados em repositórios públicos sem revisão prévia.

## Estrutura do projeto

```text
.
├── smax-sgs-221.user.js          # Userscript principal
├── smax-sgs-221.local.user.js    # Versão para desenvolvimento local
└── modules/
    ├── config.js                 # Preferências e utilitários compartilhados
    ├── supabase-db.js            # Persistência e sincronização das configurações
    ├── menu-config.js            # Painel administrativo
    ├── orchestrator.js           # Inicialização e reaplicação dos módulos
    ├── discussion-advisor.js     # Análise gerencial com OpenAI
    ├── highlights.js             # Destaque de termos no grid
    ├── destaca-atendente.js      # Identificação visual de responsáveis
    ├── magistrado.js             # Destaque de chamados de magistrados
    ├── tags.js                   # Tags automáticas
    ├── detratores.js             # Alertas de usuários
    ├── dados-eproc.js            # Informações complementares do eProc
    ├── attachments.js            # Organização e visualização de anexos
    ├── comments.js               # Expansão da área de comentários
    ├── sections.js               # Organização das seções do formulário
    ├── botoes-resolucao.js       # Atalhos para resolução do chamado
    ├── passar-aquele-gel.js      # Ferramentas adicionais do CKEditor
    ├── export-chamados.js        # Exportação EMS para CSV
    └── css.js                    # Ajustes visuais globais
```

## Desenvolvimento local

Para testar alterações sem publicar os módulos remotos:

1. instale [smax-sgs-221.local.user.js](smax-sgs-221.local.user.js) no Tampermonkey;
2. habilite na extensão o acesso a URLs de arquivos locais;
3. mantenha o repositório no caminho referenciado pelos `@require` do userscript local;
4. recarregue o userscript e a página do SMAX após cada alteração.

## Observações

- O projeto depende da estrutura HTML e dos endpoints internos do SMAX; alterações na plataforma podem exigir atualização dos seletores ou integrações.
- Algumas funcionalidades só aparecem quando a página possui os campos e dados necessários.
- A exportação respeita o filtro capturado da visualização atual.
- O parecer da IA é um apoio à decisão e não substitui a validação do gestor responsável.

## Autor

Desenvolvido e mantido por **Adriano Augusto Cardoso e Santos**.
