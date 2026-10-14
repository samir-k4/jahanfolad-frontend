// src/data/mockData.js

export const branches = [
  { id: 1, name: "جهان فولاد", location: "پارک های صنعتی" },
  { id: 2, name: "گاز گروپ", location: "سه راهی گاز گروپ" }
];

export const categories = [
  { id: 1, name: "میخ" },
  { id: 2, name: "سیم" },
  { id: 3, name: "سیخ گول" },
  { id: 4, name: "گادر" }
];

export const products = [
  { id: 1, category_id: 1, name: "میخ ۲ انچ کارتن", weights: ["5kg", "12kg", "25kg"] },
  { id: 2, category_id: 1, name: "میخ ۳ انچ کارتن", weights: ["5kg", "12kg", "25kg"] },
  { id: 3, category_id: 2, name: "سیم سیاه", weights: ["25kg", "50kg"] },
  { id: 4, category_id: 2, name: "سیم گالوانیزه", weights: ["25kg", "50kg"] },
  { id: 5, category_id: 3, name: "سیخ گول ۱۶", weights: ["100kg", "200kg"] },
  { id: 6, category_id: 3, name: "سیخ گول ۲۰", weights: ["100kg", "200kg"] },
  { id: 7, category_id: 4, name: "گادر ۱۴", weights: ["100kg", "200kg"] },
  { id: 8, category_id: 4, name: "گادر ۱۸", weights: ["100kg", "200kg"] }
];

export const employees = [
  { id: 1, name: "احمد", position: "ولدر", branch_id: 1, presentDays: 24, totalDays: 27 },
  { id: 2, name: "محمود", position: "تخنیکر", branch_id: 1, presentDays: 27, totalDays: 27 },
  { id: 3, name: "کریم", position: "اپرایتور", branch_id: 2, presentDays: 20, totalDays: 27 }
];
