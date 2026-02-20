"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

const DEFAULT_CHANNEL = "tashiani";

type NewsPost = {
  id: string;
  title: string;
  text: string;
  date: string;
  link: string;
  imageUrl?: string;
  videoUrl?: string;
};

type LightboxMedia = { type: "image" | "video"; url: string; postLink: string };

function normalizeChannelAddress(value: string): string {
  const raw = value.trim().replace(/^@/, "") || DEFAULT_CHANNEL;
  const tMeMatch = raw.match(/t\.me\/s\/([^/?]+)/i) ?? raw.match(/telegram\.org\/s\/([^/?]+)/i);
  if (tMeMatch) return tMeMatch[1];
  if (raw.startsWith("http")) {
    const slug = raw.split("/").filter(Boolean).pop()?.split("?")[0];
    if (slug && slug !== "s") return slug;
  }
  return raw || DEFAULT_CHANNEL;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NewsPanel() {
  const settings = useSiteSettings();
  const channel = normalizeChannelAddress(settings.telegramNewsChannel ?? DEFAULT_CHANNEL);
  const channelUrl = `https://t.me/s/${channel}`;
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [rssError, setRssError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const [videoError, setVideoError] = useState<Set<string>>(new Set());

  const closeLightbox = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLightbox]);

  useEffect(() => {
    let cancelled = false;
    setRssError(null);
    fetch("/api/news", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.posts)) setPosts(data.posts);
        if (data.error === "RSS_URL_IS_HTML") {
          setRssError("RSS_URL_IS_HTML");
        } else if (data.error === "FETCH_FAILED") {
          setRssError("FETCH_FAILED");
        }
      })
      .catch(() => {
        if (!cancelled) setRssError("FETCH_FAILED");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasRss = !!settings.telegramNewsRssUrl?.trim();

  return (
    <section className="mt-40 md:mt-44" style={{ pointerEvents: "auto" }}>
      <div className="mx-auto max-w-screen-2xl px-4 md:px-6" style={{ pointerEvents: "auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="news-panel"
          style={{
            pointerEvents: "auto",
            maxWidth: 720,
            marginLeft: 0,
            marginRight: "auto",
          }}
        >
          <h2
            className="text-2xl md:text-3xl font-medium mb-4"
            style={{
              fontFamily: "var(--font-heading, 'ChinaCyr', Arial, Helvetica, sans-serif)",
              color: "rgba(201, 169, 110,  1)",
            }}
          >
            Новости и рекомендации
          </h2>
          <p
            className="text-base md:text-lg mb-6 opacity-90"
            style={{ lineHeight: 1.6, color: "rgba(246, 248, 250, 0.9)" }}
          >
            Актуальные новости, советы по уходу за садом и рекомендации мы публикуем в нашем
            Telegram-канале. Подпишитесь, чтобы не пропустить полезные материалы.
          </p>

          {loading && hasRss ? (
            <p style={{ color: "rgba(250, 247, 242, 0.7)", marginBottom: 24 }}>Загрузка новостей…</p>
          ) : !hasRss ? (
            <div
              style={{
                padding: "16px 20px",
                marginBottom: 24,
                background: "rgba(201, 169, 110,  0.08)",
                border: "1px solid rgba(201, 169, 110,  0.25)",
                borderRadius: 12,
                color: "rgba(246, 248, 250, 0.9)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "rgba(201, 169, 110,  1)" }}>Как показать посты здесь</strong>
              <p style={{ margin: "8px 0 0", padding: 0 }}>
                Чтобы на этой странице отображались посты канала с фото и видео (без перехода в Telegram), в настройках сайта нужно указать <strong>RSS-ленту</strong>. Её можно создать бесплатно: зайдите на{" "}
                <a href="https://rss.app" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(201, 169, 110,  1)" }}>rss.app</a>
                , выберите «Telegram» → вставьте ссылку на канал ({channelUrl}), скопируйте выданный RSS-адрес и вставьте его в разделе <strong>Настройки сайта</strong> в поле «RSS-лента новостей».
              </p>
            </div>
          ) : posts.length > 0 ? (
            <ul className="list-none p-0 m-0" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {posts.map((post, i) => (
                <motion.li
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  style={{
                    background: "rgba(250, 247, 242, 0.06)",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(250, 247, 242, 0.1)",
                  }}
                >
                  {(post.videoUrl || post.imageUrl) && (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16/10",
                        maxHeight: 360,
                        background: "#1a1a1a",
                        position: "relative",
                        cursor: post.imageUrl ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (post.imageUrl) {
                          setLightbox({ type: "image", url: post.imageUrl, postLink: post.link });
                        } else if (post.videoUrl) {
                          setLightbox({ type: "video", url: post.videoUrl!, postLink: post.link });
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && (post.imageUrl || post.videoUrl)) {
                          e.preventDefault();
                          if (post.imageUrl) setLightbox({ type: "image", url: post.imageUrl, postLink: post.link });
                          else if (post.videoUrl) setLightbox({ type: "video", url: post.videoUrl, postLink: post.link });
                        }
                      }}
                      role={(post.imageUrl || post.videoUrl) ? "button" : undefined}
                      tabIndex={post.imageUrl || post.videoUrl ? 0 : undefined}
                    >
                      {post.videoUrl ? (
                        videoError.has(post.id) ? (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 12,
                              padding: 24,
                              color: "rgba(250, 247, 242, 0.8)",
                            }}
                          >
                            <span style={{ fontSize: "0.9rem" }}>Видео можно посмотреть в Telegram</span>
                            <a
                              href={post.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "rgba(201, 169, 110,  1)",
                                fontWeight: 500,
                              }}
                            >
                              Открыть пост →
                            </a>
                          </div>
                        ) : (
                          <video
                            src={post.videoUrl}
                            controls
                            playsInline
                            onClick={(e) => e.stopPropagation()}
                            onError={() => setVideoError((prev) => new Set(prev).add(post.id))}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        )
                      ) : post.imageUrl ? (
                        <>
                          <img
                            src={post.imageUrl}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            draggable={false}
                          />
                          <span
                            style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              fontSize: "0.75rem",
                              padding: "4px 8px",
                              borderRadius: 6,
                            }}
                          >
                            Нажмите, чтобы увеличить
                          </span>
                        </>
                      ) : null}
                    </div>
                  )}
                  <div style={{ padding: "16px 20px" }}>
                    {post.title && (
                      <h3
                        className="text-lg font-medium mb-2"
                        style={{
                          fontFamily: "var(--font-heading)",
                          color: "rgba(246, 248, 250, 0.95)",
                        }}
                      >
                        {post.title}
                      </h3>
                    )}
                    {post.text && (
                      <p
                        className="text-base mb-3"
                        style={{
                          lineHeight: 1.6,
                          color: "rgba(246, 248, 250, 0.85)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {post.text.slice(0, 500)}
                        {post.text.length > 500 ? "…" : ""}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      {post.date && (
                        <span style={{ fontSize: "0.85rem", color: "rgba(250, 247, 242, 0.5)" }}>
                          {formatDate(post.date)}
                        </span>
                      )}
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: "rgba(201, 169, 110,  1)" }}
                      >
                        <TelegramIcon />
                        В Telegram
                      </a>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : rssError === "RSS_URL_IS_HTML" ? (
            <div
              style={{
                padding: "16px 20px",
                marginBottom: 24,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 12,
                color: "rgba(246, 248, 250, 0.95)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "rgba(239, 68, 68, 0.9)" }}>Указана ссылка на страницу, а не на ленту</strong>
              <p style={{ margin: "8px 0 0", padding: 0 }}>
                В настройках вставлена ссылка на страницу rss.app (например <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>/feed/...</code>). Нужна именно <strong>прямая ссылка на RSS (XML)</strong>. В rss.app откройте свою ленту → найдите кнопку <strong>«RSS»</strong>, <strong>«Copy Feed URL»</strong> или <strong>«XML»</strong> → скопируйте этот адрес и вставьте его в настройках в поле «RSS-лента новостей».
              </p>
            </div>
          ) : rssError === "FETCH_FAILED" ? (
            <p style={{ color: "rgba(239, 68, 68, 0.9)", marginBottom: 24 }}>
              Не удалось загрузить ленту. Проверьте ссылку в настройках и доступность сервиса.
            </p>
          ) : posts.length === 0 && hasRss ? (
            <p style={{ color: "rgba(250, 247, 242, 0.6)", marginBottom: 24 }}>
              Пока постов в ленте нет. Проверьте, что RSS-адрес в настройках указан верно и в канале есть публичные посты.
            </p>
          ) : null}

          <div style={{ marginTop: posts.length > 0 ? 32 : 0 }}>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: "rgba(201, 169, 110,  0.2)",
                color: "rgba(201, 169, 110,  1)",
                border: "1px solid rgba(201, 169, 110,  0.5)",
              }}
            >
              <TelegramIcon />
              Открыть канал в Telegram
            </a>
          </div>
        </motion.div>

        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
              onClick={closeLightbox}
            >
              <button
                type="button"
                aria-label="Закрыть"
                onClick={closeLightbox}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1px solid rgba(250, 247, 242, 0.3)",
                  background: "rgba(250, 247, 242, 0.1)",
                  color: "#fff",
                  fontSize: "1.5rem",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
              <div
                style={{
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {lightbox.type === "image" ? (
                  <img
                    src={lightbox.url}
                    alt=""
                    style={{
                      maxWidth: "100%",
                      maxHeight: "90vh",
                      objectFit: "contain",
                    }}
                    draggable={false}
                  />
                ) : (
                  <video
                    src={lightbox.url}
                    controls
                    playsInline
                    autoPlay
                    style={{
                      maxWidth: "100%",
                      maxHeight: "90vh",
                    }}
                  />
                )}
              </div>
              <a
                href={lightbox.postLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "rgba(201, 169, 110,  1)",
                  fontSize: "0.9rem",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Открыть в Telegram →
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
