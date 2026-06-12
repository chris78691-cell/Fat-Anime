// Thin REST wrapper around the Gemini API (no SDK — one endpoint, keep it light).

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function call(model, body, apiKey) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }
  return res.json();
}

/** Image-to-image edit. Returns { data (base64), mimeType }. */
export async function geminiImageEdit({ apiKey, model, prompt, imageBase64, mimeType, imageSize }) {
  const data = await call(model, {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { imageSize },
    },
  }, apiKey);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    const reason = data.promptFeedback?.blockReason
      || data.candidates?.[0]?.finishReason
      || "no image in response";
    throw new Error(`Gemini returned no image (${reason})`);
  }
  return { data: img.inlineData.data, mimeType: img.inlineData.mimeType || "image/png" };
}

/** Fast yes/no: is this an anime/cartoon-style illustration (not a real photo)? */
export async function isAnimeImage({ apiKey, model, imageBase64, mimeType }) {
  const data = await call(model, {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: "Reply with exactly one word, yes or no: is this image an anime, manga or cartoon-style illustration (not a photograph of real people)?" },
      ],
    }],
  }, apiKey);
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "").join(" ").toLowerCase();
  return text.includes("yes");
}
