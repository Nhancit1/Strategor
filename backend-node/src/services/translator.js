import axios from 'axios';

/**
 * Translate a structured report JSON object using DeepSeek API
 * while keeping all JSON keys, types, and array structures identical.
 */
export async function translatePayload(payload, fromLang = 'fr', toLang = 'en') {
  if (!payload) return null;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('[Translator] DEEPSEEK_API_KEY not set. Skipping translation.');
    return payload;
  }

  const sourceName = fromLang.toLowerCase().startsWith('en') ? 'English' : 'French';
  const targetName = toLang.toLowerCase().startsWith('en') ? 'English' : 'French';

  const systemPrompt = `You are a professional business translator. 
You must translate the given JSON object representing a strategic analysis report from ${sourceName} to ${targetName}.
RULES:
1. Translate only the string values (e.g. descriptions, initiatives, rationale, SWOT points).
2. Do NOT translate any JSON keys under any circumstances (e.g., 'strategic_axes', 'initiatives', 'title', 'description', 'swot', 'recommendations'). Keep all JSON keys exactly the same as in the input.
3. Keep the exact same JSON structure, types, array lengths, and formatting.
4. Return ONLY the translated JSON object. Do not include markdown formatting or conversational filler text.`;

  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(payload) }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const translatedStr = response.data.choices[0].message.content;
    const translatedPayload = JSON.parse(translatedStr);
    return translatedPayload;
  } catch (error) {
    console.error('[Translator] DeepSeek translation failed:', error.message);
    // Return original payload on failure so app doesn't break
    return payload;
  }
}

/**
 * Check if the execution language matches the target language.
 * If not, check cached translations, or fetch one from DeepSeek and save it.
 */
export async function translateExecutionIfNeeded(exec, targetLang) {
  if (!exec || exec.status !== 'DONE' || !exec.output) {
    return exec;
  }

  const originLang = exec.lang || 'fr';
  const target = targetLang || 'fr';

  // Check if they are in the same language group (e.g. both start with 'en' or both start with 'fr')
  const originIsEn = originLang.toLowerCase().startsWith('en');
  const targetIsEn = target.toLowerCase().startsWith('en');

  if (originIsEn === targetIsEn) {
    // Language matches original generation, return document
    return exec;
  }

  const langKey = targetIsEn ? 'en' : 'fr';

  // Initialize translations map if not present
  if (!exec.translations) {
    exec.translations = {};
  }

  // If cached translation exists, use it
  if (exec.translations[langKey]) {
    const cached = exec.translations[langKey];
    // Return a plain object clone with translated outputs
    const clone = typeof exec.toJSON === 'function' ? exec.toJSON() : JSON.parse(JSON.stringify(exec));
    clone.output = cached.output || clone.output;
    if (clone.editedOutput) {
      clone.editedOutput = cached.editedOutput || clone.editedOutput;
    }
    return clone;
  }

  // Otherwise, perform translate
  console.log(`[Translator] Dynamic translation needed for Agent ${exec.agentId} from ${originLang} to ${langKey}`);
  
  const translatedOutput = await translatePayload(exec.output, originLang, langKey);
  let translatedEditedOutput = null;
  if (exec.editedOutput) {
    translatedEditedOutput = await translatePayload(exec.editedOutput, originLang, langKey);
  }

  // Cache back to database
  exec.translations = {
    ...exec.translations,
    [langKey]: {
      output: translatedOutput,
      editedOutput: translatedEditedOutput
    }
  };
  exec.markModified('translations');
  await exec.save();

  // Return translated plain object
  const clone = typeof exec.toJSON === 'function' ? exec.toJSON() : JSON.parse(JSON.stringify(exec));
  clone.output = translatedOutput;
  if (clone.editedOutput) {
    clone.editedOutput = translatedEditedOutput;
  }
  return clone;
}
