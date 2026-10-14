import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import TooltipButton from '../components/common/TooltipButton';
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
  const [activeCard, setActiveCard] = useState(null);

  const cards = [
    {
      id: 'production',
      title: 'تولید',
      link: '/production',
      icon: FcFactory,
    },
    {
      id: 'products',
      title: 'محصولات',
      link: '/products',
      icon: FcPackage,
    },
    {
      id: 'godam',
      title: 'گدام',
      link: '/godam',
      icon: FcDepartment,
    },
    {
      id: 'customers',
      title: 'مشتریان',
      link: '/customers',
      icon: FcBusinessContact,
    },
    {
      id: 'sales-invoices',
      title: 'فاکتور فروش',
      link: '/sales/invoices',
      icon: FcSalesPerformance,
    },
    {
      id: 'sales-scrap',
      title: 'فروش ضایعات',
      link: '/sales/scrap',
      icon: FcReuse,
    },
    {
      id: 'treasury',
      title: 'حساب‌ها',
      link: '/treasury',
      icon: FcSafe,
    },
    {
      id: 'deposits-withdrawals',
      title: 'واریز و برداشت',
      link: '/deposits-withdrawals',
      icon: FcCurrencyExchange,
    },
    {
      id: 'incomes',
      title: 'دریافتی‌ها',
      link: '/incomes',
      icon: FcDonate,
    },
    {
      id: 'manager-advances',
      title: 'دخل امانتی',
      link: '/manager-advances',
      icon: FcDebt,
    },
    {
      id: 'expenses',
      title: 'مصارف',
      link: '/expenses',
      icon: FcInspection,
    },
    {
      id: 'employees',
      title: 'اشخاص',
      link: '/employees',
      icon: FcConferenceCall,
    },
    {
      id: 'attendance',
      title: 'حاضری',
      link: '/attendance',
      icon: FcCalendar,
    },
    {
      id: 'overtime',
      title: 'اضافه کاری',
      link: '/overtime',
      icon: FcClock,
    },
    {
      id: 'salaries',
      title: 'معاشات',
      link: '/salaries',
      icon: FcMoneyTransfer,
    },
    {
      id: 'salary-advance',
      title: 'پرداخت معاش',
      link: '/salaries/payment',
      icon: FcPaid,
    },
    {
      id: 'reports',
      title: 'گزارش',
      link: '/reports',
      icon: FcLineChart,
    },
    {
      id: 'settings',
      title: 'تنظیمات',
      link: '/settings',
      icon: FcSettings,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-6 px-4 sm:px-8 font-sans select-none" dir="rtl">
      
      {/* Main Grid Wrapper */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        {/* Grid of Module Cards (7 columns on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5 justify-items-center">
          {cards.map((card) => {
            const Icon = card.icon;
            const isActive = activeCard === card.id;

            return (
              <Link
                key={card.id}
                to={card.link}
                onMouseEnter={() => setActiveCard(card.id)}
                onMouseLeave={() => setActiveCard(null)}
                className={`group flex flex-col items-center justify-between w-full aspect-square max-w-[136px] sm:max-w-[142px] min-h-[126px] sm:min-h-[136px] p-3 sm:p-3.5 rounded-xl sm:rounded-2xl text-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#00a6f4] text-white shadow-lg -translate-y-1'
                    : 'bg-[#e9edf2] hover:bg-[#dfe6ee] text-gray-800 border border-slate-200/60 shadow-xs'
                }`}
              >
                {/* Centered Colorful Illustration Icon */}
                <div className="flex-1 flex items-center justify-center pt-0.5 group-hover:scale-108 transition-transform duration-200">
                  <Icon size={46} className="drop-shadow-xs" />
                </div>

                {/* Minimal Single Title */}
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

        {/* Bottom Pagination Arrow Buttons matching screenshot */}
        <div className="flex justify-end items-center gap-2 mt-8 px-2">
          <TooltipButton
            tooltip="قبلی"
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer !p-0"
            icon={<ChevronRight size={16} />}
          />
          <TooltipButton
            tooltip="بعدی"
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer !p-0"
            icon={<ChevronLeft size={16} />}
          />
        </div>
      </div>

      {/* Matching Screenshot Footer */}
      <div className="text-center text-[11px] sm:text-xs text-gray-500 font-medium pt-8">
        © ۲۰۲۶ شرکت تولیدی و صنعتی جهان فولاد . کلیه حقوق محفوظ است v-7.1
      </div>
    </div>
  );
}
