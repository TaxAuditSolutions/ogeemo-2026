
import { ai } from '../src/ai/genkit';

async function listModels() {
    console.log("Listing models...");
    try {
        const models = await ai.listModels();
        console.log("Available Models:", JSON.stringify(models, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
