import { toDariDigits } from "./dariNumberFormatter";

export const formatTimeDari = (dateString) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    let hours;
    let minutes;
    if (isNaN(d.getTime())) {
      const timePart = dateString.includes("T")
        ? dateString.split("T")[1]
        : dateString.split(" ")[1];
      if (timePart) {
        const [hh, mm] = timePart.split(":");
        hours = parseInt(hh, 10);
        minutes = String(mm || "00").slice(0, 2).padStart(2, "0");
      } else {
        return "—";
      }
    } else {
      hours = d.getHours();
      minutes = String(d.getMinutes()).padStart(2, "0");
    }

    const period = hours >= 12 ? "ب.ظ" : "ق.ظ";
    const hour12 = hours % 12 || 12;
    return `${toDariDigits(hour12)}:${toDariDigits(minutes)} ${period}`;
  } catch {
    return "—";
  }
};
