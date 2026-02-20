"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { SiteSettingsPayload, CustomFontItem } from "@/app/api/site-settings/route";
import type { MapPoint } from "@/app/api/site/points/route";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

const FONT_OPTIONS = [
  { value: "ChinaCyr", label: "ChinaCyr" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "var(--font-montserrat)", label: "Montserrat (системный)" },
];

const SERVICE_FOLDERS = ["Проектирование", "Визуализация", "Реализация", "Сопровождение"];

const panelStyle: React.CSSProperties = {
  backgroundColor: "rgba(250, 247, 242, 0.06)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  border: "1px solid rgba(201, 169, 110, 0.2)",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(201, 169, 110, 0.2)",
  background: "rgba(0,0,0,0.2)",
  color: "var(--warm-white)",
  fontFamily: "Arial, sans-serif",
};
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, color: "rgba(250, 247, 242, 0.8)", fontFamily: "ChinaCyr, sans-serif" };
const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "rgba(201, 169, 110, 0.7)",
  color: "var(--ink)",
  fontFamily: "ChinaCyr, sans-serif",
  fontWeight: 600,
  cursor: "pointer",
  marginRight: 8,
  marginTop: 8,
};

type SettingsTab = "contacts" | "map" | "bg" | "portfolio" | "services" | "text";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "contacts", label: "Контакты и шрифты" },
  { id: "text", label: "Текст на главной" },
  { id: "map", label: "Карта" },
  { id: "bg", label: "Фоны" },
  { id: "portfolio", label: "Портфолио" },
  { id: "services", label: "Услуги" },
];

interface AdminSiteSettingsProps {
  adminToken: string;
  panelMode?: boolean;
}

