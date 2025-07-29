const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Resume = require('../models/Resume');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

router.post('/upload-resume', upload.single('resume'), async (req, res) => {
  const email = req.body.email;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const pdfData = await pdfParse(req.file.buffer);
    let resumeText = pdfData.text.trim();

    const MAX_TEXT_LENGTH = 10000;
    if (resumeText.length > MAX_TEXT_LENGTH) {
      resumeText = resumeText.slice(0, MAX_TEXT_LENGTH);
    }

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = `
Here is a resume:
------------------
${resumeText}

From the above resume, extract and return ONLY the following in JSON format:
{
  "name": "Full Name",
  "summary": "Brief summary about the candidate",
  "skills": ["skill1", "skill2", "..."],
  "academic": ["10th: marks or CGPA", "12th: marks or CGPA", "UG/PG: Degree with CGPA/Percentage"]
}

Important:
- Use numeric format: "10th" instead of "X", and "12th" instead of "XII".
- Only return valid JSON. No explanation. No markdown or code blocks.
- only numbers without text like percentage
`.trim();


    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiText = response.text().trim();

    // Remove code formatting
    aiText = aiText.replace(/```json|```/gi, '').trim();
    aiText = aiText.replace(/^\s*json\s*/i, '');

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (err) {
      console.error("Failed to parse AI response:", aiText);
      return res.status(500).json({ error: 'AI returned invalid JSON', raw: aiText });
    }

    const resumeData = {
      email,
      name: parsed.name || '',
      skills: parsed.skills || [],
      summary: parsed.summary || '',
      academic: parsed.academic || []
    };

    const saved = await Resume.findOneAndUpdate(
      { email },
      resumeData,
      { upsert: true, new: true }
    );

    res.json(saved);
  } catch (err) {
    console.error("Error during resume upload:", err.message);
    res.status(500).json({ error: 'Resume processing failed' });
  }
});

router.get('/resume/:email', async (req, res) => {
  try {
    const resume = await Resume.findOne({ email: req.params.email });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching resume' });
  }
});

module.exports = router;
