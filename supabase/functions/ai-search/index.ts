import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, imageBase64, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get all data from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch solutions, installation guides, and upgrades in parallel
    const [solutionsResult, guidesResult, upgradesResult] = await Promise.all([
      supabase.from('solutions').select('*').order('created_at', { ascending: false }),
      supabase.from('installation_guides').select('*').order('created_at', { ascending: false }),
      supabase.from('upgrades').select('*').order('created_at', { ascending: false })
    ]);

    const solutions = solutionsResult.data || [];
    const guides = guidesResult.data || [];
    const upgrades = upgradesResult.data || [];

    if (solutions.length === 0 && guides.length === 0 && upgrades.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "No content has been added to the knowledge base yet. Add some solutions, installation guides, or upgrades first to enable AI-powered search.",
        relevantSolutions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create context from all sources
    const solutionsContext = solutions.map((s, i) => 
      `[Solution ${i + 1}]\nTitle: ${s.title}\nDescription: ${s.description}\nID: ${s.id}\nType: solution`
    ).join('\n\n');

    const guidesContext = guides.map((g, i) => 
      `[Installation Guide ${i + 1}]\nTitle: ${g.title}\nDescription: ${g.description}\nSteps: ${g.steps}\nID: ${g.id}\nType: installation_guide`
    ).join('\n\n');

    const upgradesContext = upgrades.map((u, i) => 
      `[Upgrade ${i + 1}]\nTitle: ${u.title}\nDescription: ${u.description}\nSteps: ${u.steps}\nID: ${u.id}\nType: upgrade`
    ).join('\n\n');

    const fullContext = [solutionsContext, guidesContext, upgradesContext].filter(Boolean).join('\n\n---\n\n');

    // Build conversation history for context
    const historyMessages = conversationHistory?.map((m: any) => ({
      role: m.role,
      content: m.content
    })) || [];

    // Build the user message content (with optional image)
    let userContent: any = query;
    if (imageBase64) {
      userContent = [
        { type: "text", text: query || "Please analyze this image and identify any errors or issues shown. Then provide solutions from the knowledge base." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }

    const systemPrompt = `You are RTLAI, a smart tech support assistant for RTL SnapSolve knowledge base. You help users solve problems, install software, and perform upgrades.

## Knowledge Base Content:

${fullContext}

## Response Rules:

1. **Context Awareness**: Pay close attention to the conversation history. When users ask follow-up questions, understand they're referencing previous topics. Never ask for clarification if the context is clear from earlier messages.

2. **Structured Responses**: Always format your answers as clear, actionable guides:
   - Use numbered steps (1, 2, 3...)
   - Add section headers when covering multiple topics
   - Use bullet points for lists of options or notes
   - Separate "Required Steps" from "Optional Steps"
   - Highlight warnings or important notes

3. **Response Style**:
   - Be direct and concise
   - Write for non-technical users
   - No markdown asterisks or special formatting
   - Maximum 200 words unless detailed steps are needed

4. **When Analyzing Images**:
   - Identify the error or issue shown
   - Provide the PRIMARY solution first with clear steps
   - Then provide ALTERNATIVE solutions in a separate section
   - Reference relevant solutions from the knowledge base

5. **Example Response Format**:
   "Issue Identified: [brief description]
   
   Primary Solution:
   1. First step here
   2. Second step here
   3. Third step here
   
   Alternative Solutions:
   - Option A: Brief description
   - Option B: Brief description
   
   Note: [Any important warnings or tips]"

6. **If no matching solution exists**:
   - Say so clearly
   - Suggest related topics if available
   - Ask for more details if needed

Format response as JSON:
{
  "answer": "Your structured response here",
  "relevantIds": ["id1", "id2"]
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userContent }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageBase64 ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI Response:", aiContent);

    // Parse the AI response
    let parsedResponse;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { answer: aiContent, relevantIds: [] };
      }
    } catch {
      parsedResponse = { answer: aiContent, relevantIds: [] };
    }

    // Get the relevant solutions (only from solutions table for highlighting)
    const relevantSolutions = solutions.filter(s => 
      parsedResponse.relevantIds?.includes(s.id)
    );

    return new Response(JSON.stringify({
      answer: parsedResponse.answer,
      relevantSolutions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error("Error in ai-search function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
