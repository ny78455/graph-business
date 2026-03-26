# Graph-Based Business Context Explorer

A production-grade enterprise data explorer that combines relational SQL queries with graph-based lifecycle tracing and an LLM natural language interface.

## 🏗️ Architecture

### 1. Data Ingestion Layer
- **Dynamic Ingestion**: Automatically scans the `data/` directory for folders representing business entities.
- **Schema Inference**: Reads the first line of `.jsonl` files to infer column names and types (TEXT, REAL, INTEGER).
- **Relational Storage**: Populates a SQLite database with normalized tables.

### 2. Hybrid Storage Layer
- **Relational (SQLite)**: Primary store for structured business data, optimized for complex analytical queries.
- **Graph (React Flow)**: Visual representation of entities and their relationships, enabling multi-hop traversal and flow tracing.

### 3. LLM Integration (Gemini)
- **NL to SQL**: Converts natural language business questions into valid SQLite SELECT queries using schema-aware prompting.
- **Result Explanation**: Translates raw SQL result sets into concise, professional business insights.
- **Guardrails**: Rejects non-business queries and prevents prompt injection.

### 4. Frontend (Modern UI)
- **React Flow**: Interactive graph visualization for exploring entity lifecycles.
- **Chat Interface**: Seamless natural language interaction with enterprise data.
- **Responsive Design**: TailwindCSS-powered layout with desktop-first precision.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Gemini API Key (configured in AI Studio Secrets)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## 🧠 Design Decisions & Trade-offs

- **SQL vs Graph**: We use SQL for high-performance aggregations and filtering, while the graph is used for visual context and relationship discovery.
- **Frontend LLM Calls**: To comply with AI Studio guidelines, LLM calls are made from the frontend using the injected API key.
- **SQLite for Demo**: SQLite is used as a lightweight, zero-config alternative to PostgreSQL for this environment, but the architecture is swappable.

## 🚨 Guardrails
- **Read-Only**: The backend strictly enforces `SELECT` only queries.
- **Domain Restriction**: The LLM is instructed to only answer business-related questions.
- **Input Validation**: Basic SQL validation is performed before execution.

## 📂 Project Structure
- `server.ts`: Express backend with ingestion and API logic.
- `src/App.tsx`: Main React entry point.
- `src/components/GraphView.tsx`: Graph visualization component.
- `src/components/ChatInterface.tsx`: AI chat interface.
- `src/services/gemini.ts`: LLM integration logic.
- `data/`: Sample enterprise dataset.