export default function AdminSiteSettings({ adminToken, panelMode = false }: AdminSiteSettingsProps) {
  const { updateSettings: updateGlobalSettings } = useSiteSettings();
  const [settings, setSettings] = useState<SiteSettingsPayload | null>(null);
  const [bgImages, setBgImages] = useState<string[]>([]);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<{ name: string; items: { file: string }[] }[]>([]);
  const [servicesProjects, setServicesProjects] = useState<{ name: string; items: { file: string }[] }[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeServiceFolder, setActiveServiceFolder] = useState(SERVICE_FOLDERS[0]);
  const [activePortfolioFolder, setActivePortfolioFolder] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("contacts");
  const [mapLogoVersion, setMapLogoVersion] = useState(0);
  const [headerLogoVersion, setHeaderLogoVersion] = useState(0);
  const [fontUploading, setFontUploading] = useState(false);
  const [fontUploadError, setFontUploadError] = useState<string | null>(null);
  const fontFileInputRef = React.useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${adminToken}` };

  const allFontOptions = React.useMemo(() => {
    const base = [...FONT_OPTIONS];
    const custom = (settings?.customFonts ?? []).map((f: CustomFontItem) => ({ value: f.fontFamily, label: `${f.fontFamily} (загружен)` }));
    return [...base, ...custom];
  }, [settings?.customFonts]);

  const loadSettings = useCallback(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);
  const loadBg = useCallback(() => {
    fetch("/api/bg", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBgImages(Array.isArray(d.images) ? d.images : []))
      .catch(() => setBgImages([]));
  }, []);
  const loadPoints = useCallback(() => {
    fetch("/api/site/points", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPoints(Array.isArray(d.points) ? d.points : []))
      .catch(() => setPoints([]));
  }, []);
  const loadPortfolio = useCallback(() => {
    fetch("/api/portfolio/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.projects) ? d.projects : [];
        setPortfolioProjects(list);
        setActivePortfolioFolder((prev) => (list.some((p: { name: string }) => p.name === prev) ? prev : list[0]?.name ?? ""));
      })
      .catch(() => setPortfolioProjects([]));
  }, []);
  const loadServices = useCallback(() => {
    fetch("/api/services/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setServicesProjects(Array.isArray(d.projects) ? d.projects : []))
      .catch(() => setServicesProjects([]));
  }, []);

  useEffect(() => {
    loadSettings();
    loadBg();
    loadPoints();
    loadPortfolio();
    loadServices();
  }, [loadSettings, loadBg, loadPoints, loadPortfolio, loadServices]);

  // Инъекция @font-face для загруженных шрифтов прямо в панели — чтобы предпросмотр показывал их сразу после загрузки
  useEffect(() => {
    const customFonts = settings?.customFonts ?? [];
    const id = "admin-panel-custom-fonts";
    if (customFonts.length === 0) {
      const el = document.getElementById(id);
      if (el) el.remove();
      return;
    }
    const format = (url: string) => {
      if (url.endsWith(".woff2")) return "woff2";
      if (url.endsWith(".woff")) return "woff";
      return "truetype";
    };
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = customFonts
      .map(
        (f) =>
          `@font-face{font-family:'${f.fontFamily.replace(/'/g, "\\'")}';src:url('${f.url}') format('${format(f.url)}');font-display:swap;}`
      )
      .join("\n");
    return () => {
      const style = document.getElementById(id);
      if (style) style.remove();
    };
  }, [settings?.customFonts]);

  const handleFontUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = fontFileInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setFontUploadError("Выберите файл шрифта (TTF, WOFF, WOFF2)");
      return;
    }
    setFontUploadError(null);
    setFontUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/site/upload-font", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        setFontUploadError(data.message || "Ошибка загрузки");
        return;
      }
      const customFonts = [...(settings?.customFonts ?? []), { fontFamily: data.fontFamily, url: data.url }];
      await saveSettings({ customFonts });
      if (input) input.value = "";
    } catch (err) {
      setFontUploadError("Ошибка сети");
    } finally {
      setFontUploading(false);
    }
  };

  const removeCustomFont = async (fontFamily: string) => {
    if (!settings) return;
    const customFonts = (settings.customFonts ?? []).filter((f) => f.fontFamily !== fontFamily);
    setSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ ...settings, customFonts }),
      });
      const data = await res.json();
      if (data && typeof data === "object") setSettings(data);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (partial: Partial<SiteSettingsPayload>) => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("Ошибка сохранения");
        return;
      }
      if (data && typeof data === "object") {
        setSettings(data);
        updateGlobalSettings(data);
      } else {
        setSettings((s) => (s ? { ...s, ...partial } : null));
        updateGlobalSettings(partial);
      }
      setMessage("Сохранено");
    } catch {
      setMessage("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const uploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/bg", { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.images) setBgImages(data.images);
      else setMessage(data.message || "Ошибка загрузки");
    } catch {
      setMessage("Ошибка загрузки фона");
    }
    e.target.value = "";
  };

  const deleteBg = async (url: string) => {
    const file = url.replace(/^\/bg\//, "");
    if (!file) return;
    try {
      const res = await fetch(`/api/admin/bg?file=${encodeURIComponent(file)}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.images) setBgImages(data.images);
      else setMessage(data.message || "Ошибка удаления");
    } catch {
      setMessage("Ошибка удаления");
    }
  };

  const uploadMapLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/site/map-logo", { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setSettings((s) => (s ? { ...s, mapLogoPath: data.url } : null));
        setMapLogoVersion((v) => v + 1);
        await saveSettings({ ...settings!, mapLogoPath: data.url });
      } else {
        setMessage(data.message || "Ошибка загрузки");
      }
    } catch {
      setMessage("Ошибка загрузки логотипа");
    }
    e.target.value = "";
  };

  const resetMapLogo = () => {
    const defaultPath = "/points/default.png";
    setSettings((s) => (s ? { ...s, mapLogoPath: defaultPath } : null));
    setMapLogoVersion((v) => v + 1);
    saveSettings({ mapLogoPath: defaultPath });
  };

  const uploadHeaderLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/site/header-logo", { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setSettings((s) => (s ? { ...s, siteLogoPath: data.url } : null));
        setHeaderLogoVersion((v) => v + 1);
        await saveSettings({ ...settings!, siteLogoPath: data.url });
      } else {
        setMessage(data.message || "Ошибка загрузки");
      }
    } catch {
      setMessage("Ошибка загрузки логотипа");
    }
    e.target.value = "";
  };

  const resetHeaderLogo = () => {
    const defaultPath = "/logo_new.png";
    setSettings((s) => (s ? { ...s, siteLogoPath: defaultPath } : null));
    setHeaderLogoVersion((v) => v + 1);
    saveSettings({ siteLogoPath: defaultPath });
  };

  const savePoints = async () => {
    try {
      const res = await fetch("/api/admin/site/points", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ points }),
      });
      const data = await res.json();
      if (data.success) setMessage("Точки карты сохранены");
      else setMessage(data.message || "Ошибка");
    } catch {
      setMessage("Ошибка сохранения точек");
    }
  };

  const uploadPortfolio = async (folder: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/admin/portfolio/${encodeURIComponent(folder)}`, { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.success) loadPortfolio();
      else setMessage(data.message || "Ошибка");
    } catch {
      setMessage("Ошибка загрузки");
    }
    e.target.value = "";
  };

  const deletePortfolio = async (folder: string, fileUrl: string) => {
    const filename = fileUrl.split("/").pop() || "";
    try {
      const res = await fetch(`/api/admin/portfolio/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) loadPortfolio();
      else setMessage(data.message || "Ошибка");
    } catch {
      setMessage("Ошибка удаления");
    }
  };

  const uploadService = async (folder: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const fd = new FormData();
    for (let i = 0; i < fileList.length; i++) fd.append("file", fileList[i]);
    try {
      const res = await fetch(`/api/admin/services/${encodeURIComponent(folder)}`, { method: "POST", headers, body: fd });
      const data = await res.json();
      if (data.success) loadServices();
      else setMessage(data.message || "Ошибка");
    } catch {
      setMessage("Ошибка загрузки");
    }
    e.target.value = "";
  };

  const deleteService = async (folder: string, fileUrl: string) => {
    const filename = fileUrl.split("/").pop() || "";
    try {
      const res = await fetch(`/api/admin/services/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`, { method: "DELETE", headers });
      const data = await res.json();
      if (data.success) loadServices();
      else setMessage(data.message || "Ошибка");
    } catch {
      setMessage("Ошибка удаления");
    }
  };

  if (!settings) {
    return (
      <div style={{ ...panelStyle, margin: panelMode ? 20 : 0 }}>
          <p style={{ color: "rgba(250, 247, 242, 0.6)" }}>Загрузка настроек…</p>
      </div>
    );
  }

  const tabRow = panelMode ? (
    <div style={{ display: "flex", gap: 4, padding: "12px 20px", borderBottom: "1px solid rgba(250, 247, 242, 0.1)", flexWrap: "wrap" }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: activeTab === tab.id ? "rgba(201, 169, 110, 0.3)" : "rgba(250, 247, 242, 0.06)",
            color: "white",
            fontFamily: "ChinaCyr, sans-serif",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ) : null;

  const contentWrap = (content: React.ReactNode, tab: SettingsTab) => {
    if (panelMode && activeTab !== tab) return null;
    return content;
  };

  return (
    <div style={{ marginTop: panelMode ? 0 : 24, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {!panelMode && (
        <h2 style={{ fontFamily: "ChinaCyr, sans-serif", fontSize: "1.75rem", color: "white", marginBottom: 16 }}>
          Настройки сайта
        </h2>
      )}
      {tabRow}
      <div style={{ overflow: "auto", padding: panelMode ? 20 : 0, flex: 1 }}>
        {message && <p style={{ color: "rgba(201, 169, 110, 0.9)", marginBottom: 12 }}>{message}</p>}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Контакты и шрифты</h3>
        <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
          <label style={labelStyle}>Телефон (в меню)</label>
          <input
            style={inputStyle}
            value={settings.contactPhone ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, contactPhone: e.target.value } : null))}
          />
          <label style={labelStyle}>WhatsApp (ссылка)</label>
          <input
            style={inputStyle}
            value={settings.contactWhatsApp ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, contactWhatsApp: e.target.value } : null))}
          />
          <label style={labelStyle}>Telegram (ссылка)</label>
          <input
            style={inputStyle}
            value={settings.contactTelegram ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, contactTelegram: e.target.value } : null))}
          />
          <label style={labelStyle}>Адрес канала для новостей</label>
          <p style={{ color: "rgba(250, 247, 242, 0.65)", fontSize: "0.85rem", marginBottom: 6 }}>
            Username канала (tashiani) или полная ссылка (https://t.me/s/tashiani) — ссылка «Открыть в Telegram»
          </p>
          <input
            style={inputStyle}
            value={settings.telegramNewsChannel ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, telegramNewsChannel: e.target.value.trim() } : null))}
            placeholder="tashiani или https://t.me/s/tashiani"
          />
          <label style={labelStyle}>RSS-лента новостей (отображение на сайте)</label>
          <p style={{ color: "rgba(250, 247, 242, 0.65)", fontSize: "0.85rem", marginBottom: 6 }}>
            URL RSS-ленты канала — посты с фото и видео будут показываться прямо на странице. Создать ленту: rss.app → Telegram → вставьте ссылку на канал
          </p>
          <input
            style={inputStyle}
            value={settings.telegramNewsRssUrl ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, telegramNewsRssUrl: e.target.value.trim() } : null))}
            placeholder="https://rss.app/feeds/..."
          />
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            value={settings.contactEmail ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, contactEmail: e.target.value } : null))}
          />
          <div style={{ marginTop: 16, marginBottom: 8, paddingTop: 16, borderTop: "1px solid rgba(250, 247, 242, 0.2)" }}>
            <span style={labelStyle}>Загрузить свой шрифт</span>
            <p style={{ color: "rgba(250, 247, 242, 0.7)", fontSize: "0.9rem", marginBottom: 8 }}>TTF, WOFF, WOFF2 — сразу появится в списке и в образце ниже</p>
            <form onSubmit={handleFontUpload} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                ref={fontFileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                style={{ ...inputStyle, maxWidth: 220 }}
              />
              <button type="submit" style={btnStyle} disabled={fontUploading}>
                {fontUploading ? "Загрузка…" : "Загрузить"}
              </button>
            </form>
            {fontUploadError && <p style={{ color: "rgba(239,68,68,0.9)", fontSize: "0.9rem", marginTop: 8 }}>{fontUploadError}</p>}
            {(settings.customFonts ?? []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={labelStyle}>Загруженные шрифты:</span>
                {(settings.customFonts ?? []).map((f) => (
                  <div key={f.fontFamily + f.url} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <span style={{ color: "white", fontFamily: "Arial, sans-serif", fontSize: "0.9rem" }}>{f.fontFamily}</span>
                    <button type="button" onClick={() => removeCustomFont(f.fontFamily)} style={{ ...btnStyle, padding: "4px 10px", fontSize: "0.85rem" }} disabled={saving}>Удалить</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label style={labelStyle}>Шрифт меню</label>
          <p style={{ color: "rgba(250, 247, 242, 0.65)", fontSize: "0.85rem", marginBottom: 6 }}>Пункты в шапке: Главная, Услуги, Портфолио, Контакты</p>
          <select
            style={inputStyle}
            value={settings.menuFont ?? "ChinaCyr"}
            onChange={(e) => setSettings((s) => (s ? { ...s, menuFont: e.target.value } : null))}
          >
            {allFontOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ marginTop: 8 }}>
            <span style={labelStyle}>Образец меню:</span>
            <p style={{ fontFamily: `${settings.menuFont ?? "ChinaCyr"}, ChinaCyr, Arial, sans-serif`, fontSize: "1.1rem", color: "white" }}>
              Главная Услуги Портфолио Контакты
            </p>
          </div>
          <label style={labelStyle}>Шрифт заголовков и названий панелей</label>
          <p style={{ color: "rgba(250, 247, 242, 0.65)", fontSize: "0.85rem", marginBottom: 6 }}>Заголовок панели «Контакты», названия разделов Услуг и Портфолио, заголовки в личном кабинете</p>
          <select
            style={inputStyle}
            value={settings.headingFont ?? "ChinaCyr"}
            onChange={(e) => setSettings((s) => (s ? { ...s, headingFont: e.target.value } : null))}
          >
            {allFontOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div style={{ marginTop: 8 }}>
            <span style={labelStyle}>Образец заголовка:</span>
            <p style={{ fontFamily: `${settings.headingFont ?? "ChinaCyr"}, ChinaCyr, Arial, sans-serif`, fontSize: "1.5rem", color: "white" }}>
              Таши-Ани
            </p>
          </div>
          <button style={btnStyle} onClick={() => saveSettings(settings)} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить контакты и шрифты"}
          </button>
        </div>
      </div>,
      "contacts"
        )}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Текст на главной</h3>
        <p style={{ color: "rgba(250, 247, 242, 0.8)", fontSize: "0.9rem", marginBottom: 16 }}>
          Шрифты и максимальная ширина блока. Строки не выходят за эту ширину и переносятся автоматически.
        </p>
        <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
          <label style={labelStyle}>Шрифт заголовка на главной</label>
          <select
            style={inputStyle}
            value={settings.mainPageHeadingFont ?? "ChinaCyr"}
            onChange={(e) => setSettings((s) => (s ? { ...s, mainPageHeadingFont: e.target.value } : null))}
          >
            {allFontOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label style={labelStyle}>Шрифт основного текста на главной</label>
          <select
            style={inputStyle}
            value={settings.mainPageTextFont ?? "ChinaCyr"}
            onChange={(e) => setSettings((s) => (s ? { ...s, mainPageTextFont: e.target.value } : null))}
          >
            {allFontOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <label style={labelStyle}>Макс. ширина блока текста (px)</label>
          <input
            style={inputStyle}
            type="number"
            min={320}
            max={1200}
            step={8}
            value={settings.mainPageTextMaxWidth ?? 720}
            onChange={(e) => setSettings((s) => (s ? { ...s, mainPageTextMaxWidth: parseInt(e.target.value, 10) || undefined } : null))}
          />
          <p style={{ color: "rgba(250, 247, 242, 0.6)", fontSize: "0.85rem" }}>
            Строки переносятся в пределах этой ширины; длинные слова при необходимости разбиваются.
          </p>

          <div style={{ marginTop: 16, padding: 16, background: "rgba(0,0,0,0.25)", borderRadius: 8, maxWidth: settings.mainPageTextMaxWidth ?? 720 }}>
            <p style={{ color: "rgba(250, 247, 242, 0.7)", fontSize: "0.8rem", marginBottom: 10 }}>Как будет выглядеть:</p>
            <div style={{ color: "white", maxWidth: "100%", overflowWrap: "break-word", wordBreak: "break-word" }}>
              <div
                style={{
                  fontFamily: `${settings.mainPageHeadingFont ?? "ChinaCyr"}, ChinaCyr, Arial, sans-serif`,
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  background: "linear-gradient(90deg, rgba(250, 247, 242, 0.9) 0%, rgba(201, 169, 110, 0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: 12,
                  lineHeight: 1.2,
                }}
              >
                {settings.mainPageTitle || "Ландшафт, который рекомендуют"}
              </div>
              <p
                style={{
                  fontFamily: `${settings.mainPageTextFont ?? "ChinaCyr"}, ChinaCyr, Arial, sans-serif`,
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {(settings.mainPageBlocks ?? [])[0] || "Нам доверяют уже более 15 лет"}
              </p>
            </div>
          </div>

          <button style={btnStyle} onClick={() => saveSettings({ mainPageHeadingFont: settings.mainPageHeadingFont, mainPageTextFont: settings.mainPageTextFont, mainPageTextMaxWidth: settings.mainPageTextMaxWidth })} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить шрифты и ширину"}
          </button>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(250, 247, 242, 0.2)" }}>
          <h4 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 8 }}>Редактировать текст на главной</h4>
          <p style={{ color: "rgba(250, 247, 242, 0.7)", fontSize: "0.9rem", marginBottom: 12 }}>Заголовок и блоки текста. Блок 6 — список: каждый пункт с новой строки.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
            <label style={labelStyle}>Заголовок</label>
            <input
              style={inputStyle}
              value={settings.mainPageTitle ?? ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, mainPageTitle: e.target.value } : null))}
              placeholder="Ландшафт, который рекомендуют"
            />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
              const blocks = settings.mainPageBlocks ?? [];
              const label = i === 5 ? "Блок 6 (список — каждый пункт с новой строки)" : [0, 4, 7, 12].includes(i) ? `Блок ${i + 1} (подзаголовок)` : `Блок ${i + 1}`;
              const isList = i === 5;
              return (
                <div key={i}>
                  <label style={{ ...labelStyle, fontSize: "0.9rem" }}>{label}</label>
                  {isList ? (
                    <textarea
                      style={{ ...inputStyle, minHeight: 100 }}
                      value={blocks[i] ?? ""}
                      onChange={(e) => {
                        const next = [...blocks];
                        while (next.length <= i) next.push("");
                        next[i] = e.target.value;
                        setSettings((s) => (s ? { ...s, mainPageBlocks: next } : null));
                      }}
                      placeholder={"Пункт 1\nПункт 2\nПункт 3"}
                    />
                  ) : (
                    <input
                      style={inputStyle}
                      value={blocks[i] ?? ""}
                      onChange={(e) => {
                        const next = [...blocks];
                        while (next.length <= i) next.push("");
                        next[i] = e.target.value;
                        setSettings((s) => (s ? { ...s, mainPageBlocks: next } : null));
                      }}
                    />
                  )}
                </div>
              );
            })}
            <button style={btnStyle} onClick={() => saveSettings({ mainPageTitle: settings.mainPageTitle, mainPageBlocks: settings.mainPageBlocks })} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить текст"}
            </button>
          </div>
        </div>
      </div>,
      "text"
        )}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Карта</h3>
        <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <label style={labelStyle}>Центр карты: долгота</label>
          <input
            style={inputStyle}
            type="number"
            step="any"
            value={settings.mapCenterLon ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, mapCenterLon: parseFloat(e.target.value) || undefined } : null))}
          />
          <label style={labelStyle}>Центр карты: широта</label>
          <input
            style={inputStyle}
            type="number"
            step="any"
            value={settings.mapCenterLat ?? ""}
            onChange={(e) => setSettings((s) => (s ? { ...s, mapCenterLat: parseFloat(e.target.value) || undefined } : null))}
          />
          <label style={labelStyle}>Логотип на карте</label>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 auto" }}>
              <img
                src={(settings.mapLogoPath || "/points/default.png") + "?v=" + mapLogoVersion}
                alt="Логотип"
                style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, border: "1px solid rgba(250, 247, 242, 0.2)", background: "rgba(0,0,0,0.2)" }}
                onError={(e) => { (e.target as HTMLImageElement).src = "/points/default.png"; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={uploadMapLogo}
                style={{ fontSize: "0.9rem" }}
              />
              <button type="button" style={{ ...btnStyle, marginTop: 0 }} onClick={resetMapLogo}>
                Сбросить на стандартный
              </button>
            </div>
          </div>
          <button style={btnStyle} onClick={() => saveSettings({ mapCenterLon: settings.mapCenterLon, mapCenterLat: settings.mapCenterLat, mapLogoPath: settings.mapLogoPath, siteLogoPath: settings.siteLogoPath })} disabled={saving}>
            Сохранить настройки карты
          </button>
        </div>
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Логотип в шапке (в круге)</h4>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 auto" }}>
              <img
                src={(settings.siteLogoPath || "/logo_new.png") + "?v=" + headerLogoVersion}
                alt="Логотип сайта"
                style={{ width: 64, height: 64, objectFit: "contain", borderRadius: "50%", border: "2px solid rgba(211,163,115,0.5)", background: "rgba(0,0,0,0.2)" }}
                onError={(e) => { (e.target as HTMLImageElement).src = "/logo_new.png"; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={uploadHeaderLogo}
                style={{ fontSize: "0.9rem" }}
              />
              <button type="button" style={{ ...btnStyle, marginTop: 0 }} onClick={resetHeaderLogo}>
                Сбросить на стандартный
              </button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontFamily: "ChinaCyr, sans-serif", color: "rgba(250, 247, 242, 0.9)", marginBottom: 8 }}>Точки (координаты)</h4>
          <p style={{ fontSize: "0.9rem", color: "rgba(250, 247, 242, 0.7)", marginBottom: 8 }}>
            Формат: lon;lat;файл_маркера (файл опционален). Редактируйте и сохраняйте.
          </p>
          <textarea
            style={{ ...inputStyle, minHeight: 120, fontFamily: "monospace" }}
            value={points.map((p) => `${p.lon};${p.lat}${p.file ? ";" + p.file : ""}`).join("\n")}
            onChange={(e) =>
              setPoints(
                e.target.value
                  .trim()
                  .split(/\r?\n/)
                  .filter(Boolean)
                  .map((row) => {
                    const [lonStr, latStr, file] = row.split(/[,;]/).map((s) => s.trim());
                    return { lon: parseFloat(lonStr) || 0, lat: parseFloat(latStr) || 0, ...(file ? { file } : {}) };
                  })
              )
            }
          />
          <button style={btnStyle} onClick={savePoints}>Сохранить точки</button>
        </div>
      </div>,
      "map"
        )}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Фоновые фото</h3>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.avif" onChange={uploadBg} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {bgImages.map((url) => (
            <div key={url} style={{ position: "relative" }}>
              <img src={url} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8 }} />
              <button
                type="button"
                style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(239,68,68,0.9)", color: "white", cursor: "pointer", fontSize: 14 }}
                onClick={() => deleteBg(url)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>,
      "bg"
        )}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Портфолио (фото по разделам)</h3>
        <select
          style={{ ...inputStyle, maxWidth: 300, marginBottom: 12 }}
          value={activePortfolioFolder}
          onChange={(e) => setActivePortfolioFolder(e.target.value)}
        >
          {portfolioProjects.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        {activePortfolioFolder && (
          <>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.webm,.mov"
              onChange={(e) => uploadPortfolio(activePortfolioFolder, e)}
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {(portfolioProjects.find((p) => p.name === activePortfolioFolder)?.items ?? []).map((item) => (
                <div key={item.file} style={{ position: "relative" }}>
                  {item.file.match(/\.(mp4|webm|mov)$/i) ? (
                    <video src={item.file} style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8 }} muted />
                  ) : (
                    <img src={item.file} alt="" style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8 }} />
                  )}
                  <button
                    type="button"
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(239,68,68,0.9)", color: "white", cursor: "pointer", fontSize: 12 }}
                    onClick={() => deletePortfolio(activePortfolioFolder, item.file)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>,
      "portfolio"
        )}

        {contentWrap(
      <div style={panelStyle}>
        <h3 style={{ fontFamily: "ChinaCyr, sans-serif", color: "white", marginBottom: 12 }}>Фото на панелях Услуг</h3>
        <select
          style={{ ...inputStyle, maxWidth: 300, marginBottom: 12 }}
          value={activeServiceFolder}
          onChange={(e) => setActiveServiceFolder(e.target.value)}
        >
          {SERVICE_FOLDERS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.webm,.mov"
          multiple
          onChange={(e) => uploadService(activeServiceFolder, e)}
          style={{ marginBottom: 12 }}
        />
        <p style={{ color: "rgba(250, 247, 242, 0.6)", fontSize: "0.85rem", marginTop: -6, marginBottom: 12 }}>Можно выбрать несколько файлов сразу</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {(servicesProjects.find((p) => p.name === activeServiceFolder)?.items ?? []).map((item) => (
            <div key={item.file} style={{ position: "relative" }}>
              {item.file.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={item.file} style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8 }} muted />
              ) : (
                <img src={item.file} alt="" style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8 }} />
              )}
              <button
                type="button"
                style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(239,68,68,0.9)", color: "white", cursor: "pointer", fontSize: 12 }}
                onClick={() => deleteService(activeServiceFolder, item.file)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>,
      "services"
        )}
      </div>
    </div>
  );
}
