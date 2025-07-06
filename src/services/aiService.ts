import axios, { AxiosResponse } from 'axios';
import { AIProvider, AIRequest, AIResponse, RankingEntry } from '../schema.js';
import { AIServiceError } from '../schema.js';

export class AIService {
  private provider: AIProvider;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * Extract ranking data from a screenshot using AI
   */
  async extractRankingData(imageBase64: string): Promise<RankingEntry[]> {
    const prompt = this.createExtractionPrompt();

    try {
      const response = await this.makeAIRequest({
        imageBase64,
        prompt,
        model: this.provider.model || 'gpt-4o',
      });

      return this.parseRankingResponse(response.extractedText);
    } catch (error) {
      throw new AIServiceError(
        `Failed to extract ranking data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.provider.name,
        error instanceof Error && 'status' in error ? (error as any).status : undefined
      );
    }
  }

  /**
   * Make a request to the AI service with rate limiting
   */
  private async makeAIRequest(request: AIRequest): Promise<AIResponse> {
    await this.enforceRateLimit();

    try {
      let response: AxiosResponse;

      switch (this.provider.name.toLowerCase()) {
        case 'openai':
          response = await this.makeOpenAIRequest(request);
          break;
        case 'anthropic':
          response = await this.makeAnthropicRequest(request);
          break;
        default:
          throw new Error(
            `Unsupported AI provider: ${this.provider.name}. Only OpenAI and Anthropic are supported.`
          );
      }

      this.requestCount++;
      this.lastRequestTime = Date.now();

      return {
        extractedText: this.extractTextFromResponse(response.data),
        // confidence removed from schema
        rawResponse: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AIServiceError(
          `AI service request failed: ${error.response?.data?.error?.message || error.message}`,
          this.provider.name,
          error.response?.status
        );
      }
      throw error;
    }
  }

  /**
   * Make request to OpenAI API
   */
  private async makeOpenAIRequest(request: AIRequest): Promise<AxiosResponse> {
    return axios.post(
      `${this.provider.endpoint}/v1/chat/completions`,
      {
        model: request.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: request.prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${request.imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${this.provider.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Make request to Anthropic API
   */
  private async makeAnthropicRequest(request: AIRequest): Promise<AxiosResponse> {
    return axios.post(
      `${this.provider.endpoint}/v1/messages`,
      {
        model: request.model || 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: request.imageBase64,
                },
              },
              {
                type: 'text',
                text: request.prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'x-api-key': this.provider.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
      }
    );
  }

  /**
   * Create the prompt for extracting ranking data
   */
  private createExtractionPrompt(): string {
    return `
Analyze this screenshot from the mobile game "Last War" and extract the ranking information.

The screenshot shows a leaderboard/ranking table with the following columns:
- Rank (numerical ranking position)
- Commander Name (player name)
- Points (numerical score)

Please extract ALL visible ranking entries from the image and return ONLY the following JSON format:

{
  "rankings": [
    {
      "rank": 1,
      "commanderName": "PlayerName",
      "points": 12345
    }
  ]
}

Important guidelines:
1. Extract ALL visible entries, even if partially visible
2. If text is unclear, make your best guess but indicate uncertainty
3. Ensure rank numbers are sequential and logical
4. Points should be numerical values (remove any formatting like commas)
5. Commander names should be exact as shown
6. If you cannot read a value clearly, use null for that field
7. Return ONLY the JSON object, with NO explanation or additional text before or after
8. Format the JSON object correctly with no errors

Focus on accuracy and completeness. The data will be used for tracking weekly tournament progress.
    `.trim();
  }

  /**
   * Parse the AI response to extract ranking entries
   */
  private parseRankingResponse(responseText: string): RankingEntry[] {
    try {
      let parsedText = responseText.trim();

      // Try to find JSON in the response if the response is not already valid JSON
      try {
        JSON.parse(parsedText);
      } catch (e) {
        // Not valid JSON, extract JSON block
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        parsedText = jsonMatch[0];
      }

      const parsed = JSON.parse(parsedText);

      if (!parsed.rankings || !Array.isArray(parsed.rankings)) {
        throw new Error('Invalid response format: missing rankings array');
      }

      return parsed.rankings
        .map((entry: any, index: number) => {
          if (
            typeof entry.rank !== 'number' ||
            !entry.commanderName ||
            typeof entry.points !== 'number'
          ) {
            console.warn(`Invalid ranking entry at index ${index}:`, entry);
            return null;
          }

          return {
            rank: entry.rank,
            commanderName: entry.commanderName.toString(),
            points: entry.points,
          };
        })
        .filter(Boolean) as RankingEntry[];
    } catch (error) {
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract text content from different AI service responses
   */
  private extractTextFromResponse(responseData: any): string {
    switch (this.provider.name.toLowerCase()) {
      case 'openai':
        return responseData.choices?.[0]?.message?.content || '';
      case 'anthropic':
        return responseData.content?.[0]?.text || '';
      default:
        return responseData.text || responseData.content || '';
    }
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const minDelay = 1000; // 1 second minimum between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < minDelay) {
      const delay = minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; provider: string } {
    return {
      requestCount: this.requestCount,
      provider: this.provider.name,
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}
