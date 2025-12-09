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
    const { query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get all solutions from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: solutions, error: dbError } = await supabase
      .from('solutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to fetch solutions");
    }

    if (!solutions || solutions.length === 0) {
      return new Response(JSON.stringify({ 
        answer: "No solutions have been added to the knowledge base yet. Add some solutions first to enable AI-powered search.",
        relevantSolutions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create context from solutions
    const solutionsContext = solutions.map((s, i) => 
      `[Solution ${i + 1}]\nTitle: ${s.title}\nDescription: ${s.description}\nID: ${s.id}`
    ).join('\n\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are RTLAI, a friendly tech support assistant for RTL SnapSolve knowledge base. Your job is to help users fix problems using simple, easy-to-follow steps.

Available solutions in the database:

${solutionsContext}

## Response Rules:

1. Find the best matching solution based on what the user asked.

2. When giving steps, follow this format:
   - Keep it SHORT and SIMPLE
   - Use numbered steps (1, 2, 3...)
   - Write like you're talking to someone who isn't tech-savvy
   - NO asterisks (*) or markdown formatting
   - Use plain, everyday words

3. Example response style:
   "Here's how to fix your license error:
   1. Close the program completely
   2. Go to Settings, then click License
   3. Click the Refresh button
   4. Wait 10 seconds and try again
   That should do it! Let me know if it works."

4. Be friendly and direct:
   - If you need more info, just ask
   - Keep answers under 150 words when possible
   - Always mention which solution you're using

5. If no solution matches:
   - Say so nicely
   - Ask for more details

Format response as JSON:
{
  "answer": "Your simple, friendly response here",
  "relevantIds": ["id1", "id2"]
}`
          },
          { role: "user", content: query }
        ],
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

    // Get the relevant solutions
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
