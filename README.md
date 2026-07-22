This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



## Diario de desenvolvimento
## Memória do projeto

Este projeto possui uma memória externa localizada no repositório `brain`.

Ao concluir uma alteração relevante ou encerrar uma sessão de trabalho, atualize o arquivo correspondente deste projeto localizado em:

`..\brain\apoio-contabil.md`

Essa memória será utilizada por outras IAs para recuperar rapidamente o contexto do projeto e decidir os próximos passos. Portanto, registre apenas informações úteis para continuidade do desenvolvimento.

Utilize apenas fatos confirmados durante a implementação. Nunca invente resultados, testes, decisões ou pendências.

O arquivo deve conter uma única entrada para cada dia. Caso já exista uma entrada para a data atual, atualize essa mesma seção em vez de criar outra. Preserve integralmente todo o histórico dos dias anteriores.

Cada entrada deve conter obrigatoriamente:

- O que foi feito.
- Problemas encontrados ou pendências.
- Próximos passos.
- Ideias futuras.

Ao registrar o trabalho:

- Consolide alterações relacionadas em vez de criar vários itens pequenos.
- Registre apenas alterações relevantes para o entendimento do projeto.
- Diferencie claramente o que foi concluído, o que ficou parcialmente implementado, o que ainda precisa ser testado e o que é apenas uma ideia futura.
- Organize os próximos passos em ordem de prioridade.
- Sempre que possível, indique se um próximo passo possui consumo de IA baixo, médio ou alto.
- Grave o arquivo sempre em UTF-8, preservando corretamente todos os caracteres em português.
- Nunca registre senhas, tokens, chaves de API, certificados, dados de clientes, informações fiscais confidenciais ou qualquer informação sensível.

Após atualizar a memória:

1. Faça commit apenas das alterações realizadas no repositório `brain`.
2. Utilize uma mensagem de commit curta e objetiva, por exemplo:

   `docs: atualizar memória do programa`

3. Faça push para o GitHub.
4. Caso o commit ou o push falhem, informe claramente o erro e não considere a memória sincronizada.

O objetivo desta memória é permitir que qualquer IA continue o desenvolvimento exatamente do ponto onde a sessão anterior terminou, sem necessidade de reconstruir o contexto novamente.
