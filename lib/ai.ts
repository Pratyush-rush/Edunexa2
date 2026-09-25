export type ChatMessage = {
  role: "user" | "model" | "assistant";
  content: string;
};

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  history?: ChatMessage[];
  temperature?: number;
}

export async function generateAIResponse(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add your free Google Gemini API key to .env.local (Get a free key in 30 seconds at https://aistudio.google.com/app/apikey)."
    );
  }

  const { prompt, systemInstruction, history = [], temperature = 0.7 } = options;

  // Format multi-turn contents for Gemini REST API
  const contents = history
    .filter((msg) => msg.content && msg.content.trim().length > 0)
    .map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }));

  // Append current prompt as user message
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  const bodyPayload: any = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 2500,
    },
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  // Primary model with fallback across supported Gemini Flash versions
  // Use GEMINI_MODEL env var to override (e.g. GEMINI_MODEL=gemini-2.5-flash)
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const models = [
    ...(configuredModel ? [configuredModel] : []),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-3.5-flash-lite",
  ];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.error?.message || `Gemini API returned status ${res.status}`;
        lastError = new Error(errorMsg);
        // If model not found or unavailable, proceed to next model in fallback list
        if (model !== models[models.length - 1]) {
          continue;
        }
        throw new Error(errorMsg);
      }

      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("No response generated from the AI model.");
      }

      return generatedText;
    } catch (err: any) {
      lastError = err;
      // If network or API error and we have more fallback models, continue
      if (model !== models[models.length - 1]) {
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to communicate with AI model.");
}
