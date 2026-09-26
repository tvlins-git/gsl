"use client";

import { useState, type CSSProperties } from "react";
import type { GameProps, LearningLanguage } from "../types";
import { makeChoices, makeProblem, type MathProblem } from "./problems";

const CHEER: Record<LearningLanguage, { yes: string; almost: string }> = {
  da: { yes: "🌟 Ja!", almost: "💛 Næsten!" },
  sv: { yes: "🌟 Ja!", almost: "💛 Nästan!" },
  en: { yes: "🌟 Yes!", almost: "💛 Almost!" },
};

const SPOKEN: Record<LearningLanguage, { add: string; sub: string }> = {
  da: { add: "plus", sub: "minus" },
  sv: { add: "plus", sub: "minus" },
  en: { add: "plus", sub: "minus" },
};

type Round = {
  problem: MathProblem;
  choices: number[];
};

type Cheer = {
  text: string;
  correct: boolean;
};

function deal(avoidId?: string): Round {
  let problem = makeProblem();
  for (let attempt = 0; attempt < 8 && problem.promptId === avoidId; attempt += 1) {
    problem = makeProblem();
  }
  return { problem, choices: makeChoices(problem.answer) };
}

export default function MathGame({ language, onResult }: GameProps) {
  const [round, setRound] = useState<Round>(deal);
  const [cheer, setCheer] = useState<Cheer | null>(null);
  const words = CHEER[language];
  const spoken = SPOKEN[language];
  const { problem, choices } = round;
  const symbol = problem.operation === "add" ? "+" : "−";
  const spokenOp = problem.operation === "add" ? spoken.add : spoken.sub;

  function choose(choice: number) {
    const correct = choice === problem.answer;
    onResult({ correct, promptId: problem.promptId });
    setCheer({ text: correct ? words.yes : words.almost, correct });
    setRound(deal(problem.promptId));
  }

  return (
    <div style={styles.screen}>
      <p
        style={{
          ...styles.cheer,
          color: cheer == null ? "transparent" : cheer.correct ? "#17803D" : "#C56A00",
        }}
        role="status"
        aria-live="polite"
      >
        {cheer?.text ?? "·"}
      </p>
      <p style={styles.problem} aria-label={`${problem.left} ${spokenOp} ${problem.right}`}>
        {problem.left} {symbol} {problem.right} = ?
      </p>
      <div style={styles.choices}>
        {choices.map((choice) => (
          <button key={choice} type="button" style={styles.choice} onClick={() => choose(choice)}>
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  screen: {
    boxSizing: "border-box",
    minHeight: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    padding: 24,
    background: "#FFF4D8",
    color: "#2A2140",
    fontFamily: "ui-rounded, Nunito, system-ui, sans-serif",
  },
  cheer: {
    minHeight: 64,
    margin: 0,
    fontSize: "clamp(32px, 8vw, 48px)",
    fontWeight: 800,
    lineHeight: 1.1,
    textAlign: "center",
  },
  problem: {
    margin: 0,
    fontSize: "clamp(56px, 14vw, 96px)",
    fontWeight: 800,
    letterSpacing: 1,
    lineHeight: 1.1,
    textAlign: "center",
  },
  choices: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    maxWidth: 440,
  },
  choice: {
    minHeight: 104,
    width: "100%",
    border: "none",
    borderRadius: 28,
    background: "#FF7A59",
    boxShadow: "0 8px 0 #D4553A",
    color: "#FFFFFF",
    fontSize: "clamp(44px, 10vw, 64px)",
    fontWeight: 800,
    cursor: "pointer",
    touchAction: "manipulation",
  },
};
