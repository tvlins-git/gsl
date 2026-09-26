export type LearningLanguage = "da" | "sv" | "en";

export type GameResult = {
  correct: boolean;
  promptId: string;
};

export type GameProps = {
  language: LearningLanguage;
  onResult: (result: GameResult) => void;
};
