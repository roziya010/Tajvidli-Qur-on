import { TajweedRuleCode, TajweedSegment, TajweedWord } from '../quran/quranTypes';

export interface TajweedRuleInfo {
  code: TajweedRuleCode;
  name: string;
  arabicName: string;
  color: string;
  description: string;
}

export const TAJWEED_RULES: Record<TajweedRuleCode, TajweedRuleInfo> = {
  h: {
    code: 'h',
    name: 'Hamzatul-vasl',
    arabicName: 'همزة الوصل',
    color: '#9CA3AF',
    description: "Oldingi so'zdan ulab o'qilganda tushib qoladigan bog'lovchi hamza.",
  },
  l: {
    code: 'l',
    name: 'Lami shamsiya',
    arabicName: 'اللام الشمسية',
    color: '#9CA3AF',
    description: 'Keyingi shamsiy harfga singib ketadigan lam harfi.',
  },
  s: {
    code: 's',
    name: 'Talaffuz qilinmaydigan harf',
    arabicName: 'حرف صامت',
    color: '#9CA3AF',
    description: "Usmoniy xatda yoziladi, ammo o'qilmaydi.",
  },
  n: {
    code: 'n',
    name: 'Maddi asliy (2 harakat)',
    arabicName: 'مد طبيعي',
    color: '#B45309',
    description: "2 harakat miqdorida cho'ziladigan tabiiy madd.",
  },
  p: {
    code: 'p',
    name: 'Maddi oriz lis-sukun',
    arabicName: 'مد عارض للسكون',
    color: '#C2410C',
    description: "Vaqf (to'xtash) holatida 2, 4 yoki 6 harakat cho'zish.",
  },
  o: {
    code: 'o',
    name: 'Maddi vojib / joiz (4–5)',
    arabicName: 'مد واجب / جائز',
    color: '#DC2626',
    description: "Hamzadan oldin 4 yoki 5 harakat cho'ziladigan madd.",
  },
  m: {
    code: 'm',
    name: 'Maddi lozim (6 harakat)',
    arabicName: 'مد لازم',
    color: '#991B1B',
    description: "Majburiy ravishda to'liq 6 harakat cho'ziladigan madd.",
  },
  g: {
    code: 'g',
    name: "G'unna (2 harakat)",
    arabicName: 'غنة',
    color: '#059669',
    description: "Tashdidli Nun va Mim harflarida dimog' orqali 2 harakat ohang chiqarish.",
  },
  q: {
    code: 'q',
    name: 'Qalqala',
    arabicName: 'قلقلة',
    color: '#2563EB',
    description: 'ق ط ب ج د harflari sokin bo‘lganda tebratib, aks-sado bilan talaffuz qilish.',
  },
  f: {
    code: 'f',
    name: 'Ixfo',
    arabicName: 'إخفاء',
    color: '#0D9488',
    description: "Sokin Nun yoki tanvinni g'unna bilan yashirin o'tish.",
  },
  c: {
    code: 'c',
    name: 'Ixfoi shafaviy',
    arabicName: 'إخفاء شفوي',
    color: '#0F766E',
    description: "Sokin Mim harfini Ba dan oldin lablar bilan yengil yashirish va g'unna qilish.",
  },
  i: {
    code: 'i',
    name: 'Iqlob',
    arabicName: 'إقلاب',
    color: '#7C3AED',
    description: 'Ba harfidan oldin sokin Nun yoki tanvinni yengil Mim tovushiga aylantirish.',
  },
  a: {
    code: 'a',
    name: "Idg'om ma'al g'unna",
    arabicName: 'إدغام بغنة',
    color: '#15803D',
    description: "Sokin Nun yoki tanvinni ي ن م و harflariga g'unna bilan qo'shish.",
  },
  u: {
    code: 'u',
    name: "Idg'om bilo g'unna",
    arabicName: 'إدغام بلا غنة',
    color: '#64748B',
    description: "ل yoki ر harflariga g'unnasiz to'liq qo'shib o'qish.",
  },
  w: {
    code: 'w',
    name: "Idg'om shafaviy",
    arabicName: 'إدغام شفوي',
    color: '#166534',
    description: "Sokin Mimni keyingi Mim harfiga g'unna bilan qo'shish.",
  },
  d: {
    code: 'd',
    name: "Idg'om mutajonisayn",
    arabicName: 'إدغام متجانسين',
    color: '#4F46E5',
    description: "Bir xil maxrajdan chiqadigan ikki harfni bir-biriga qo'shish.",
  },
  b: {
    code: 'b',
    name: "Idg'om mutaqoribayn",
    arabicName: 'إدغام متقاربين',
    color: '#4F46E5',
    description: "Maxraji yaqin bo'lgan ikki harfni qo'shib talaffuz qilish.",
  },
};

const VALID_CODES = new Set<string>(Object.keys(TAJWEED_RULES));

/**
 * Normalize Arabic text strictly for matching/comparison purposes.
 * NEVER use this output for display — display always uses verified Uthmani script.
 */
