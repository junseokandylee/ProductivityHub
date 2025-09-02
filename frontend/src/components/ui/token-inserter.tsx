'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, Hash } from 'lucide-react';
import { COMMON_TOKENS, insertTokenAtCursor } from '@/lib/utils/template';

interface TokenInserterProps {
  onInsertToken: (token: string, newText: string, newCursorPosition: number) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  availableTokens?: string[];
  className?: string;
}

export function TokenInserter({ 
  onInsertToken, 
  textareaRef, 
  availableTokens,
  className = "" 
}: TokenInserterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTokenInsert = (tokenName: string) => {
    if (!textareaRef?.current) return;
    
    const result = insertTokenAtCursor(textareaRef.current, tokenName);
    onInsertToken(tokenName, result.newText, result.newCursorPosition);
    setIsOpen(false);
  };

  const commonTokensToShow = COMMON_TOKENS.filter(token => 
    !availableTokens || availableTokens.includes(token.name)
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-1 ${className}`}
        >
          <Plus className="h-3 w-3" />
          변수 삽입
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <div className="px-2 py-1">
          <p className="text-xs font-medium text-gray-500">개인화 변수</p>
          <p className="text-xs text-gray-400">클릭하여 메시지에 삽입</p>
        </div>
        <DropdownMenuSeparator />
        
        {commonTokensToShow.map((token) => (
          <DropdownMenuItem 
            key={token.name}
            onClick={() => handleTokenInsert(token.name)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 w-full">
              <Hash className="h-3 w-3 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">{token.label}</div>
                <div className="text-xs text-gray-500">{token.description}</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {`{${token.name}}`}
              </Badge>
            </div>
          </DropdownMenuItem>
        ))}
        
        {commonTokensToShow.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-gray-500">
            사용 가능한 변수가 없습니다
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}