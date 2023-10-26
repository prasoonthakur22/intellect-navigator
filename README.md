
# IntellectNavigator
AI-powered search and chat interface for exploring data scraped from [Navigator](https://www.navigator.nl/).

## 🎯 Features
IntellectNavigator offers two main functionalities:

1. **Search Interface**: Allows for robust searching within the scraped data.
2. **Chat Interface**: Provides a chat-like experience for asking questions and receiving answers based on the scraped data.

### 🔍 Search
The search functionality is powered by OpenAI embeddings (`text-embedding-ada-002`). The procedure is as follows:

1. Generate embeddings for each chunk of text within the scraped data.
2. When a user submits a query, an embedding is generated for it.
3. Using cosine similarity, the most similar passages from the scraped data are identified.

The search relies on a Postgres database with the `pgvector` extension, hosted on Supabase. Results are sorted by similarity score.

### 💬 Chat
The chat feature builds on the search functionality. It uses search results to formulate a prompt that is processed by GPT-3.5-turbo, facilitating a conversational experience.

## 🚀 Quick Start

### Requirements
- OpenAI API Key for generating embeddings.
- Supabase setup for database (or any other database service of your preference).

#### Environment Variables
Create a `.env.local` file in the root directory and add the following:

```
OPENAI_API_KEY=<Your-API-Key>
NEXT_PUBLIC_SUPABASE_URL=<Your-Supabase-URL>
SUPABASE_SERVICE_ROLE_KEY=<Your-Service-Role-Key>
```

### Repository Setup

1. Clone the repo:
   ```
   git clone https://github.com/prasoonthakur22/intellect-navigator.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Run the scraping script:
   ```
   npm run scrape
   ```
4. Run the embedding script:
   ```
   npm run embed
   ```

### Run the App
Start the development server:
```
npm run dev
```

## 🤝 Connect
For any inquiries or discussions, feel free to connect with me through [my blog](https://prasoonthakur.com) or [GitHub](https://github.com/prasoonthakur22).
