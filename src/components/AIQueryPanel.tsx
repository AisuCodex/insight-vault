import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, User, Bot, Plus, MessageSquare, Trash2, Image, X } from "lucide-react";
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
  imageUrl?: string;
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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { toast } = useToast();
  const { user, isApproved } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
    setUploadedImage(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      // Convert to base64 for AI analysis
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to process image.",
        variant: "destructive",
      });
      setIsUploadingImage(false);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if ((!query.trim() && !uploadedImage) || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: query.trim() || "Please analyze this image",
      imageUrl: uploadedImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    const currentImage = uploadedImage;
    setUploadedImage(null);
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
          imageBase64: currentImage,
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

  // Format AI response with proper sections
  const formatResponse = (content: string) => {
    // Split by common section markers
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Check for numbered steps
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={index} className="flex gap-2 my-1">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              {line.trim().match(/^(\d+)/)?.[1]}
            </span>
            <span>{line.trim().replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      }
      // Check for section headers (lines ending with :)
      if (line.trim().endsWith(':') && line.trim().length < 50) {
        return (
          <h4 key={index} className="font-semibold text-foreground mt-3 mb-1">
            {line.trim()}
          </h4>
        );
      }
      // Check for bullet points
      if (/^[-•]\s/.test(line.trim())) {
        return (
          <div key={index} className="flex gap-2 my-0.5 pl-2">
            <span className="text-primary">•</span>
            <span>{line.trim().replace(/^[-•]\s*/, '')}</span>
          </div>
        );
      }
      // Regular text
      if (line.trim()) {
        return <p key={index} className="my-1">{line}</p>;
      }
      return <div key={index} className="h-2" />;
    });
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
                : "Ask me anything or upload an image to analyze"
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
        <div className="animate-fade-in flex flex-col" style={{ height: '500px' }}>
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
                      You can also upload error screenshots for analysis
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
                      <div className={`flex flex-col max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {/* User uploaded image */}
                        {message.imageUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden max-w-[200px]">
                            <img 
                              src={message.imageUrl} 
                              alt="Uploaded" 
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                        
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        }`}>
                          {message.role === 'assistant' ? (
                            <div className="text-sm leading-relaxed">
                              {formatResponse(message.content)}
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
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
              {/* Image Preview */}
              {uploadedImage && (
                <div className="mb-3 relative inline-block">
                  <img 
                    src={uploadedImage} 
                    alt="Upload preview" 
                    className="h-20 w-auto rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removeUploadedImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="relative flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[48px] w-[48px] flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4" />
                  )}
                </Button>
                <div className="relative flex-1">
                  <Textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={uploadedImage ? "Describe what you want to analyze..." : "Type your message..."}
                    className="min-h-[48px] max-h-[120px] pr-12 resize-none rounded-xl"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={(!query.trim() && !uploadedImage) || isLoading}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIQueryPanel;
