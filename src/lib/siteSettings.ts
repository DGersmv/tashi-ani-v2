import { prisma } from '@/lib/prisma';

export type CustomFontItem = { fontFamily: string; url: string };

export type SiteSettingsPayload = {
  menuFont?: string;
  headingFont?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactTelegram?: string;
  contactEmail?: string;
  mapCenterLon?: number;
  mapCenterLat?: number;
  mapLogoPath?: string;
  siteLogoPath?: string;
  telegramNewsChannel?: string;
  /** URL RSS-ленты канала (например из rss.app) — для отображения постов с фото/видео на сайте */
  telegramNewsRssUrl?: string;
  customFonts?: CustomFontItem[];
  mainPageHeadingFont?: string;
  mainPageTextFont?: string;
  mainPageTextMaxWidth?: number;
  mainPageTitle?: string;
  mainPageBlocks?: string[];
};

const DEFAULT_MAIN_PAGE_TITLE = 'Ландшафт, который рекомендуют';
const DEFAULT_MAIN_PAGE_BLOCKS = [
  'Нам доверяют уже более 15 лет',
  '90% наших клиентов приходят по личным рекомендациям — потому что мы создаём',
  'не просто красивые пространства, а действительно комфортные и функциональные',
  'участки, которые работают на ваш стиль жизни.',
  'Мы умеем решать сложные задачи:',
  'Перепады высот, затопление, сложные грунты — решаем.\nИндивидуальный подход: отражение вкусов и привычек клиента.\nПодбор растений по цвету, простоте ухода и эксклюзивности.\nОриентация только на реальные примеры в нашем климате.',
  'Наши принципы: логика, функциональность, эстетика.',
  'Личный онлайн-кабинет заказчика',
  'Все этапы, документы, фото- и видеоотчёты, комментарии — в одном месте, с любого устройства.',
  'Мы ведём проект от первого выезда до сдачи и последующего сервиса.',
  'Архитектурное образование и опыт позволяют принимать грамотные решения на всех стадиях.',
  'Экономим бюджет за счёт продуманной последовательности и прозрачных процессов.',
  'Вы получаете не просто проект, а надёжного партнёра на всех этапах.',
];

export const SITE_SETTINGS_DEFAULTS: SiteSettingsPayload = {
  menuFont: 'ChinaCyr',
  headingFont: 'ChinaCyr',
  contactPhone: '+7 921 952-61-17',
  contactWhatsApp: 'https://wa.me/79219526117',
  contactTelegram: 'https://t.me/tashiani',
  contactEmail: 'info@tashi-ani.ru',
  telegramNewsChannel: 'tashiani',
  mapCenterLon: 30.36,
  mapCenterLat: 59.94,
  mapLogoPath: '/points/default.png',
  siteLogoPath: '/logo_new.png',
  customFonts: [],
  mainPageHeadingFont: 'ChinaCyr',
  mainPageTextFont: 'ChinaCyr',
  mainPageTextMaxWidth: 720,
  mainPageTitle: DEFAULT_MAIN_PAGE_TITLE,
  mainPageBlocks: DEFAULT_MAIN_PAGE_BLOCKS,
};

const CYRILLIC_FALLBACK = 'ChinaCyr, Arial, Helvetica, sans-serif';

/** Строка font-family для меню/заголовков (для SSR и инлайн-стилей). */
export function buildFontStack(selectedFont: string): string {
  const font = (selectedFont?.trim() || 'ChinaCyr');
  return `${font}, ${CYRILLIC_FALLBACK}`;
}

/** Server-side: read merged site settings from DB (for layout SSR and API). */
export async function getSiteSettings(): Promise<SiteSettingsPayload> {
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { id: 'asc' } });
    const json = row?.json;
    return json
      ? { ...SITE_SETTINGS_DEFAULTS, ...JSON.parse(json) }
      : { ...SITE_SETTINGS_DEFAULTS };
  } catch (e) {
    console.error('getSiteSettings', e);
    return { ...SITE_SETTINGS_DEFAULTS };
  }
}
