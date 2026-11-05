"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, PenTool } from "lucide-react";
import { courseBySlug, LESSON_XP } from "@/lib/content/courses";
import { DIFFICULTY_LABEL } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Bar } from "@/components/ui/motion";

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const course = courseBySlug(slug);
  const { isLessonDone, completeLesson } = useUserData();
  const firstPending = course ? Math.max(0, course.lessons.findIndex((l) => !isLessonDone(course.slug, l.slug))) : 0;
  const [index, setIndex] = useState(firstPending);
  const [loading, setLoading] = useState(false);
  if (!course) notFound();

  const lesson = course.lessons[index];
  const done = course.lessons.filter((l) => isLessonDone(course.slug, l.slug)).length;
  const lessonDone = isLessonDone(course.slug, lesson.slug);

  const finish = async () => {
    setLoading(true);
    try {
      await completeLesson(course.slug, lesson.slug);
      if (index < course.lessons.length - 1) setTimeout(() => setIndex(index + 1), 600);
    } catch {
      /* toast */
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Link href="/academia" className="mb-8 inline-flex items-center gap-2 text-sm text-fog hover:text-paper">
        <ArrowLeft className="size-4" /> Academia
      </Link>

      <header className="mb-10">
        <p className="label mb-4">
          Trilha · {DIFFICULTY_LABEL[course.level]} · {course.lessons.length} aulas
        </p>
        <h1 className="display text-[clamp(2.4rem,6vw,4.6rem)]">
          {course.title}
          <span className="accent-serif ml-3 text-[0.6em]" style={{ color: course.color }}>
            {course.subtitle}
          </span>
        </h1>
        <div className="mt-6 flex max-w-md items-center gap-4">
          <Bar value={done / course.lessons.length} />
          <span className="shrink-0 text-sm text-fog">
            {done}/{course.lessons.length}
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <nav aria-label="Aulas da trilha">
          <ol className="space-y-1.5">
            {course.lessons.map((l, i) => {
              const ok = isLessonDone(course.slug, l.slug);
              return (
                <li key={l.slug}>
                  <button
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      i === index ? "border-line-strong bg-white/[0.05]" : "border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    {ok ? (
                      <CheckCircle2 className="size-5 shrink-0 text-lime" />
                    ) : (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[10px] text-fog">{i + 1}</span>
                    )}
                    <span className="flex-1">{l.title}</span>
                    <span className="text-xs text-mute">{l.minutes}′</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <AnimatePresence mode="wait">
          <motion.article
            key={lesson.slug}
            className="card grain p-6 sm:p-10"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="label flex items-center gap-2">
              Aula {index + 1} <Clock className="size-3.5" /> {lesson.minutes} min
            </p>
            <h2 className="display mt-4 text-4xl">{lesson.title}</h2>
            <div className="mt-8 max-w-2xl space-y-5 text-[16px] leading-[1.75] text-paper/85">
              {lesson.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-lime/25 bg-lime/[0.05] p-5">
              <p className="label mb-2 flex items-center gap-2 !text-lime">
                <PenTool className="size-3.5" /> Exercício prático
              </p>
              <p className="text-[15px] leading-relaxed">{lesson.exercise}</p>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <Button variant="ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
                <ArrowLeft className="size-4" /> Anterior
              </Button>
              <div className="flex flex-wrap gap-2">
                {lessonDone ? (
                  <span className="inline-flex h-11 items-center gap-2 rounded-full bg-lime/15 px-5 text-sm text-lime">
                    <Check className="size-4" /> Aula concluída
                  </span>
                ) : (
                  <Button onClick={finish} loading={loading}>
                    <Check className="size-4" /> Concluir aula · +{LESSON_XP} XP
                  </Button>
                )}
                {index < course.lessons.length - 1 && (
                  <Button variant="outline" onClick={() => setIndex(index + 1)}>
                    Próxima <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </>
  );
}
