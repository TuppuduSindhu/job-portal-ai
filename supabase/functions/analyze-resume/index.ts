import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, filePath } = await req.json();
    if (!userId || !filePath) {
      return new Response(JSON.stringify({ error: "Missing userId or filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download the resume PDF
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("resumes")
      .download(filePath);

    if (downloadErr || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download resume" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from PDF (basic extraction)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const text = extractTextFromPdf(bytes);

    // Send to AI for skill extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You extract skills from resumes. Return ONLY a JSON array of skill strings. Focus on technical skills, programming languages, frameworks, tools, and soft skills. Return 10-20 most relevant skills.",
          },
          {
            role: "user",
            content: `Extract skills from this resume text:\n\n${text.slice(0, 8000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_skills",
              description: "Extract skills from resume text",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of skills found in the resume",
                  },
                },
                required: ["skills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_skills" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let skills: string[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        skills = parsed.skills || [];
      } catch {
        skills = [];
      }
    }

    // Update profile with detected skills
    await supabase
      .from("profiles")
      .update({ skills })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ skills }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Basic PDF text extraction (handles simple text-based PDFs)
function extractTextFromPdf(bytes: Uint8Array): string {
  const text: string[] = [];
  const str = new TextDecoder("latin1").decode(bytes);
  
  // Find all text streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  
  while ((match = streamRegex.exec(str)) !== null) {
    const content = match[1];
    // Extract text between parentheses (Tj operator) and brackets (TJ operator)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(content)) !== null) {
      text.push(tjMatch[1]);
    }
    
    // Extract text from TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(content)) !== null) {
      const inner = arrMatch[1];
      const parts = inner.match(/\(([^)]*)\)/g);
      if (parts) {
        text.push(parts.map(p => p.slice(1, -1)).join(''));
      }
    }
  }
  
  const extracted = text.join(' ').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
  
  // If we couldn't extract much, try a simpler approach
  if (extracted.length < 50) {
    const simpleText: string[] = [];
    const lines = str.split('\n');
    for (const line of lines) {
      const matches = line.match(/\(([^)]{2,})\)/g);
      if (matches) {
        simpleText.push(...matches.map(m => m.slice(1, -1)));
      }
    }
    return simpleText.join(' ').replace(/\s+/g, ' ').trim() || extracted;
  }
  
  return extracted;
}
