import { LetterErrorDetail } from '../quran/quranTypes';
import { normalizeArabicForMatch, splitArabicWordIntoClusters } from '../tajweed/tajweedParser';

export interface MakhrajCatalogItem {
  letter: string;
  name: string;
  makhraj: string;
  sifat: string;
  commonConfusion?: string;
}

export const ARABIC_MAKHARIJ_CATALOG: MakhrajCatalogItem[] = [
  { letter: 'ا', name: 'Alif', makhraj: "Al-Javf (Og'iz va halqum bo'shlig'i)", sifat: "Madd cho'zish, ochiqlik", commonConfusion: "Qisqa va cho'ziq Alif maddi" },
  { letter: 'ب', name: 'Ba', makhraj: 'Ash-Shafatan (Ikki labning yopilishi)', sifat: "Jahr, Shidda, sokin bo'lganda Qalqala" },
  { letter: 'ت', name: 'Ta', makhraj: 'Til uchi yuqori old tishlar milkiga tegadi', sifat: 'Hams, Shidda, Istifol (ingichka)', commonConfusion: "Yo'g'on ط bilan adashtiriladi" },
  { letter: 'ث', name: 'Sa', makhraj: 'Til uchi yuqori old tishlar qirrasiga tegadi', sifat: 'Hams, Rixva, tishlararo', commonConfusion: 'س bilan adashtiriladi' },
  { letter: 'ج', name: 'Jim', makhraj: "Til o'rtasi qattiq tanglayga tegadi", sifat: "Jahr, Shidda, sokin bo'lganda Qalqala" },
  { letter: 'ح', name: 'Ha (Halqum)', makhraj: "O'rta halqum (Vasatul-halq)", sifat: "Hams, Rixva, tiniq nafasli halqum tovushi", commonConfusion: 'Yumshoq ه bilan adashtiriladi' },
  { letter: 'خ', name: 'Xo', makhraj: 'Yuqori halqum (Adnal-halq)', sifat: "Hams, Rixva, Isti'lo (yo'g'on)" },
  { letter: 'د', name: 'Dal', makhraj: 'Til uchi yuqori old tishlar milkiga tegadi', sifat: "Jahr, Shidda, Istifol, sokin bo'lganda Qalqala", commonConfusion: "Yo'g'on ض bilan adashtiriladi" },
  { letter: 'ذ', name: 'Zal', makhraj: 'Til uchi yuqori old tishlar qirrasiga tegadi', sifat: 'Jahr, Rixva, tishlararo', commonConfusion: 'ز bilan adashtiriladi' },
  { letter: 'ر', name: 'Ro', makhraj: 'Til uchi va cheti yuqori tanglay qirrasiga tegadi', sifat: 'Jahr, Tavassut, Takrir (bir tebranish), Tafxim/Tarqiq' },
  { letter: 'ز', name: 'Zay', makhraj: 'Til uchi pastki old tishlar yaqinida', sifat: 'Jahr, Rixva, Safir (hushtakli)', commonConfusion: 'ذ bilan adashtiriladi' },
  { letter: 'س', name: 'Sin', makhraj: 'Til uchi pastki old tishlar yaqinida', sifat: 'Hams, Rixva, Safir, Istifol (ingichka)', commonConfusion: "Yo'g'on ص yoki ث bilan adashtiriladi" },
  { letter: 'ش', name: 'Shin', makhraj: "Til o'rtasi qattiq tanglayga", sifat: 'Hams, Rixva, Tafashshi (havo tarqalishi)' },
  { letter: 'ص', name: 'Sod', makhraj: "Til uchi pastki tishlar yaqinida + til orqasi ko'tarilgan", sifat: "Hams, Rixva, Isti'lo, Itboq, Safir (yo'g'on)", commonConfusion: 'Ingichka س bilan adashtiriladi' },
  { letter: 'ض', name: 'Dod', makhraj: 'Tilning yon cheti yuqori oziq tishlarga bosiladi', sifat: "Jahr, Rixva, Isti'lo, Itboq, Istitola", commonConfusion: 'د yoki ظ bilan adashtiriladi' },
  { letter: 'ط', name: 'To', makhraj: "Til uchi yuqori tish milkiga + til orqasi ko'tarilgan", sifat: "Jahr, Shidda, Isti'lo, Itboq, sokin bo'lganda Qalqala", commonConfusion: 'Ingichka ت bilan adashtiriladi' },
  { letter: 'ظ', name: 'Zo', makhraj: "Til uchi yuqori tishlar qirrasida + til orqasi ko'tarilgan", sifat: "Jahr, Rixva, Isti'lo, Itboq" },
  { letter: 'ع', name: 'Ayn', makhraj: "O'rta halqum (Vasatul-halq)", sifat: 'Jahr, Tavassut (chuqur halqum siqilishi)', commonConfusion: 'Hamza أ / ء bilan adashtiriladi' },
  { letter: 'غ', name: "G'oyn", makhraj: 'Yuqori halqum (Adnal-halq)', sifat: "Jahr, Rixva, Isti'lo (yo'g'on)" },
  { letter: 'ف', name: 'Fa', makhraj: 'Pastki lab ichki qismi yuqori old tishlarga', sifat: 'Hams, Rixva' },
  { letter: 'ق', name: 'Qof', makhraj: 'Tilning eng chuqur orqa qismi yumshoq tanglayga', sifat: "Jahr, Shidda, Isti'lo, sokin bo'lganda Qalqala", commonConfusion: 'Yengilroq ك bilan adashtiriladi' },
  { letter: 'ك', name: 'Kaf', makhraj: 'Til orqasi qattiq va yumshoq tanglay tutashgan joyga', sifat: 'Hams, Shidda, Istifol (ingichka)', commonConfusion: "Chuqur ق bilan adashtiriladi" },
  { letter: 'ل', name: 'Lam', makhraj: 'Tilning old chetlari yuqori milklarga', sifat: 'Jahr, Tavassut, Inhirof' },
  { letter: 'م', name: 'Mim', makhraj: "Ikki lab yopilishi + Al-Xayshum (dimog')", sifat: "Jahr, Tavassut, G'unna" },
  { letter: 'ن', name: 'Nun', makhraj: "Til uchi yuqori milklarga + Al-Xayshum (dimog')", sifat: "Jahr, Tavassut, G'unna" },
  { letter: 'ه', name: 'Ha (Tub)', makhraj: 'Eng chuqur halqum / tovush paychalari (Aqsal-halq)', sifat: 'Hams, Rixva, Istifol', commonConfusion: "O'rta halqum ح bilan adashtiriladi" },
  { letter: 'و', name: 'Vov', makhraj: 'Ikki labni yumaloqlash (Madd uchun Al-Javf)', sifat: 'Jahr, Rixva' },
  { letter: 'ي', name: 'Ya', makhraj: "Til o'rtasi (Madd uchun Al-Javf)", sifat: 'Jahr, Rixva' },
];

