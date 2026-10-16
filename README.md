"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "REARRANGEMENT";
  questionText: string;
  options: string[];
  correctSequence?: string[];
}

export default function ExamRunner({ categoryId, initialQuestions, durationMinutes }: { categoryId: string; initialQuestions: Question[]; durationMinutes: number }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQ = initialQuestions[currentIndex];

  // 1. لوکل اسٹاوریج میں آٹو سیو (Auto-Save)
  useEffect(() => {
    const saved = localStorage.getItem(`exam_${categoryId}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch (e) {}
    }
  }, [categoryId]);

  useEffect(() => {
    localStorage.setItem(`exam_${categoryId}`, JSON.stringify(answers));
  }, [answers, categoryId]);

  // 2. اسٹیکی سرور ٹائمر
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // موبائل فرینڈلی ری آرینجمنٹ (Move Up / Move Down)
  const moveItem = (index: number, direction: "up" | "down", optionsList: string[]) => {
    const newItems = [...(answers[currentQ.id] || optionsList)];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    handleAnswerChange(currentQ.id, newItems);
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, answers }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem(`exam_${categoryId}`);
        router.push(`/results/${data.attemptId}`);
      } else {
        alert(data.message || "Submission failed");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pb-20">
      {/* Sticky Header & Stopwatch */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-sm border-b py-3 px-4 flex justify-between items-center rounded-b-xl mb-6">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500">Category</span>
          <h2 className="font-bold text-lg text-slate-800 dark:text-white capitalize">{categoryId.replace("-", " ")}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-red-50 dark:bg-red-950/50 text-red-600 font-mono font-bold px-3 py-1.5 rounded-lg border border-red-200">
            🕒 {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-1.5 rounded-lg transition"
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-6 border border-slate-100 dark:border-zinc-700">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-4">
          <span>Question {currentIndex + 1} of {initialQuestions.length}</span>
          <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-semibold text-xs">{currentQ.type}</span>
        </div>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">{currentQ.questionText}</h3>

        {/* MCQ & True/False */}
        {(currentQ.type === "MCQ" || currentQ.type === "TRUE_FALSE") && (
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  answers[currentQ.id] === option
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750"
                }`}
              >
                <input
                  type="radio"
                  name={currentQ.id}
                  value={option}
                  checked={answers[currentQ.id] === option}
                  onChange={() => handleAnswerChange(currentQ.id, option)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700 dark:text-zinc-200">{option}</span>
              </label>
            ))}
          </div>
        )}

        {/* Rearrangement with Touch Controls */}
        {currentQ.type === "REARRANGEMENT" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-2">ترتیب درست کرنے کے لیے تیر والے بٹن استعمال کریں:</p>
            {(answers[currentQ.id] || currentQ.options).map((item: string, idx: number, arr: string[]) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700">
                <span className="font-medium text-slate-800 dark:text-zinc-200">{idx + 1}. {item}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(idx, "up", currentQ.options)}
                    disabled={idx === 0}
                    className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border disabled:opacity-30"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => moveItem(idx, "down", currentQ.options)}
                    disabled={idx === arr.length - 1}
                    className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border disabled:opacity-30"
                  >
                    ⬇️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 rounded-xl border font-medium disabled:opacity-40"
        >
          Previous
        </button>
        {currentIndex < initialQuestions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(initialQuestions.length - 1, prev + 1))}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
          >
            Finish & Submit
          </button>
        )}
      </div>
    </div>
  );
}
