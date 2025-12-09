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
            content: `You are an expert technical support assistant for a software solutions knowledge base. Your role is to help users solve problems by providing detailed, actionable guidance based on stored solutions.

Here are all the available solutions in the knowledge base:

${solutionsContext}

## Your Response Guidelines:

1. **Identify the most relevant solution(s)** based on the user's question, keywords, and context.

2. **Generate a comprehensive step-by-step guide** when a user asks about a specific problem:
   - Start with a brief overview of the issue and solution
   - Break down the solution into clear, numbered steps
   - Expand on any brief descriptions with practical details
   - Include any prerequisites or warnings if applicable
   - Add troubleshooting tips if the solution might have common pitfalls

3. **Be conversational and helpful**:
   - If you need more details to provide accurate help, ask clarifying questions
   - If multiple solutions could apply, briefly explain each and ask which situation matches
   - Always reference the solution title(s) you're basing your guide on

4. **If no matching solution exists**:
   - Politely explain that no stored solution matches
   - Suggest what type of solution might help
   - Offer to help if the user can provide more context

Format your response as JSON with this structure:
{
  "answer": "Your detailed step-by-step guide or helpful response here",
  "relevantIds": ["id1", "id2"] // Array of solution IDs that are relevant, max 5
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
