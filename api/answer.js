import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';  // Ensure node-fetch is installed
require('dotenv').config();


export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { context, question } = req.body;

      console.log("Processing request");

      // Fetch content from the URL
      const contentResponse = await fetch(`https://webpage-content-retriever.vercel.app/query?q=${context}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if the content type is JSON
      const contentType = contentResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await contentResponse.json();
        const content = jsonResponse.result || "No valid content found";

        // Initialize the Gemini API
        console.log(`API KEY = ${process.env.GEMINI_API_KEY}`)
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = gemini.getGenerativeModel({ model: 'gemini-pro' });

        // Start a conversation with the Gemini API
        const conversation = await model.startChat({
          history: [
            { role: 'user', parts: [`Content: ${content}`] },
            { role: 'user', parts: ["Put all your answers to the following questions in this format: ALOHA{answer 1;;; answer 2;;; etc}. Your responses will be separated by a script using this format, so don't deviate from it. Each answer will be shown to the user directly, so any formatting (such as newlines) will be extremely confusing."] },
            { role: 'user', parts: [question] }
          ],
          generationConfig: { maxOutputTokens: 300 },
        });

        // Get the result and return the answer
        const result = await conversation.sendMessage(question);
        const responseText = result?.response?.text() || "No response text";

        res.status(200).json({ answer: responseText });
      } else {
        const textResponse = await contentResponse.text();
        res.status(500).json({ error: "Received non-JSON response", details: textResponse });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process the request" });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
