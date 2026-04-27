export type Role = 'admin' | 'user';
export type AIModel = 'claude' | 'gpt';
export type WinnerKey = 'local' | 'empate' | 'visitante';
export type AnalysisStatus = 'pending' | 'win' | 'loss';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  display_name: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Analysis {
  id: string;
  user_id: string;
  match_name: string;
  league: string;
  analysis_date: string;
  ai_model: AIModel;
  ai_model_version: string;
  winner: string;
  winner_key: WinnerKey;
  prob_local: number;
  prob_empate: number;
  prob_visitante: number;
  score_1: string;
  prob_1: number;
  score_2: string;
  prob_2: number;
  bet_type: string;
  best_bet: string;
  confidence_pct: number;
  factors: any;
  analysis: any;
  final_reasoning: string;
  weights_at_time: any;
  goals_expected: number;
  avg_goals_h2h: number;
  goals_tendency: string;
  both_teams_score: string;
  over_under: string;
  status: AnalysisStatus;
  real_score: string | null;
  sections_hit: any | null;
  ai_post_analysis: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemWeights {
  id: AIModel;
  weights: Record<string, number>;
  total_iterations: number;
  last_learning_note: string | null;
  updated_at: string;
}

export interface JWTPayload {
  sub: string;
  role: Role;
  username: string;
  [key: string]: any;
}
