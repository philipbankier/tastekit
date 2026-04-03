export interface DomainVocabulary {
  principles_heading?: string;
  guardrails_heading?: string;
  skills_heading?: string;
  constitution_label?: string;
  skill_label?: string;
  playbook_label?: string;
  compile_verb?: string;
  drift_verb?: string;
  custom?: Record<string, string>;
}

export interface DomainDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  use_cases: string[];
  recommended_tools: string[];
  default_autonomy_level: number;
  vocabulary?: DomainVocabulary;
}
