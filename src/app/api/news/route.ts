export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { getSiteSettings } from "@/lib/siteSettings";

export type NewsPost = {
  id: string;
  title: string;
  text: string;
  date: string;
  link: string;
  imageUrl?: string;
  videoUrl?: string;
};

function extractFirstImageFromHtml(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

export async function GET() {
  try {
    const settings = await getSiteSettings();
    const rssUrl = settings.telegramNewsRssUrl?.trim();
    if (!rssUrl || !rssUrl.startsWith("http")) {
      return NextResponse.json({ posts: [] });
    }

    // rss.app: /feed/ID — это HTML-страница; нужна прямая ссылка на XML (в интерфейсе — RSS / Copy Feed URL)
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent": "TashiAni-News/1.0",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 0 },
    });
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();
    if (!res.ok) {
      console.error("GET /api/news fetch failed", res.status, rssUrl);
      return NextResponse.json({ posts: [], error: "FETCH_FAILED" }, { status: 200 });
    }
    if (
      contentType.includes("text/html") ||
      body.trimStart().startsWith("<!") ||
      body.trimStart().toLowerCase().startsWith("<html")
    ) {
      console.error("GET /api/news: URL returns HTML, not RSS. Use direct RSS (XML) or JSON link from rss.app.");
      return NextResponse.json(
        { posts: [], error: "RSS_URL_IS_HTML" },
        { status: 200 }
      );
    }

    // JSON Feed (rss.app даёт .json — https://jsonfeed.org/version/1.1)
    const isJson =
      rssUrl.endsWith(".json") ||
      contentType.includes("application/json") ||
      (body.trimStart().startsWith("{") && body.trimEnd().endsWith("}"));
    if (isJson) {
      const json = JSON.parse(body) as {
        items?: Array<{
          id?: string;
          url?: string;
          title?: string;
          content_text?: string;
          content_html?: string;
          image?: string;
          date_published?: string;
          attachments?: Array<{ url?: string; mime_type?: string }>;
        }>;
      };
      const items = json.items ?? [];
      const posts: NewsPost[] = items.slice(0, 20).map((item, index) => {
        const link = item.url ?? "";
        let text = item.content_text ?? "";
        if (!text && item.content_html) {
          text = item.content_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        }
        let imageUrl = item.image;
        let videoUrl: string | undefined;
        const attachments = item.attachments ?? [];
        for (const att of attachments) {
          if (att.url && att.mime_type?.startsWith("video/")) {
            videoUrl = att.url;
            break;
          }
          if (att.url && !imageUrl) imageUrl = att.url;
        }
        if (!imageUrl && item.content_html) {
          imageUrl = extractFirstImageFromHtml(item.content_html);
        }
        return {
          id: item.id ?? `post-${index}-${link.split("/").pop() ?? index}`,
          title: item.title ?? "",
          text: text.replace(/\s+/g, " ").trim(),
          date: item.date_published ?? "",
          link,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
        };
      });
      return NextResponse.json({ posts });
    }

    const parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ["media:content", "mediaContent"],
          ["media:thumbnail", "mediaThumbnail"],
          ["description", "description"],
        ],
      },
    });

    const feed = await parser.parseString(body);
    const posts: NewsPost[] = (feed.items ?? []).slice(0, 20).map((item, index) => {
      const link = item.link ?? "";
      const enclosure = item.enclosure;
      const rawItem = item as Record<string, unknown>;
      const mediaContent = rawItem?.mediaContent as { $?: { url?: string }; url?: string } | undefined;
      const mediaThumbnail = rawItem?.mediaThumbnail as { $?: { url?: string }; url?: string } | undefined;
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      if (enclosure?.url) {
        if (enclosure.type?.startsWith("video/")) {
          videoUrl = enclosure.url;
        } else {
          imageUrl = enclosure.url;
        }
      }
      if (!imageUrl && mediaContent?.$?.url) imageUrl = mediaContent.$.url;
      if (!imageUrl && mediaContent?.url) imageUrl = mediaContent.url;
      if (!imageUrl && mediaThumbnail?.$?.url) imageUrl = mediaThumbnail.$.url;
      if (!imageUrl && mediaThumbnail?.url) imageUrl = mediaThumbnail.url;
      if (!imageUrl && !videoUrl && item.content) {
        imageUrl = extractFirstImageFromHtml(item.content);
      }
      const text =
        item.contentSnippet ??
        (typeof item.content === "string" ? item.content.replace(/<[^>]+>/g, " ").trim() : "") ??
        (rawItem?.description as string | undefined) ??
        "";
      const cleanText = text.replace(/\s+/g, " ").trim();

      return {
        id: `post-${index}-${link.split("/").pop() ?? index}`,
        title: item.title ?? "",
        text: cleanText,
        date: item.pubDate ?? "",
        link,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
      };
    });

    return NextResponse.json({ posts });
  } catch (e) {
    console.error("GET /api/news", e);
    return NextResponse.json({ posts: [], error: "Ошибка загрузки ленты" }, { status: 200 });
  }
}
