"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { submitQuiz, type QuizResult } from "@/app/actions/quizzes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  quizId: string;
  questions: { question: string; options: string[] }[];
  best: { score: number; total: number } | null;
};

export function QuizPanel({ quizId, questions, best }: Props) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const [bestScore, setBestScore] = useState(best);
  const [pending, startTransition] = useTransition();
  const answeredAll = answers.every((a) => a >= 0);

  function submit() {
    startTransition(async () => {
      const res = await submitQuiz(quizId, answers);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setResult(res);
      if (res.score !== undefined && res.total && (!bestScore || res.score > bestScore.score)) {
        setBestScore({ score: res.score, total: res.total });
      }
    });
  }

  function retry() {
    setAnswers(questions.map(() => -1));
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {result?.score !== undefined && result.total ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <Trophy className={cn("size-8", result.score === result.total ? "text-amber-400" : "text-primary")} />
            <div>
              <div className="text-lg font-semibold">
                You scored {result.score}/{result.total}
              </div>
              <div className="text-sm text-muted-foreground">
                {result.score === result.total ? "Perfect score!" : "Review the explanations below, then try again."}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={retry}>
            <RotateCcw className="size-4" /> Retry
          </Button>
        </Card>
      ) : (
        bestScore && (
          <p className="text-sm text-muted-foreground">
            Your best score: {bestScore.score}/{bestScore.total}
          </p>
        )
      )}

      <ol className="space-y-4">
        {questions.map((q, qi) => {
          const graded = result?.results?.[qi];
          return (
            <li key={qi}>
              <Card className="p-5">
                <p className="font-medium">
                  {qi + 1}. {q.question}
                </p>
                <div className="mt-3 grid gap-2" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                  {q.options.map((option, oi) => {
                    const chosen = answers[qi] === oi;
                    const isCorrect = graded && graded.answerIndex === oi;
                    const isWrongChoice = graded && chosen && !graded.correct;
                    return (
                      <button
                        key={oi}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        disabled={!!result}
                        onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                          !graded && (chosen ? "border-primary bg-accent" : "hover:bg-muted"),
                          isCorrect && "border-success bg-success/10",
                          isWrongChoice && "border-destructive bg-destructive/10"
                        )}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{option}</span>
                        {isCorrect && <CheckCircle2 className="size-4 text-success" />}
                        {isWrongChoice && <XCircle className="size-4 text-destructive" />}
                      </button>
                    );
                  })}
                </div>
                {graded?.explanation && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/80 p-3 text-sm text-muted-foreground border border-border/50">
                    <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
                    <p className="flex-1">{graded.explanation}</p>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-foreground">{answers.filter((a) => a >= 0).length}</span> of {questions.length} answered
            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(answers.filter((a) => a >= 0).length / Math.max(1, questions.length)) * 100}%` }}
              />
            </div>
          </div>
          <Button onClick={submit} disabled={!answeredAll || pending} className="px-6">
            {pending ? "Checking…" : answeredAll ? "Submit answers" : `Complete remaining questions`}
          </Button>
        </div>
      )}
    </div>
  );
}
