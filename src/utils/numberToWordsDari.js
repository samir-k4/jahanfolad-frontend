// Afghan Dari Number to Words Converter (تبدیل عدد به حروف با لهجه و رسم‌الخط دری افغانستان)
// مثال: ۲۰۰ = دو صد (نه دویست)، ۵۰۰ = پنج صد (نه پانصد)، ۳۰۰ = سه صد، ۱۰۰۰ = یک هزار

export function numberToWordsDari(num, currency = "") {
  let n = Math.floor(Math.abs(Number(num)));
  if (!num || isNaN(num) || n === 0) {
    return currency ? `صفر ${currency}`.trim() : "صفر";
  }

  const ones = [
    "",
    "یک",
    "دو",
    "سه",
    "چهار",
    "پنج",
    "شش",
    "هفت",
    "هشت",
    "نه",
    "ده",
    "یازده",
    "دوازده",
    "سیزده",
    "چهارده",
    "پانزده",
    "شانزده",
    "هفده",
    "هجده",
    "نوزده",
  ];

  const tens = [
    "",
    "",
    "بیست",
    "سی",
    "چهل",
    "پنجاه",
    "شصت",
    "هفتاد",
    "هشتاد",
    "نود",
  ];

  // صدها به لهجه و زبان رسمی دری افغانستان
  const hundreds = [
    "",
    "یک صد",
    "دو صد",
    "سه صد",
    "چهار صد",
    "پنج صد",
    "شش صد",
    "هفت صد",
    "هشت صد",
    "نه صد",
  ];

  const thousands = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  function convertThreeDigits(n) {
    let str = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      str += hundreds[h];
    }

    const lastTwo = n % 100;
    if (lastTwo > 0) {
      if (str !== "") str += " و ";
      if (lastTwo < 20) {
        str += ones[lastTwo];
      } else {
        str += tens[t];
        if (o > 0) {
          str += " و " + ones[o];
        }
      }
    }
    return str;
  }

  let parts = [];
  let chunkCount = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      let chunkStr = convertThreeDigits(chunk);
      if (chunkCount > 0) {
        chunkStr += " " + thousands[chunkCount];
      }
      parts.unshift(chunkStr);
    }
    n = Math.floor(n / 1000);
    chunkCount++;
  }

  const words = parts.join(" و ");
  return currency ? `${words} ${currency}`.trim() : words;
}

// Alias for compatibility
export const numberToWordsPersian = numberToWordsDari;
export default numberToWordsDari;
