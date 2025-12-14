import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
// Note: In a production environment, we'd handle the missing key more gracefully
// or via a backend proxy. For this demo, we assume the environment injects it.

const ai = new GoogleGenAI({ apiKey });

export const generateMotivation = async (userName: string, upcomingTasksCount: number, language: string = 'English'): Promise<string> => {
  if (!apiKey) return "Keep pushing forward! (API Key missing)";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, punchy, motivational quote for a student named ${userName} who has ${upcomingTasksCount} tasks pending. 
      Focus on discipline and 'building' their future. Max 20 words.
      IMPORTANT: Respond in the following language: ${language}.`,
    });
    return response.text || "Stay focused and keep building your future.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Discipline is doing what needs to be done, even if you don't want to do it.";
  }
};

export const chatWithObiri = async (message: string, context: string, language: string = 'English'): Promise<string> => {
  if (!apiKey) return "I can't connect to my brain right now (API Key missing).";

  try {
    // Upgraded to gemini-3-pro-preview with thinking config AND Google Search
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are Obiri, a wise and friendly student mentor and life operating system.
      
      Your goal is to be a supportive companion with access to the entire world of information.
      
      GUIDELINES:
      1. IF the user asks about REAL-TIME info (Weather, News, Sports, Stock Prices): Use the Google Search tool.
      2. IF the user asks about FINANCE: Explain concepts simply (ELI15), focusing on financial literacy.
      3. IF the user asks about PRODUCTIVITY: Use the VIBE system (Vision, Intent, Build, Execute).
      4. IF the user asks GENERAL questions: Be a friendly, encouraging peer. You can discuss any topic (history, science, entertainment, etc.).

      CONTEXT: ${context}
      USER PREFERRED LANGUAGE: ${language}
      
      USER QUESTION: ${message}
      
      Keep the answer concise, encouraging, and practical. ALWAYS respond in the user's preferred language (${language}).`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        tools: [{ googleSearch: {} }]
      }
    });

    // Check for grounding metadata (search results) and append sources if available
    let text = response.text || "I'm thinking, but I couldn't come up with an answer.";
    
    // Clean up any potential markdown artifacts if needed, though gemini-3-pro is usually good.
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the network to check that information. Please try again later.";
  }
};

export const explainFinancialConcept = async (topic: string, language: string = 'English'): Promise<string> => {
  if (!apiKey) return "Content unavailable without API Key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Explain the financial concept of "${topic}" to a university student. 
      Break it down into:
      1. What it is (Simple definition).
      2. Why it matters (The 'Vision').
      3. One risk to watch out for.
      Keep it under 150 words.
      Respond in: ${language}`,
    });
    return response.text || "Could not generate explanation.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error loading content.";
  }
};

export const getFinancialResources = async (topic: string): Promise<{title: string, uri: string}[]> => {
  if (!apiKey) return [];

  try {
    // We use search grounding to find real links
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find 3 highly reliable, educational websites or blogs that explain "${topic}" for beginners. 
      Prioritize sources like Investopedia, NerdWallet, The Balance, or reputable financial news sites.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Filter and map reliable sources
    const resources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ 
        title: c.web.title, 
        uri: c.web.uri 
      }))
      // Deduplicate by URI
      .filter((v: any, i: any, a: any) => a.findIndex((t: any) => (t.uri === v.uri)) === i)
      .slice(0, 3);

    return resources;
  } catch (error) {
    console.error("Resource Fetch Error:", error);
    return [];
  }
};

// --- Smart Schedule Feature ---

export const generateStudyScheduleFromImage = async (imageBase64: string, mimeType: string): Promise<any[]> => {
  if (!apiKey) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          },
          {
            text: `Analyze this timetable image. 
            1. Identify the existing classes.
            2. Identify free gaps between classes and in the evenings (up to 9 PM).
            3. Generate 'Personal Study' sessions for these gaps.
            4. Return a JSON list of objects.
            
            Format:
            [
              {
                "name": "Class Name" or "Personal Study",
                "day": "Monday",
                "startTime": "HH:MM",
                "endTime": "HH:MM",
                "location": "Room/Library",
                "type": "class" or "study"
              }
            ]
            
            Ensure times are in 24-hour format (e.g., 14:00).
            Do not wrap in markdown code blocks, just return raw JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    // Basic cleanup in case model adds markdown despite instructions
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Schedule Gen Error:", error);
    return [];
  }
};

// --- Social & Fun Features ---

export const getTrendingStudentNews = async (): Promise<{text: string, sources: any[]}> => {
  if (!apiKey) return { text: "API Key missing.", sources: [] };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Search for 5 trending, educational, or fun news stories/blogs suitable for university students from the last 48 hours. Provide a summary list. IMPORTANT: Do not use bolding asterisks (**) or markdown bullets. Use plain text or simple dashes for list items.",
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    let text = response.text || "No news found.";
    
    // Aggressive cleaning of Markdown artifacts
    // Removes bolding (**), italics (*), headers (#), and cleans up bullet points
    text = text
      .replace(/\*\*/g, '')      // Remove bold
      .replace(/\*/g, '')        // Remove stray asterisks
      .replace(/#{1,6}\s/g, '')  // Remove markdown headers
      .replace(/`/g, '')         // Remove code ticks
      .replace(/^\s*-\s*/gm, '• ') // Replace markdown dashes with bullets for cleaner look
      .replace(/^\s*\*\s*/gm, '• '); // Replace asterisk bullets with clean bullets

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("News Fetch Error:", error);
    return { text: "Could not fetch trending news at the moment.", sources: [] };
  }
};

export const generateNewsIllustration = async (headline: string): Promise<string | null> => {
  if (!apiKey) return null;

  try {
    // Using gemini-2.5-flash-image (Nano Banana) for image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a modern, vibrant, digital illustration for a student news feed. 
            Theme: ${headline.substring(0, 100)}. 
            Style: Minimalist vector art, soft colors, educational, inspiring. 
            No text in the image.`
          }
        ]
      },
      config: {
        // No responseMimeType for image models
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
};

export const generateQuiz = async (topic: string = "General Knowledge"): Promise<any> => {
  if (!apiKey) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 5 multiple choice quiz questions about ${topic}. 
      Format as JSON with properties: question, options (array of strings), correctIndex (number).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.NUMBER }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Quiz Error:", error);
    return [];
  }
};

export const getWordGameData = async (): Promise<{letters: string[], possibleWords: number}> => {
  if (!apiKey) return { letters: ['A','B','C','D','E','F','G'], possibleWords: 0 };
  
  try {
    const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash',
       contents: "Generate 7 random letters for a Scrabble-like game. Ensure at least 2 vowels. Also estimate how many common English words can be made from them. Return JSON: { letters: string[], count: number }",
       config: {
         responseMimeType: "application/json"
       }
    });
    const data = JSON.parse(response.text || "{}");
    return { 
      letters: data.letters || ['S','T','U','D','E','N','T'], 
      possibleWords: data.count || 10 
    };
  } catch (e) {
    return { letters: ['S','T','U','D','E','N','T'], possibleWords: 10 };
  }
};