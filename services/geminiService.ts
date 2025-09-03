import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { type GenerationResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseAnalysisText = (text: string, userPrompt?: string): { title: string; description: string } => {
    if (userPrompt) {
        const reasonMatch = text.match(/(?:Reason|이유):\s*(.*)/is);
        const description = reasonMatch ? reasonMatch[1].trim() : text;
        return { title: userPrompt, description };
    }
    
    const titleMatch = text.match(/(?:Job Title|직업명):\s*(.*?)\n/i);
    const reasonMatch = text.match(/(?:Reason|이유):\s*(.*)/is);

    const title = titleMatch ? titleMatch[1].trim() : "분석 결과";
    let description = reasonMatch ? reasonMatch[1].trim() : text;

    if (!reasonMatch && titleMatch) {
      description = text.replace(titleMatch[0], '').trim();
    }
    
    return { title, description };
};


export const generateImageAndAnalysis = async (imageBase64: string, mimeType: string, prompt: string): Promise<GenerationResult> => {
    const imagePart = {
        inlineData: {
            data: imageBase64.split(',')[1],
            mimeType,
        },
    };

    let textPrompt = '';
    if (prompt) {
        textPrompt = `You are a creative AI image editor. Your task is to modify the provided user image to represent a "${prompt}" and then describe your changes.

**CRITICAL INSTRUCTIONS:**
1.  **GENERATE IMAGE FIRST:** You MUST generate a new image by editing the original to reflect the "${prompt}" career. This is your primary task. For example, for a 'developer', you could add a laptop with code.
2.  **GENERATE TEXT SECOND:** After generating the image, you MUST provide a description in Korean using this exact format:
    "이유: [당신이 생성한 이미지에서 '${prompt}' 직업을 표현하기 위해 무엇을 변경했는지 설명하세요.]"

**MANDATORY OUTPUT:** Your final response MUST contain BOTH the generated image AND the text description. Do not respond with only text.`;
    } else {
        textPrompt = `You are a creative AI image editor. Your task is to choose a suitable career for the person in the provided image, modify the image to represent that career, and then describe your changes.

**CRITICAL INSTRUCTIONS:**
1.  **GENERATE IMAGE FIRST:** You MUST generate a new image. First, analyze the person and choose a fitting career. Then, edit the original image to reflect that career. This is your primary task. For example, for a 'chef', you could add a kitchen background.
2.  **GENERATE TEXT SECOND:** After generating the image, you MUST provide a description in Korean using this exact format:
    "직업명: [당신이 선택한 직업]"
    "이유: [왜 이 직업을 선택했고, 당신이 생성한 이미지에서 무엇을 변경했는지 설명하세요.]"

**MANDATORY OUTPUT:** Your final response MUST contain BOTH the generated image AND the text description. Do not respond with only text.`;
    }
    const textPart = { text: textPrompt };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        if (!response.candidates || response.candidates.length === 0) {
            let errorMessage = "The request was blocked, likely for safety reasons. Please try a different image or prompt.";
            if (response.promptFeedback?.blockReason) {
                errorMessage = `Request blocked: ${response.promptFeedback.blockReason}. Please adjust your input.`;
            }
            throw new Error(errorMessage);
        }

        const candidate = response.candidates[0];
        let generatedImage: string | null = null;
        let analysisText: string | null = null;

        if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                } else if (part.text) {
                    analysisText = part.text;
                }
            }
        }

        if (!generatedImage || !analysisText) {
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;

            console.error('Incomplete response received from Gemini.', JSON.stringify({
                hasImage: !!generatedImage,
                hasText: !!analysisText,
                finishReason,
                safetyRatings,
                candidate,
            }, null, 2));

            if (finishReason === 'SAFETY') {
                throw new Error("Generation failed due to safety concerns. The model cannot process this request. Please try a different image or prompt.");
            }
            
            const blockedRating = safetyRatings?.find(rating => rating.blocked);
            if (blockedRating) {
                 throw new Error(`Generation failed due to the safety policy for '${blockedRating.category}'. Please try a different image or prompt.`);
            }

            if (finishReason && finishReason !== 'STOP') {
                throw new Error(`Generation stopped unexpectedly: ${finishReason}. Please try a different image or prompt.`);
            }
            
            let detailedError = "API did not return both an image and text. The model may have been unable to fulfill the request.";
            if (generatedImage && !analysisText) {
                detailedError = "The API returned an image but no descriptive text. The model might have failed to generate the analysis part.";
            } else if (!generatedImage && analysisText) {
                detailedError = "The API returned an analysis but no image. The model might have failed to generate the image part.";
            }
            
            throw new Error(`${detailedError} Please try again with a different image or prompt.`);
        }

        const { title, description } = parseAnalysisText(analysisText, prompt);

        return {
            image: generatedImage,
            title,
            description,
        };

    } catch (e) {
        console.error("Gemini API Error:", e);
        if (e instanceof Error) {
            throw e; 
        }
        throw new Error("An unknown error occurred during the API call.");
    }
};