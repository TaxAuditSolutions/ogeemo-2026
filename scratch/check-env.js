
console.log("--- AI KEY DIAGNOSTIC ---");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? `PRESENT (Prefix: ${process.env.GEMINI_API_KEY.substring(0, 5)})` : "MISSING");
console.log("NEXT_PUBLIC_GEMINI_API_KEY:", process.env.NEXT_PUBLIC_GEMINI_API_KEY ? `PRESENT (Prefix: ${process.env.NEXT_PUBLIC_GEMINI_API_KEY.substring(0, 5)})` : "MISSING");

const rawKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const apiKey = rawKey?.replace(/^["']|["']$/g, '');
console.log("CLEANED apiKey:", apiKey ? `PRESENT (Prefix: ${apiKey.substring(0, 5)})` : "MISSING");

if (apiKey && apiKey.includes('"')) {
    console.log("WARNING: apiKey still contains quotes!");
}
console.log("--- END DIAGNOSTIC ---");
