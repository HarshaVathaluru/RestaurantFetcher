const { GoogleGenerativeAI } = require('./server/node_modules/@google/generative-ai');
const dotenv = require('./server/node_modules/dotenv');
dotenv.config({ path: './server/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.8-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
});

async function test() {
  try {
    const res = await model.generateContent('Return JSON: {"success": true}');
    console.log('SUCCESS! Response text:', res.response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
