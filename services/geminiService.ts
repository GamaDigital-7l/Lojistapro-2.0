import { GoogleGenAI } from "@google/genai";
import { Tecnico } from '../types';

export interface ChatResponse {
  message: string;
  action?: 'CREATE_OS' | 'UPDATE_STATUS' | 'RECORD_PAYMENT' | 'CREATE_LOJISTA' | 'CREATE_TECNICO' | 'NEED_INFO' | 'UNKNOWN';
  data?: any;
}

export const processAICommand = async (input: string, context: { tecnicos: Tecnico[], history: any[], apiKey: string | undefined }): Promise<ChatResponse> => {
  const { apiKey } = context;
  if (!apiKey) {
    return { 
      message: "CONFIGURAÇÃO NECESSÁRIA: A chave da API do Google Gemini não foi fornecida. Por favor, configure-a na tela de 'Ajustes' para usar o assistente.", 
      action: "UNKNOWN" 
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const contextForAI = context.tecnicos.map(t => t.nome).join(', ');
    const systemInstruction = `Você é um assistente de IA focado em transformar texto em JSON para o sistema LOJISTA PRO 2.0. Sua ÚNICA saída deve ser um objeto JSON válido, sem markdown ou texto extra. O JSON deve ter a seguinte estrutura: { "action": "NOME_DA_ACAO", "message": "Mensagem para o usuário.", "data": { ... } }.
AÇÕES VÁLIDAS: 'CREATE_OS'.
REGRAS DE EXTRAÇÃO PARA 'CREATE_OS':
- Extraia 'id', 'modelo', 'defeito_reclamado', 'valor_cobrado', 'custo_pecas', 'tecnico_nome'.
- O campo 'id' é obrigatório. Se faltar, retorne um JSON com action: "NEED_INFO" e uma message clara pedindo o número da OS.
- O campo 'tecnico_nome' deve ser um dos nomes da lista de contexto. Se não encontrar, retorne uma message informando que o técnico não foi encontrado e liste os disponíveis.
- A 'message' deve ser uma confirmação amigável da ação. Ex: "Ok, criando OS #1234 para o iPhone 13."`;
    
    const fullPrompt = `Contexto - Técnicos disponíveis: ${contextForAI}. Comando do usuário: ${input}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0,
      }
    });

    const responseText = response.text?.trim();
    if (!responseText) {
        throw new Error("Resposta da IA vazia ou inválida.");
    }
    const resultJson = JSON.parse(responseText);

    return resultJson as ChatResponse;

  } catch (error: any) {
    console.error("Erro no serviço Gemini (Client-side):", error);
    let errorMessage = "Desculpe, ocorreu um erro de comunicação com o assistente.";
    
    if (error.message?.includes('API key not valid')) {
      errorMessage = "CONFIGURAÇÃO INVÁLIDA: A chave da API do Google Gemini que você salvou é inválida. Verifique-a na tela de Ajustes.";
    } else if (error instanceof SyntaxError) {
        errorMessage = "O assistente retornou uma resposta em formato inesperado. Tente novamente.";
    } else {
        errorMessage = `Erro no assistente: ${error.message}`
    }
    
    return { message: errorMessage, action: "UNKNOWN" };
  }
};