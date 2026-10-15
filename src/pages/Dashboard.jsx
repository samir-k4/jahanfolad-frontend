import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import {
  FcFactory,
  FcDepartment,
  FcConferenceCall,
  FcCalendar,
  FcClock,
  FcMoneyTransfer,
  FcPaid,
  FcDebt,
  FcSafe,
  FcInspection,
  FcLineChart,
  FcPackage,
  FcBusinessContact,
  FcSalesPerformance,
  FcReuse,
  FcCurrencyExchange,
  FcDonate,
  FcSettings,
} from 'react-icons/fc';

export default function Dashboard() {
  const { t } = useTranslation("common");
  const [activeCard, setActiveCard] = useState(null);

  const cards = [
    {
      id: 'production',
      title: t("dashboardCards.production"),
      link: '/production',
      icon: FcFactory,
    },
    {
      id: 'products',
      title: t("dashboardCards.products"),
      link: '/products',
      icon: FcPackage,
    },
    {
      id: 'godam',
      title: t("dashboardCards.warehouse"),
      link: '/godam',
      icon: FcDepartment,
    },
    {
      id: 'customers',
      title: t("navigation.groups.customers"),
      link: '/customers',
      icon: FcBusinessContact,
    },
    {
      id: 'sales-invoices',
      title: t("dashboardCards.salesInvoices"),
      link: '/sales/invoices',
      icon: FcSalesPerformance,
    },
    {
      id: 'sales-scrap',
      title: t("sales.scrapCategory"),
      link: '/sales/scrap',
      icon: FcReuse,
    },
    {
      id: 'treasury',
      title: t("dashboardCards.treasury"),
      link: '/treasury',
      icon: FcSafe,
    },
    {
      id: 'deposits-withdrawals',
      title: t("dashboardCards.depositsWithdrawals"),
      link: '/deposits-withdrawals',
      icon: FcCurrencyExchange,
    },
    {
      id: 'incomes',
      title: t("dashboardCards.incomes"),
      link: '/incomes',
      icon: FcDonate,
    },
    {
      id: 'manager-advances',
      title: t("dashboardCards.advances"),
      link: '/manager-advances',
      icon: FcDebt,
    },
    {
      id: 'expenses',
      title: t("navigation.groups.expenses"),
      link: '/expenses',
      icon: FcInspection,
    },
    {
      id: 'employees',
      title: t("dashboardCards.employees"),
      link: '/employees',
      icon: FcConferenceCall,
    },
    {
      id: 'attendance',
      title: t("dashboardCards.attendance"),
      link: '/attendance',
      icon: FcCalendar,
    },
    {
      id: 'overtime',
      title: t("navigation.pages.overtime"),
      link: '/overtime',
      icon: FcClock,
    },
    {
      id: 'salaries',
      title: t("dashboardCards.salaries"),
      link: '/salaries',
      icon: FcMoneyTransfer,
    },
    {
      id: 'salary-advance',
      title: t("dashboardCards.salaryPayment"),
      link: '/salaries/payment',
      icon: FcPaid,
    },
    {
      id: 'reports',
      title: t("dashboardCards.reports"),
      link: '/reports',
      icon: FcLineChart,
    },
    {
      id: 'settings',
      title: t("dashboardCards.settings"),
      link: '/settings',
      icon: FcSettings,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-6 px-4 sm:px-8 font-sans select-none" dir="rtl">
      
      <div className="w-full max-w-[1680px] mx-auto flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9 gap-3 sm:gap-3.5 justify-items-center">
          {cards.map((card) => {
            const Icon = card.icon;
            const isActive = activeCard === card.id;

            return (
              <Link
                key={card.id}
                to={card.link}
                onMouseEnter={() => setActiveCard(card.id)}
                onMouseLeave={() => setActiveCard(null)}
                className={`group flex flex-col items-center justify-between w-full aspect-square max-w-[136px] sm:max-w-[142px] 2xl:max-w-[168px] min-h-[126px] sm:min-h-[136px] p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#00a6f4] text-white shadow-lg -translate-y-1'
                    : 'bg-[#e9edf2] hover:bg-[#dfe6ee] text-gray-800 border border-slate-200/60 shadow-xs'
                }`}
              >
                <div className="flex-1 flex items-center justify-center pt-0.5 group-hover:scale-108 transition-transform duration-200">
                  <Icon size={46} className="drop-shadow-xs" />
                </div>

                <span
                  className={`text-xs sm:text-sm font-black tracking-tight line-clamp-1 transition-colors duration-200 mt-1 sm:mt-1.5 ${
                    isActive ? 'text-white' : 'text-gray-800 group-hover:text-slate-950'
                  }`}
                >
                  {card.title}
                </span>
              </Link>
            );
          })}
        </div>

      </div>

      <div className="text-center text-[11px] sm:text-xs text-gray-500 font-medium pt-8">
        {t("dashboard.footer")}
      </div>
    </div>
  );
}
