
// llm.config.js

import env from "./env.config.js";

// Gemini models to try, in order.
// Avoid deprecated/shut-down models such as:
// - gemini-1.5-flash
// - gemini-2.0-flash
const fallbackModels = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
];

export async function generateLlmResponse({
    prompt,
    systemInstruction,
    history = [],
    temperature = 0.7,
}) {
    // --------------------------------------------------
    // Validate API key
    // --------------------------------------------------

    if (!env.geminiApiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    if (!prompt || !prompt.trim()) {
        throw new Error("Prompt is required.");
    }

    // --------------------------------------------------
    // Build conversation history
    // --------------------------------------------------

    const contents = [];

    for (const message of history) {
        if (!message?.content?.trim()) {
            continue;
        }

        // Gemini only accepts "user" and "model"
        // inside contents.
        //
        // Your application can use:
        //   assistant -> model
        //   user      -> user
        //
        // Any other role is treated as user.
        const role =
            message.role === "assistant"
                ? "model"
                : "user";

        contents.push({
            role,
            parts: [
                {
                    text: message.content.trim(),
                },
            ],
        });
    }

    // --------------------------------------------------
    // Add current user prompt
    // --------------------------------------------------

    contents.push({
        role: "user",
        parts: [
            {
                text: prompt.trim(),
            },
        ],
    });

    // --------------------------------------------------
    // Build request payload
    // --------------------------------------------------

    const payload = {
        contents,

        generationConfig: {
            temperature,
            maxOutputTokens: 2500,
        },

        ...(systemInstruction?.trim()
            ? {
                  systemInstruction: {
                      parts: [
                          {
                              text: systemInstruction.trim(),
                          },
                      ],
                  },
              }
            : {}),
    };

    // --------------------------------------------------
    // Model selection
    // --------------------------------------------------
    //
    // If GEMINI_MODEL exists in .env, try that first.
    // Then try the fallback models.
    //
    // Set removes duplicates automatically.
    // --------------------------------------------------

    const models = env.geminiModel
        ? [env.geminiModel, ...fallbackModels]
        : fallbackModels;

    const uniqueModels = [...new Set(models)];

    let lastError = null;

    // --------------------------------------------------
    // Try each model
    // --------------------------------------------------

    for (const model of uniqueModels) {
        try {
            console.log(`Trying Gemini model: ${model}`);

            const url =
                `https://generativelanguage.googleapis.com/v1beta/models/` +
                `${encodeURIComponent(model)}:generateContent` +
                `?key=${encodeURIComponent(env.geminiApiKey)}`;

            const response = await fetch(url, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(payload),
            });

            // --------------------------------------------------
            // Parse response safely
            // --------------------------------------------------

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    `Gemini returned an invalid JSON response. ` +
                    `HTTP status: ${response.status}`
                );
            }

            // --------------------------------------------------
            // Handle HTTP errors
            // --------------------------------------------------

            if (!response.ok) {
                const apiError =
                    data?.error?.message ||
                    `Gemini request failed with HTTP ${response.status}`;

                throw new Error(apiError);
            }

            // --------------------------------------------------
            // Extract generated text
            // --------------------------------------------------

            const candidates = data?.candidates;

            if (!Array.isArray(candidates) || candidates.length === 0) {
                throw new Error(
                    "Gemini returned no candidates."
                );
            }

            const text = candidates
                .flatMap((candidate) => candidate?.content?.parts || [])
                .map((part) => part?.text)
                .filter(
                    (text) =>
                        typeof text === "string" &&
                        text.trim().length > 0
                )
                .join("");

            if (!text) {
                throw new Error(
                    "Gemini returned an empty response."
                );
            }

            console.log(
                `Gemini response generated successfully using ${model}`
            );

            return text.trim();
        } catch (error) {
            lastError = error;

            console.error(
                `Gemini model "${model}" failed:`,
                error?.message || error
            );

            // Continue to the next model.
            continue;
        }
    }

    // --------------------------------------------------
    // All models failed
    // --------------------------------------------------

    throw new Error(
        `Failed to generate a response from Gemini. ` +
        `Tried models: ${uniqueModels.join(", ")}. ` +
        `Last error: ${lastError?.message || "Unknown error"}`
    );
}

