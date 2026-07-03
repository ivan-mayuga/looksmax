const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
  override: true,
});

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function ensureApiKey() {
  if (
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== "" &&
    process.env.GEMINI_API_KEY !== "your_gemini_key_here"
  ) {
    return null;
  }

  return {
    success: false,
    error: "GEMINI_API_KEY is not set on the backend.",
  };
}

// =====================
// FILE UPLOAD
// =====================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP allowed."));
    }
    cb(null, true);
  },
});

function uploadFaceImage(req, res, next) {
  upload.single("faceImage")(req, res, (err) => {
    if (!err) return next();

    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    res.status(status).json({
      success: false,
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "Image must be under 4MB."
          : err.message,
    });
  });
}

// =====================
// PROMPT
// =====================
function buildSystemPrompt() {
return `
You are Violet Looksmax AI, an expert facial harmony analyst and looksmax coach.

Give fast, objective facial feedback in plain, natural-sounding text. No markdown symbols like #, no asterisks — just clear labeled sections as shown below.

RULES:
- Total response must be 100 to 140 words.
- Only mention the most noticeable strengths and weaknesses.
- Only analyze clearly visible features. Never invent or guess.
- Never assume ethnicity, age, personality, health, or lifestyle.
- Be honest, direct, and avoid filler or empty compliments.
- Only suggest high-impact improvements (hairstyle, jawline, eyebrows, skincare, beard, makeup, orthodontics if visible). Never suggest surgery unless truly necessary. Avoid generic advice like "drink water" or "be confident."

FORMAT (follow this exact structure and spacing):

Overall: Write 1-2 flowing sentences describing the overall facial harmony and impression, in warm natural language (not clinical or robotic).

Strengths: Write 1-2 flowing sentences naming the top visible strengths, woven into natural sentences rather than a list.

(leave one blank line here)

Improve: List the top 1-3 improvement suggestions as short bullet points, one per line, starting with a dash.

(leave one blank line here)

Tier: One word or short phrase only — Below Average, Average, Above Average, Attractive, or Very Attractive.

Keep the tone conversational and genuine, like a friend giving honest feedback. Stay within 70 to 100 words total.

EXAMPLE OUTPUT:

Overall: This face showcases excellent harmony and balance, featuring soft yet defined characteristics that blend beautifully. The overall impression is bright and attractive.

Strengths: Prominent strengths include exceptionally clear, radiant skin and naturally full, well-shaped lips. The visible eyes and charming dimples add appeal.

Improve:
- Experimenting with a slightly different fringe style could enhance facial openness
- Slightly more defined brows could sharpen the overall look

Tier: Very Attractive
`;
}

// =====================
// ROUTES
// =====================
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/analyze", uploadFaceImage, async (req, res) => {
  const keyError = ensureApiKey();

  if (keyError) {
    return res.status(500).json(keyError);
  }

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
${buildSystemPrompt()}

Analyze this face image carefully.

Only describe features that are actually visible.
Do not guess.
Do not assume age, ethnicity, or health conditions.
`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text;

    return res.json({
      success: true,
      result: text || "No response returned.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});