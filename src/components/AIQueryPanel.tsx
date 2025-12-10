import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, User, Bot, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";

interface Solution {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  relevantSolutions?: Solution[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface AIQueryPanelProps {
  onSelectSolution: (id: string) => void;
}

const AIQueryPanel = ({ onSelectSolution }: AIQueryPanelProps) => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const { user, isApproved } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations for authenticated users
  useEffect(() => {
    if (user && isApproved) {
      fetchConversations();
    }
  }, [user, isApproved]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const loadedMessages: Message[] = data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        relevantSolutions: m.relevant_solutions as unknown as Solution[] | undefined,
        timestamp: new Date(m.created_at),
      }));
      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setShowHistory(false);
    }
  };

  const createNewConversation = async () => {
    if (!user) {
      setMessages([]);
      setCurrentConversationId(null);
      return;
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: user.id,
        title: "New Conversation",
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentConversationId(data.id);
      setMessages([]);
      fetchConversations();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId);

    if (!error) {
      if (currentConversationId === conversationId) {
        handleNewConversation();
      }
      fetchConversations();
      toast({ title: "Conversation deleted" });
    }
  };

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    // Create conversation if authenticated and no current conversation
    let conversationId = currentConversationId;
    if (user && isApproved && !conversationId) {
      const { data } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? "..." : ""),
        })
        .select()
        .single();

      if (data) {
        conversationId = data.id;
        setCurrentConversationId(data.id);
        fetchConversations();
      }
    }

    // Save user message if authenticated
    if (user && isApproved && conversationId) {
      await supabase.from("ai_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: userMessage.content,
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { 
          query: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        relevantSolutions: data.relevantSolutions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message if authenticated
      if (user && isApproved && conversationId) {
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage.content,
          relevant_solutions: assistantMessage.relevantSolutions as unknown as any,
        });

        // Update conversation timestamp
        await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    } catch (error: any) {
      console.error('AI search error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-foreground">RTLAI</h3>
            <p className="text-xs text-muted-foreground">
              {messages.length > 0 
                ? `${messages.length} messages in conversation`
                : "Ask me anything about your solutions"
              }
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="animate-fade-in flex flex-col" style={{ height: '450px' }}>
          {/* Toolbar */}
          <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Chat
            </Button>
            {user && isApproved && (
              <Button
                variant={showHistory ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="h-8"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                History
              </Button>
            )}
          </div>

          {showHistory ? (
            /* Conversation History */
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No saved conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full p-3 text-left rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                        currentConversationId === conv.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => deleteConversation(conv.id, e)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          ) : (
            /* Chat Messages Area */
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
              <div className="py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Bot className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation by asking a question
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      e.g., "How do I fix the printer not connecting?"
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className={`flex flex-col max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>

                        {/* Relevant Solutions */}
                        {message.relevantSolutions && message.relevantSolutions.length > 0 && (
                          <div className="mt-2 w-full space-y-1.5">
                            <p className="text-xs text-muted-foreground px-1">Related solutions:</p>
                            {message.relevantSolutions.map((solution) => (
                              <button
                                key={solution.id}
                                onClick={() => onSelectSolution(solution.id)}
                                className="w-full p-2.5 text-left rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                              >
                                <p className="font-medium text-xs text-foreground">
                                  {solution.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {solution.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Timestamp */}
                        <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          {!showHistory && (
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="relative">
                <Textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="min-h-[48px] max-h-[120px] pr-12 resize-none rounded-xl"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIQueryPanel;
