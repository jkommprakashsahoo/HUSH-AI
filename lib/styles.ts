import { HushStyle, StyleOption, SuggestionChip } from '@/types/chat';

export const HUSH_STYLES: StyleOption[] = [
  {
    id: 'quick-fix',
    label: 'Quick Fix',
    tagline: 'Direct & actionable',
    description: 'Concise, immediate answers. Cuts fluff, delivers instant solutions.',
    icon: 'Zap',
  },
  {
    id: 'explain-it',
    label: 'Explain It',
    tagline: 'Clear & structured',
    description: 'Accessible, step-by-step explanations with useful examples.',
    icon: 'BookOpen',
  },
  {
    id: 'think-with-me',
    label: 'Think With Me',
    tagline: 'Collaborative & open',
    description: 'Collaborative exploration and structured thinking partner.',
    icon: 'Compass',
  },
  {
    id: 'challenge-me',
    label: 'Challenge Me',
    tagline: 'Analytical & rigorous',
    description: 'Thoughtful counterarguments, critical evaluation, and examining assumptions.',
    icon: 'Flame',
  },
];

export const VALID_STYLES: HushStyle[] = [
  'quick-fix',
  'explain-it',
  'think-with-me',
  'challenge-me',
];

export const LANDING_SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    id: 'explain',
    title: 'Explain something',
    prompt: 'Can you explain how quantum computing works and why it matters in simple terms?',
    style: 'explain-it',
  },
  {
    id: 'decide',
    title: 'Help me decide',
    prompt: 'I need to make a tough decision between two paths. Can you help me weigh the trade-offs and clarify my thinking?',
    style: 'think-with-me',
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm with me',
    prompt: "Let's brainstorm unique, practical project ideas that solve an everyday annoyance.",
    style: 'think-with-me',
  },
  {
    id: 'talk',
    title: 'Just talk',
    prompt: "I have a lot on my mind today. I'd like a calm space to reflect on what's going on.",
    style: 'think-with-me',
  },
];

export function isValidStyle(style: unknown): style is HushStyle {
  return typeof style === 'string' && VALID_STYLES.includes(style as HushStyle);
}

export function getStyleInstruction(style: HushStyle): string {
  switch (style) {
    case 'quick-fix':
      return [
        'You are Hush, a calm, anonymous AI companion running locally on private hardware.',
        'Active Conversation Style: [Quick Fix].',
        'Directives:',
        '- Be concise, direct, and actionable.',
        '- Deliver the answer or immediate next step right at the beginning.',
        '- Keep paragraphs short (1-3 sentences max) or use clean bulleted action items.',
        '- Avoid lengthy preambles, disclaimers, or excessive sign-offs.',
      ].join('\n');

    case 'explain-it':
      return [
        'You are Hush, a calm, anonymous AI companion running locally on private hardware.',
        'Active Conversation Style: [Explain It].',
        'Directives:',
        '- Provide accessible, step-by-step explanations with useful analogies and examples.',
        '- Structure your response with clear headings or numbered steps for readability.',
        '- Clarify the fundamental "why" before diving into technical or nuanced details.',
        '- Maintain an encouraging, patient, and educational demeanor.',
      ].join('\n');

    case 'think-with-me':
      return [
        'You are Hush, a calm, anonymous AI companion running locally on private hardware.',
        'Active Conversation Style: [Think With Me].',
        'Directives:',
        '- Act as a collaborative thought partner for exploration and structured thinking.',
        '- Unpack nuances, weigh trade-offs, and consider multiple valid perspectives.',
        '- Ask 1 or 2 targeted, reflective guiding questions to help the user uncover clarity.',
        '- Maintain a warm, grounded, and non-judgmental tone.',
      ].join('\n');

    case 'challenge-me':
      return [
        'You are Hush, a calm, anonymous AI companion running locally on private hardware.',
        'Active Conversation Style: [Challenge Me].',
        'Directives:',
        '- Act as a constructive devil\'s advocate and analytical critical thinker.',
        '- Respectfully challenge unstated assumptions, blind spots, and optimistic biases.',
        '- Stress-test the user\'s reasoning with realistic edge cases, counterarguments, and trade-offs.',
        '- Remain intellectually honest, rigorous, and supportive of finding the truth.',
      ].join('\n');

    default:
      return getStyleInstruction('quick-fix');
  }
}

export interface ContextualAction {
  id: string;
  label: string;
  prompt: (originalAnswer: string) => string;
  styleChange?: HushStyle;
}

export const CONTEXTUAL_ANSWER_ACTIONS: ContextualAction[] = [
  {
    id: 'go-deeper',
    label: 'Go deeper',
    prompt: () => 'Can you dig deeper into this specific point and elaborate on the core nuances and mechanics?',
  },
  {
    id: 'explain-simply',
    label: 'Explain simply',
    prompt: () => 'Can you break this down in simpler terms with a clear, everyday analogy?',
    styleChange: 'explain-it',
  },
  {
    id: 'challenge-this',
    label: 'Challenge this idea',
    prompt: () => 'What are the strongest counterarguments, hidden risks, or unstated assumptions in this answer?',
    styleChange: 'challenge-me',
  },
  {
    id: 'turn-into-plan',
    label: 'Turn into a plan',
    prompt: () => 'Can you convert this insight into an actionable, step-by-step implementation plan with milestones and concrete tasks?',
    styleChange: 'quick-fix',
  },
];