export function normalizeArabicForMatch(input: string, expandDaggerAlif = false): string {
  const prepared = expandDaggerAlif
    ? input.replace(/[\u0670\u0671\u0672\u0673]/g, 'ا')
    : input.replace(/\u0670/g, '').replace(/[\u0672\u0673]/g, 'ا');
  return prepared
    .replace(/[\u064B-\u065F\u06D6-\u06ED\u0640\uFEFF]/g, '') // strip harakat, sukun, shaddah, madd, waqf marks, tatweel
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0621-\u064A\s]/g, '')
    .trim();
}

/**
 * Split an Arabic Uthmani word into base letter clusters (each base Arabic letter
 * paired with its immediately following combining diacritics/harakat) so highlighting
 * a single erroneous letter never detaches its harakat or breaks script integrity.
 */
export function splitArabicWordIntoClusters(word: string): string[] {
  const clusters: string[] = [];
  for (const ch of Array.from(word)) {
    const code = ch.charCodeAt(0);
    const isCombining =
      (code >= 0x064b && code <= 0x065f) ||
      code === 0x0670 ||
      (code >= 0x06d6 && code <= 0x06ed) ||
      code === 0x0610 ||
      code === 0x0611 ||
      code === 0x0612 ||
      code === 0x0613 ||
      code === 0x0614 ||
      code === 0x0615;
    if (isCombining && clusters.length > 0) {
      clusters[clusters.length - 1] += ch;
    } else {
      clusters.push(ch);
    }
  }
  return clusters;
}

/**
 * Parses AlQuran Cloud bracketed Tajweed text (e.g. "بِسْمِ [h:1[ٱ]للَّهِ")
 * into flat TajweedSegments without losing or modifying any Arabic character.
 */
export function parseTajweedAyahSegments(tajweedText: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  let i = 0;

  while (i < tajweedText.length) {
    if (tajweedText[i] === '[') {
      // Match [code[:id]?[inner]]
      const openInner = tajweedText.indexOf('[', i + 1);
      const closeOuter = tajweedText.indexOf(']', openInner + 1);
      if (openInner !== -1 && closeOuter !== -1) {
        const header = tajweedText.slice(i + 1, openInner);
        const codeChar = header.split(':')[0];
        const innerText = tajweedText.slice(openInner + 1, closeOuter);
        const rule = VALID_CODES.has(codeChar) ? (codeChar as TajweedRuleCode) : null;
        if (innerText.length > 0) {
          segments.push({ text: innerText, rule });
        }
        i = closeOuter + 1;
        continue;
      }
    }

    const nextBracket = tajweedText.indexOf('[', i);
    const chunk = nextBracket === -1 ? tajweedText.slice(i) : tajweedText.slice(i, nextBracket);
    if (chunk.length > 0) {
      segments.push({ text: chunk, rule: null });
    }
    i = nextBracket === -1 ? tajweedText.length : nextBracket;
  }

  return segments;
}

/**
 * Converts a full Ayah's Tajweed-annotated text into word tokens while preserving
 * intra-word Tajweed spans and keeping the exact original Uthmani text intact.
 */
export function buildTajweedWordsForAyah(
  tajweedText: string,
  surah: number,
  ayah: number,
  startingWordIndex: number
): TajweedWord[] {
  const rawSegments = parseTajweedAyahSegments(tajweedText);
  const words: TajweedWord[] = [];

  let currentSegments: TajweedSegment[] = [];
  let wordInAyah = 0;

  const flushWord = () => {
    if (currentSegments.length === 0) return;
    const uthmani = currentSegments.map((s) => s.text).join('');
    // Skip standalone Quranic stop marks (like ۖ ۗ ۘ ۙ ۚ ۛ ۜ) if isolated by whitespace;
    // attach trailing waqf mark to previous word instead so it stays in the Mushaf!
    if (/^[\u06D6-\u06ED\u06DE]+$/.test(uthmani) && words.length > 0) {
      const prev = words[words.length - 1];
      prev.uthmani += ' ' + uthmani;
      prev.segments.push({ text: ' ' + uthmani, rule: null });
      currentSegments = [];
      return;
    }

    const rulesPresent = Array.from(
      new Set(currentSegments.map((s) => s.rule).filter((r): r is TajweedRuleCode => r !== null))
    );

    words.push({
      wordIndex: startingWordIndex + words.length,
      surah,
      ayah,
      wordInAyah: ++wordInAyah,
      uthmani,
      normalized: normalizeArabicForMatch(uthmani),
      segments: currentSegments,
      rulesPresent,
    });
    currentSegments = [];
  };

  for (const seg of rawSegments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        flushWord();
      } else {
        const last = currentSegments[currentSegments.length - 1];
        if (last && last.rule === seg.rule) {
          last.text += part;
        } else {
          currentSegments.push({ text: part, rule: seg.rule });
        }
      }
    }
  }
  flushWord();

  return words;
}
