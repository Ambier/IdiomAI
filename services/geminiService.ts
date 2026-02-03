
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AudienceType, IdiomContent, VisualBible } from "../types";

/**
 * [Core] 带有指数退避逻辑的重试执行器
 * 确保开源项目在不稳定网络环境下的健壮性
 */
const withRetry = async <T>(fn: () => Promise<T>, maxAttempts: number = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

/**
 * [Agent] ScriptExpert - 剧本专家智能体
 * 职责：深度解析文化背景，进行文学性叙事拆解
 */
const ScriptAgent = {
  async run(idiom: string, audience: AudienceType) {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `你是一位成语研究专家和资深编剧。将成语"${idiom}"拆解为4幕连环画剧本，受众为${audience}。
      需包含：简单解释、出处、全文故事、以及四幕分镜描述。
      请以符合Schema要求的JSON格式返回。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              origin: { type: Type.STRING },
              story: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                minItems: 4, maxItems: 4
              }
            },
            required: ["explanation", "origin", "story", "scenes"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    });
  }
};

/**
 * [Agent] VisualDirector - 视觉导演智能体
 * 职责：确立视觉 DNA，保证连环画的人物一致性和美术风格统一
 */
const DirectorAgent = {
  async run(idiom: string, audience: AudienceType, story: string): Promise<VisualBible> {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const styleMap = {
        [AudienceType.KINDERGARTEN]: "Claymation style, vibrant pastel colors, soft lighting",
        [AudienceType.PRIMARY_SCHOOL]: "Modern hand-drawn storybook style, bright and cheerful",
        [AudienceType.MIDDLE_SCHOOL]: "Detailed digital painting, historical atmosphere",
        [AudienceType.ADULT]: "Cinematic concept art, moody lighting, realistic textures",
        [AudienceType.SENIOR]: "Traditional Chinese Ink Wash painting, elegant, fluid brushstrokes"
      };

      const prompt = `根据故事：${story}，为成语"${idiom}"定义视觉基准。
      输出：styleDescription(风格), characterDescription(固定角色特征), colorPalette(色调)。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              styleDescription: { type: Type.STRING },
              characterDescription: { type: Type.STRING },
              colorPalette: { type: Type.STRING }
            },
            required: ["styleDescription", "characterDescription", "colorPalette"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    });
  }
};

/**
 * [Agent] ArtistAgent - 画师智能体
 * 职责：将文字描述转化为高质量视觉图像
 */
const ArtistAgent = {
  async draw(scene: string, bible: VisualBible): Promise<string> {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const finalPrompt = `Masterpiece, ${bible.styleDescription}. Characters: ${bible.characterDescription}. Colors: ${bible.colorPalette}. Scene: ${scene}.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: finalPrompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      const imgPart = response.candidates[0].content.parts.find(p => p.inlineData);
      if (imgPart?.inlineData) return `data:image/png;base64,${imgPart.inlineData.data}`;
      throw new Error("Image generation failed");
    });
  },

  async animate(prompt: string, onProgress: (step: string) => void): Promise<string> {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });

      while (!operation.done) {
        onProgress("VEO 引擎正在渲染逐帧动画...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        const pollAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        try {
          operation = await pollAi.operations.getVideosOperation({ operation });
        } catch (err: any) {
          if (err.message?.includes("Requested entity was not found.")) {
            await (window as any).aistudio.openSelectKey();
          }
          throw err;
        }
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    });
  }
};

/**
 * [Orchestrator] - 编排执行器
 * 暴露给 UI 的统一入口，管理整个 Agentic 工作流
 */
export const orchestrateIdiomMAS = async (
  idiom: string, 
  audience: AudienceType, 
  onProgress: (step: string, progress: number) => void
): Promise<IdiomContent> => {
  
  onProgress("剧本专家 (ScriptAgent) 正在深度创作...", 15);
  const script = await ScriptAgent.run(idiom, audience);
  
  onProgress("视觉导演 (DirectorAgent) 正在确立视觉基准...", 35);
  const bible = await DirectorAgent.run(idiom, audience, script.story);
  
  onProgress("画师智能体 (ArtistAgent) 正在批量绘制分镜...", 60);
  const imageUrls = await Promise.all(
    script.scenes.map((scene: string) => ArtistAgent.draw(scene, bible))
  );
  
  onProgress("音频服务正在生成语音导读...", 85);
  const audioBase64 = await generateVoice(script.story, audience);

  return {
    idiom,
    explanation: script.explanation,
    origin: script.origin,
    story: script.story,
    visualBible: bible,
    panels: imageUrls.map((url, i) => ({ imageUrl: url, description: `Scene ${i+1}` })),
    audioBase64,
    videoPrompt: `Cinematic animation, ${bible.styleDescription}. Characters: ${bible.characterDescription}. Story: ${script.scenes[2]}`
  };
};

export const generateVoice = async (text: string, audience: AudienceType): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const voiceMap = {
      [AudienceType.KINDERGARTEN]: 'Kore',
      [AudienceType.PRIMARY_SCHOOL]: 'Kore',
      [AudienceType.MIDDLE_SCHOOL]: 'Zephyr',
      [AudienceType.ADULT]: 'Zephyr',
      [AudienceType.SENIOR]: 'Charon'
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[audience] } } }
      }
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

// 重新导出，保持 App.tsx 的调用一致性
export const generateIdiomVideo = ArtistAgent.animate;
