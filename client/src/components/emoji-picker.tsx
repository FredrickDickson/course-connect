import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const COMMON_EMOJIS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "💯", label: "100" },
  { emoji: "✨", label: "Sparkles" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🙌", label: "Praise" },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-4 gap-2">
          {COMMON_EMOJIS.map((item) => (
            <button
              key={item.emoji}
              onClick={() => {
                onSelect(item.emoji);
                setIsOpen(false);
              }}
              className="text-2xl hover:bg-muted p-2 rounded transition-colors"
              title={item.label}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
