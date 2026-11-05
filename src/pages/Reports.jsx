import { useTranslation } from "react-i18next";

export default function Reports() {
  const { t } = useTranslation("common");
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] font-sans"
      dir="rtl"
    >
      <h1 className="text-3xl sm:text-5xl font-black text-gray-300 tracking-tight select-none">
        {t("status.developing")}
      </h1>
    </div>
  );
}