const CONFUSABLE_PAIRS: Array<{
  a: string;
  b: string;
  rule: string;
  tipA: string;
  tipB: string;
}> = [
  {
    a: 'س',
    b: 'ص',
    rule: "Isti'lo va Itboq (Ingichka س va Yo'g'on ص)",
    tipA: "Sin (س) harfini ingichka va tiniq aytish uchun til orqasini pastda tuting.",
    tipB: "Sod (ص) harfini yo'g'on va to'liq chiqarish uchun til orqasini yuqori tanglayga ko'taring.",
  },
  {
    a: 'ت',
    b: 'ط',
    rule: "Tafxim va Itboq (Ingichka ت va Yo'g'on ط)",
    tipA: "Ta (ت) harfini yengil hams (nafas) bilan, tilni tekis tutib talaffuz qiling.",
    tipB: "To (ط) harfida til orqasini ko'tarib, ortiqcha nafas chiqarmasdan yo'g'on ayting.",
  },
  {
    a: 'د',
    b: 'ض',
    rule: 'Maxrajul-lison (Dal د va Dod ض)',
    tipA: "Dal (د) uchun til uchini yuqori old tishlar milkiga aniq tekkizing.",
    tipB: "Dod (ض) harfini tilning yon chetini yuqori oziq tishlarga bosib yo'g'on chiqaring.",
  },
  {
    a: 'ذ',
    b: 'ز',
    rule: 'Tishlararo ذ va Hushtakli ز',
    tipA: "Zal (ذ) uchun til uchini yuqori old tishlar qirrasiga yumshoq tekkizing.",
    tipB: "Zay (ز) uchun tilni tishlar ortida tutib, tiniq hushtakli tovush chiqaring.",
  },
  {
    a: 'ح',
    b: 'ه',
    rule: "Halqum maxraji (O'rta ح va Tub ه)",
    tipA: "Ha (ح) harfini o'rta halqumni yengil siqib, tiniq nafas bilan chiqaring.",
    tipB: "Ha (ه) harfini halqumning eng tubidan yumshoq va erkin chiqaring.",
  },
  {
    a: 'ع',
    b: 'ا',
    rule: 'Halqum Ayn ع va Hamza أ',
    tipA: "Ayn (ع) uchun o'rta halqumni tovushni uzmasdan ravon siqing.",
    tipB: "Hamzani halqumni siqmasdan, tovush paychalaridan tiniq chiqaring.",
  },
  {
    a: 'ق',
    b: 'ك',
    rule: 'Chuqur Qof ق va Yumshoq Kaf ك',
    tipA: "Qof (ق) harfini tilning eng orqa qismi bilan yumshoq tanglayga urib yo'g'on ayting.",
    tipB: "Kaf (ك) harfini biroz oldinroqdan, qattiq tanglayga yengil nafas bilan talaffuz qiling.",
  },
  {
    a: 'ث',
    b: 'س',
    rule: 'Tishlararo Sa ث va Sirg‘aluvchi Sin س',
    tipA: "Sa (ث) harfi uchun til uchini yuqori old tishlar qirrasiga yengil tekkizing.",
    tipB: "Sin (س) harfi uchun til uchini pastki tishlar ortida saqlang.",
  },
];

