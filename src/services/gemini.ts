import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateSQL(query: string, schema: any): Promise<string> {
  const model = "gemini-3-flash-preview";
  const schemaStr = JSON.stringify(schema, null, 2);
  
  const prompt = `You are an expert SQL analyst. Convert the following natural language query into a valid SQLite SELECT query.
  
  DATABASE SCHEMA:
  ${schemaStr}
  
  RULES:
  1. Return ONLY the SQL query.
  2. No explanation, no markdown formatting (no \`\`\`sql).
  3. Only use SELECT statements.
  4. If the query is not a business query, return "ERROR: Non-business query detected."
  5. If you cannot answer the query with the given schema, return "ERROR: Cannot answer with current schema."
  
  QUERY: "${query}"`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim() || "";
}

export async function explainResults(query: string, results: any[]): Promise<string> {
  const model = "gemini-3-flash-preview";
  const resultsStr = JSON.stringify(results.slice(0, 10), null, 2); // Limit context
  
  const prompt = `You are a business analyst. Explain the following SQL query results in natural language for a business user.
  
  ORIGINAL QUERY: "${query}"
  SQL RESULTS:
  ${resultsStr}
  
  Provide a concise, professional explanation. If there are many results, summarize the key findings.`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text?.trim() || "";
}
