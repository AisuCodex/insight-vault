import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = "Search solutions..." }: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 pl-12 pr-10 rounded-xl bg-muted/50 border-transparent focus:border-primary/50 focus:bg-background transition-all duration-200"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-background"
          onClick={() => onChange("")}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default SearchBar;