export function findMakhrajForLetter(letter: string): MakhrajCatalogItem | undefined {
  const base = normalizeArabicForMatch(letter)[0] || letter;
  return ARABIC_MAKHARIJ_CATALOG.find((item) => item.letter === base);
}

/**
 * Oflayn / Zaxira harf darajasidagi taqqoslash:
 * Kutilgan arabcha so'z bilan eshitilgan transkripsiyani solishtiradi.
 * HALOL TASHXIS QOIDASI: Faqat bitta aniq harf almashinuvi topilsagina 'medium' beradi.
 */
export function detectLetterMismatchFromTranscript(
  expectedUthmani: string,
  heardArabic: string
): LetterErrorDetail | undefined {
  const expClusters = splitArabicWordIntoClusters(expectedUthmani);
  const expNormCompact = normalizeArabicForMatch(expectedUthmani, false);
  const expNormExpanded = normalizeArabicForMatch(expectedUthmani, true);
  const heardPlain = normalizeArabicForMatch(heardArabic, true);

  if (!heardPlain || expNormCompact === heardPlain || expNormExpanded === heardPlain) {
    return undefined;
  }

  const useExpanded =
    Math.abs(expNormExpanded.length - heardPlain.length) <=
    Math.abs(expNormCompact.length - heardPlain.length);
  const expPlain = useExpanded ? expNormExpanded : expNormCompact;
  const expNormChars = expClusters.map((c) => normalizeArabicForMatch(c, useExpanded));

  if (Math.abs(expPlain.length - heardPlain.length) <= 1) {
    let diffCount = 0;
    let diffIdx = -1;
    const minLen = Math.min(expPlain.length, heardPlain.length);
    for (let i = 0; i < minLen; i++) {
      if (expPlain[i] !== heardPlain[i]) {
        diffCount++;
        diffIdx = i;
      }
    }
    diffCount += Math.abs(expPlain.length - heardPlain.length);

    if (diffCount === 1 && diffIdx !== -1 && diffIdx < heardPlain.length) {
      const expectedChar = expPlain[diffIdx];
      const heardChar = heardPlain[diffIdx];
      const clusterIndex = expNormChars.findIndex(
        (norm, idx) => idx >= Math.min(diffIdx, expNormChars.length - 1) && norm.includes(expectedChar)
      );
      const pair = CONFUSABLE_PAIRS.find(
        (p) => (p.a === expectedChar && p.b === heardChar) || (p.b === expectedChar && p.a === heardChar)
      );

      if (pair) {
        const info = findMakhrajForLetter(expectedChar);
        return {
          letterConfidence: 'medium',
          expectedLetter: expectedChar,
          heardLetter: heardChar,
          letterPositionInWord: clusterIndex !== -1 ? clusterIndex : diffIdx,
          makhrajCategory: pair.rule,
          sifatNote: info?.sifat || 'Maxraj talaffuzi',
          coachingTip: pair.a === expectedChar ? pair.tipA : pair.tipB,
        };
      }
    }
  }

  return {
    letterConfidence: 'word_only',
    expectedLetter: '',
    heardLetter: '',
    letterPositionInWord: -1,
    makhrajCategory: "So'z talaffuzi",
    sifatNote: "So'z darajasida talaffuz tafovuti",
    coachingTip: "Talaffuzda xatolik bo'lishi mumkin. Iltimos, ushbu so'zni qaytadan aniq o'qing.",
  };
}
