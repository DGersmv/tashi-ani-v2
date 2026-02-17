"use client";
import React from "react";
import { motion } from "framer-motion";
import { useLoginFlow } from "@/components/ui/LoginFlowContext";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

const DEFAULT_MAIN_PAGE_TITLE = "Ландшафт, который рекомендуют";
const DEFAULT_MAIN_PAGE_BLOCKS = [
  "Нам доверяют уже более 15 лет",
  "90% наших клиентов приходят по личным рекомендациям — потому что мы создаём",
  "не просто красивые пространства, а действительно комфортные и функциональные",
  "участки, которые работают на ваш стиль жизни.",
  "Мы умеем решать сложные задачи:",
  "Перепады высот, затопление, сложные грунты — решаем.\nИндивидуальный подход: отражение вкусов и привычек клиента.\nПодбор растений по цвету, простоте ухода и эксклюзивности.\nОриентация только на реальные примеры в нашем климате.",
  "Наши принципы: логика, функциональность, эстетика.",
  "Личный онлайн-кабинет заказчика",
  "Все этапы, документы, фото- и видеоотчёты, комментарии — в одном месте, с любого устройства.",
  "Мы ведём проект от первого выезда до сдачи и последующего сервиса.",
  "Архитектурное образование и опыт позволяют принимать грамотные решения на всех стадиях.",
  "Экономим бюджет за счёт продуманной последовательности и прозрачных процессов.",
  "Вы получаете не просто проект, а надёжного партнёра на всех этапах.",
];

const LINE_DELAY = 0.06;
const DURATION = 0.35;
const TOTAL_LINES = 14;

function AnimatedLine({
  index,
  totalLines,
  enteredHome,
  forceHidden,
  children,
  className = "",
}: {
  index: number;
  totalLines: number;
  enteredHome: boolean;
  forceHidden: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { loginRequested } = useLoginFlow();
  const isHiding = loginRequested || forceHidden;
  const isRevealing = !loginRequested && !forceHidden;
  const revealDelay = (totalLines - 1 - index) * LINE_DELAY;
  const hideDelay = index * LINE_DELAY;
  return (
    <motion.div
      initial={enteredHome ? { x: "-120%", opacity: 0 } : false}
      animate={{
        x: isHiding ? "-120%" : 0,
        opacity: isHiding ? 0 : 1,
      }}
      transition={{
        duration: DURATION,
        ease: [0.4, 0, 0.2, 1],
        delay: isHiding ? hideDelay : isRevealing ? revealDelay : 0,
      }}
      style={{ willChange: isHiding || isRevealing ? "transform, opacity" : "auto" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const SUBTITLE_INDICES = [0, 4, 7, 12];
const LIST_INDEX = 5;

export default function CompanyDescription({ enteredHome = false, forceHidden = false }: { enteredHome?: boolean; forceHidden?: boolean }) {
  const settings = useSiteSettings();
  const maxWidth = settings.mainPageTextMaxWidth ?? 720;
  const title = settings.mainPageTitle ?? DEFAULT_MAIN_PAGE_TITLE;
  const blocks = settings.mainPageBlocks ?? DEFAULT_MAIN_PAGE_BLOCKS;

  const block = (i: number) => blocks[i] ?? DEFAULT_MAIN_PAGE_BLOCKS[i] ?? "";
  const isSubtitle = (i: number) => SUBTITLE_INDICES.includes(i);
  const isList = (i: number) => i === LIST_INDEX;

  return (
    <div
      className="text-white flex flex-col space-y-6 text-left"
      style={{
        width: "100%",
        maxWidth: maxWidth,
        fontFamily: "var(--font-main-text, ChinaCyr, Arial, Helvetica, sans-serif)",
        marginLeft: 0,
        alignSelf: "flex-start",
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      <AnimatedLine index={0} totalLines={TOTAL_LINES} enteredHome={enteredHome} forceHidden={forceHidden}>
        <h2
          className="font-extrabold text-[clamp(1.8rem,5vw,2.8rem)] mb-6"
          style={{
            fontFamily: "var(--font-main-heading, ChinaCyr, Arial, sans-serif)",
            letterSpacing: "0.04em",
            background: "linear-gradient(90deg, #faecd1 0%, #d3a373 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            lineHeight: 1.1,
            maxWidth: "100%",
          }}
        >
          {title}
        </h2>
      </AnimatedLine>

      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
        const lineIndex = i + 1;
        const content = block(i);
        if (isList(i)) {
          const items = content.split("\n").filter(Boolean);
          return (
            <AnimatedLine key={i} index={lineIndex} totalLines={TOTAL_LINES} enteredHome={enteredHome} forceHidden={forceHidden}>
              <ul className="list-disc pl-6 space-y-2">
                {items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </AnimatedLine>
          );
        }
        return (
          <AnimatedLine key={i} index={lineIndex} totalLines={TOTAL_LINES} enteredHome={enteredHome} forceHidden={forceHidden}>
            <p className={isSubtitle(i) ? "font-semibold" : undefined}>{content}</p>
          </AnimatedLine>
        );
      })}
    </div>
  );
}
