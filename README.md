# Remix 5

Crie um app web chamado "Meu Bolso", de planejamento de gastos domésticos, mobile-first, com versão PWA instalável. Idioma: português do Brasil. Moeda: R$.



STACK

- React + Tailwind + shadcn/ui

- Supabase (Auth com e-mail/senha + banco Postgres com RLS: cada usuário só vê os próprios dados)

- Recharts para gráficos



PWA

- manifest.webmanifest (nome, ícones 192/512, theme_color, display: standalone)

- Service worker com cache offline do app shell (use vite-plugin-pwa)

- Botão "Instalar app" quando o navegador permitir



TABELAS (Supabase)

- categorias: id, user_id, nome, icone, cor, orcamento_mensal (opcional)

- gastos: id, user_id, categoria_id, descricao, valor, data, forma_pagamento, recorrente (bool), observacao

- Categorias padrão criadas no primeiro login: Contas (luz, água, internet), Mercado, Veículo (combustível, manutenção, IPVA), Moradia, Saúde, Educação, Lazer, Transporte, Outros. O usuário pode criar, editar e excluir categorias.



TELAS

1. Login / Cadastro

2. Dashboard (tela inicial)

   - Seletor de período: Semana | Mês | Ano, com setas para navegar entre períodos

   - Card com total gasto no período e comparação com o período anterior (%)

   - Gráfico de pizza por categoria

   - Gráfico de barras: gastos por dia (semana), por semana (mês) ou por mês (ano)

   - Barras de progresso do orçamento por categoria (verde, amarelo, vermelho)

3. Gastos

   - Lista agrupada por data, com filtro por categoria e busca por descrição

   - Editar e excluir (deslizar ou menu)

4. Novo gasto (botão flutuante "+" sempre visível)

   - Valor (teclado numérico), categoria (chips com ícone), data (padrão hoje), descrição, forma de pagamento, opção "repetir todo mês"

5. Categorias e orçamentos

   - Gerenciar categorias e definir orçamento mensal de cada uma

6. Relatórios

   - Resumo anual por categoria x mês (tabela)

   - Exportar CSV



COMPORTAMENTO

- Gastos recorrentes são lançados automaticamente todo mês

- Semana começa na segunda-feira

- Valores formatados em R$ 1.234,56

- Modo escuro e claro

- Navegação inferior fixa (Início, Gastos, Categorias, Relatórios)

- Visual limpo e moderno, cantos arredondados, boa legibilidade no celular

- Estados vazios amigáveis e feedback com toast



Comece pela autenticação, categorias e cadastro de gastos, depois o dashboard com os três períodos, e por último o PWA e os relatórios.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe5c51fb-9be2-42d1-92e7-f524f4e6d4bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
