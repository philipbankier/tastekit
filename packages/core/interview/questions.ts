/**
 * Interview questions for different onboarding depths
 */

export interface Question {
  id: string;
  category: string;
  text: string;
  type: 'text' | 'choice' | 'multi-choice' | 'scale';
  required: boolean;
  depth: 'quick' | 'guided' | 'operator';
  choices?: string[];
}

export const ONBOARDING_QUESTIONS: Question[] = [
  // Quick depth - essential questions only
  {
    id: 'primary_goal',
    category: 'goals',
    text: 'What is your primary goal for using agents?',
    type: 'text',
    required: true,
    depth: 'quick',
  },
  {
    id: 'autonomy_level',
    category: 'tradeoffs',
    text: 'How autonomous should agents be?',
    type: 'choice',
    required: true,
    depth: 'quick',
    choices: [
      'Always ask for approval',
      'Ask for major decisions',
      'Mostly autonomous',
    ],
  },
  
  // Guided depth - comprehensive questions
  {
    id: 'key_principles',
    category: 'goals',
    text: 'What are your top 3 guiding principles?',
    type: 'text',
    required: true,
    depth: 'guided',
  },
  {
    id: 'voice_keywords',
    category: 'tone',
    text: 'Select keywords that describe your preferred communication style:',
    type: 'multi-choice',
    required: false,
    depth: 'guided',
    choices: [
      'professional',
      'casual',
      'technical',
      'friendly',
      'concise',
      'detailed',
      'formal',
      'creative',
    ],
  },
  {
    id: 'accuracy_vs_speed',
    category: 'tradeoffs',
    text: 'Accuracy vs Speed preference:',
    type: 'scale',
    required: true,
    depth: 'guided',
  },
  
  // Operator depth - expert-level questions
  {
    id: 'tool_risk_tolerance',
    category: 'safety',
    text: 'What level of tool risk are you comfortable with?',
    type: 'scale',
    required: true,
    depth: 'operator',
  },
  {
    id: 'memory_consolidation_frequency',
    category: 'memory',
    text: 'How often should memory be consolidated?',
    type: 'choice',
    required: true,
    depth: 'operator',
    choices: ['Daily', 'Weekly', 'Monthly', 'Manual'],
  },
];

export function getQuestionsForDepth(depth: 'quick' | 'guided' | 'operator'): Question[] {
  const depthOrder = { quick: 1, guided: 2, operator: 3 };
  const targetLevel = depthOrder[depth];
  
  return ONBOARDING_QUESTIONS.filter(q => depthOrder[q.depth] <= targetLevel);
}
