'use client';

import { HushStyle } from '@/types/chat';
import { HUSH_STYLES } from '@/lib/styles';
import { Zap, BookOpen, Compass, Flame } from 'lucide-react';

interface StyleSelectorProps {
  currentStyle: HushStyle;
  onSelectStyle: (style: HushStyle) => void;
  compact?: boolean;
}

export function StyleSelector({
  currentStyle,
  onSelectStyle,
  compact = false,
}: StyleSelectorProps) {
  const getIcon = (iconName: string, active: boolean) => {
    const className = `w-3.5 h-3.5 ${active ? 'text-hush-violet' : 'text-hush-textMuted'}`;
    switch (iconName) {
      case 'Zap':
        return <Zap className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Compass':
        return <Compass className={className} />;
      case 'Flame':
      default:
        return <Flame className={className} />;
    }
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-hush-surface border border-hush-border rounded-xl">
      {HUSH_STYLES.map((style) => {
        const isActive = currentStyle === style.id;
        return (
          <button
            key={style.id}
            type="button"
            onClick={() => onSelectStyle(style.id)}
            title={`${style.label}: ${style.description}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-hush-surfaceElevated text-hush-textPrimary shadow-sm border border-hush-borderLight'
                : 'text-hush-textMuted hover:text-hush-textSecondary hover:bg-hush-surfaceSecondary/50'
            }`}
          >
            {getIcon(style.icon, isActive)}
            <span>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
}

