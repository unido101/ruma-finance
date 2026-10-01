# Ruma Finance

Personal money management dashboard built with Next.js for Vercel.

## Run locally

```bash
npm install
npm run dev
```

Receipt extraction uses the OpenAI API. For local development, copy `.env.example` to `.env.local` and replace the placeholder with your key. On Vercel, add `OPENAI_API_KEY` under Project Settings > Environment Variables, then redeploy. Do not add `NEXT_PUBLIC_` to this secret. API usage has separate billing from ChatGPT subscriptions.

Transactions are currently stored in the browser using local storage. The dashboard includes sample transactions, budgets, and savings goals so the interface is ready to explore.



