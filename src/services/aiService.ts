import { pipeline } from '@huggingface/transformers';

class AIService {
  private precautionPipeline: any = null;
  private storyPipeline: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize lightweight text generation pipeline
      console.log('Initializing AI models...');
      
      // Use a lightweight model that works well in browsers
      this.precautionPipeline = await pipeline(
        'text-generation',
        'onnx-community/gpt2',
        { device: 'webgpu' }
      );
      
      this.storyPipeline = await pipeline(
        'text-generation', 
        'onnx-community/gpt2',
        { device: 'webgpu' }
      );
      
      this.isInitialized = true;
      console.log('AI models initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize WebGPU models, falling back to CPU:', error);
      // Fallback to CPU if WebGPU fails
      try {
        this.precautionPipeline = await pipeline('text-generation', 'onnx-community/gpt2');
        this.storyPipeline = await pipeline('text-generation', 'onnx-community/gpt2');
        this.isInitialized = true;
      } catch (fallbackError) {
        console.error('Failed to initialize AI models:', fallbackError);
        // Use mock responses if models fail to load
        this.isInitialized = false;
      }
    }
  }

  async generatePrecautions(disaster: string, location: string): Promise<string[]> {
    if (!this.isInitialized || !this.precautionPipeline) {
      await this.initialize();
    }
    
    if (!this.precautionPipeline) {
      // Return fallback precautions
      return this.getFallbackPrecautions(disaster);
    }

    try {
      const prompt = `Essential safety precautions for ${disaster} in ${location}:\n1.`;
      
      const result = await this.precautionPipeline(prompt, {
        max_new_tokens: 150,
        temperature: 0.7,
        do_sample: true,
        num_return_sequences: 1
      });

      const generated = Array.isArray(result) ? result[0].generated_text : result.generated_text;
      const precautions = this.extractPrecautions(generated, prompt);
      
      return precautions.length > 0 ? precautions : this.getFallbackPrecautions(disaster);
    } catch (error) {
      console.error('Error generating precautions:', error);
      return this.getFallbackPrecautions(disaster);
    }
  }

  async generateStory(disaster: string, location: string): Promise<string> {
    if (!this.isInitialized || !this.storyPipeline) {
      await this.initialize();
    }
    
    if (!this.storyPipeline) {
      return this.getFallbackStory(disaster, location);
    }

    try {
      const prompt = `A survivor's story: During the ${disaster} in ${location}, people escaped by`;
      
      const result = await this.storyPipeline(prompt, {
        max_new_tokens: 200,
        temperature: 0.8,
        do_sample: true,
        num_return_sequences: 1
      });

      const generated = Array.isArray(result) ? result[0].generated_text : result.generated_text;
      const story = generated.replace(prompt, '').trim();
      
      return story || this.getFallbackStory(disaster, location);
    } catch (error) {
      console.error('Error generating story:', error);
      return this.getFallbackStory(disaster, location);
    }
  }

  private extractPrecautions(text: string, prompt: string): string[] {
    const content = text.replace(prompt, '').trim();
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    const precautions: string[] = [];
    lines.forEach(line => {
      const cleaned = line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        precautions.push(cleaned);
      }
    });
    
    return precautions.slice(0, 5);
  }

  private getFallbackPrecautions(disaster: string): string[] {
    const fallbacks: { [key: string]: string[] } = {
      flood: [
        "Move to higher ground immediately",
        "Avoid walking or driving through flood waters",
        "Keep emergency supplies and important documents ready",
        "Stay informed through official weather alerts",
        "Turn off electricity and gas if advised"
      ],
      earthquake: [
        "Drop, Cover, and Hold On during shaking",
        "Stay away from windows and heavy objects",
        "Have an emergency kit with food and water",
        "Know your evacuation routes",
        "Secure heavy furniture to walls"
      ],
      cyclone: [
        "Stay indoors and away from windows",
        "Stock up on food, water, and batteries",
        "Secure outdoor objects that could become projectiles",
        "Follow evacuation orders if issued",
        "Avoid using electrical appliances during the storm"
      ],
      heatwave: [
        "Stay indoors during peak heat hours",
        "Drink plenty of water regularly",
        "Wear lightweight, light-colored clothing",
        "Use fans or air conditioning if available",
        "Check on elderly neighbors and relatives"
      ],
      tsunami: [
        "Move to higher ground or inland immediately",
        "Do not wait for official warnings if you feel an earthquake",
        "Stay away from beaches and coastal areas",
        "Listen to emergency broadcasts",
        "Do not return until authorities declare it safe"
      ]
    };
    
    return fallbacks[disaster.toLowerCase()] || fallbacks.flood;
  }

  private getFallbackStory(disaster: string, location: string): string {
    const stories: { [key: string]: string } = {
      flood: `During the devastating floods in ${location}, residents helped each other by forming human chains to evacuate elderly people. They used boats and makeshift rafts to rescue families trapped on rooftops. The community center became a safe haven where everyone shared food and supplies while waiting for rescue teams.`,
      earthquake: `When the earthquake struck ${location}, quick-thinking residents immediately took cover under sturdy desks and tables. After the shaking stopped, they carefully evacuated buildings and gathered in open areas. Neighbors helped locate missing people and provided first aid to the injured until emergency services arrived.`,
      cyclone: `As the cyclone approached ${location}, families secured their homes and moved to designated shelter areas. They brought essential supplies and helped elderly residents reach safety. Throughout the storm, people stayed together, sharing resources and keeping spirits up until the danger passed.`,
      heatwave: `During the extreme heatwave in ${location}, communities opened cooling centers and distributed water to vulnerable residents. People checked on their neighbors regularly and shared ice and cool drinks. Many lives were saved through collective care and early warning systems.`,
      tsunami: `When the tsunami warning sounded in ${location}, residents immediately moved to higher ground. Local fishermen used their knowledge to guide tourists to safety. The quick evacuation and community cooperation helped minimize casualties as everyone worked together to reach designated safe zones.`
    };
    
    return stories[disaster.toLowerCase()] || stories.flood;
  }
}

export const aiService = new AIService();