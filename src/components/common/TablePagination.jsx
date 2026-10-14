import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import TooltipButton from "./TooltipButton";
import CustomDropdown from "./CustomDropdown";

export default function TablePagination({
  currentPage = 1,
  lastPage,
  totalPages,
  total,
  totalEntries,
  totalItems,
  perPage,
  pageSize,
  recordsPerPage,
  onPageChange,
  onPerPageChange,
  onPageSizeChange,
  perPageOptions = [10, 15, 20, 25, 50, 100],
  unit = "مورد",
  className = "",
}) {
  const externalPerPage = perPage ?? pageSize ?? recordsPerPage;
  const [internalPerPage, setInternalPerPage] = useState(externalPerPage ? Number(externalPerPage) : 15);

  useEffect(() => {
    if (externalPerPage !== undefined && externalPerPage !== null) {
      setInternalPerPage(Number(externalPerPage));
    }
  }, [externalPerPage]);

  const currentPerPage = Math.max(1, Number(externalPerPage ?? internalPerPage ?? 15));
  const totalCount = Math.max(0, Number(total ?? totalEntries ?? totalItems ?? 0));
  const finalLastPage = Math.max(
    1,
    Number(lastPage ?? totalPages ?? (totalCount > 0 ? Math.ceil(totalCount / currentPerPage) : 1))
  );

  const page = Math.min(Math.max(1, Number(currentPage || 1)), finalLastPage);
  const from = totalCount === 0 ? 0 : (page - 1) * currentPerPage + 1;
  const to = Math.min(page * currentPerPage, totalCount);

  const handlePerPageSelect = (val) => {
    const num = Number(val);
    setInternalPerPage(num);
    const cb = onPerPageChange || onPageSizeChange;
    if (cb) {
      cb(num);
    } else if (onPageChange) {
      onPageChange(1);
    }
  };

  const handlePageClick = (newPage) => {
    const target = Math.min(Math.max(1, newPage), finalLastPage);
    if (onPageChange) {
      onPageChange(target);
    }
  };

  return (
    <div
      className={`p-3 border-t border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 font-medium">تعداد در صفحه:</span>
          <CustomDropdown
            value={currentPerPage}
            onChange={handlePerPageSelect}
            options={perPageOptions.map((opt) => ({ value: opt, label: String(opt) }))}
            buttonClassName="bg-white border border-gray-300 rounded-input px-2.5 py-1 text-xs text-gray-700 outline-none hover:border-gray-400 cursor-pointer shadow-2xs min-w-[65px]"
            width="w-20"
            align="right"
            usePortal={true}
          />
        </div>
        <span className="text-gray-500 font-normal">
          (نمایش {from} تا {to} از مجموع {totalCount} {unit})
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 ml-2">
          صفحه {page} از {finalLastPage}
        </span>

        <TooltipButton
          tooltip="صفحه اول"
          disabled={page <= 1}
          onClick={() => handlePageClick(1)}
          className="p-1.5 rounded-btn border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          icon={<ChevronsRight size={14} />}
        />

        <TooltipButton
          tooltip="صفحه قبلی"
          disabled={page <= 1}
          onClick={() => handlePageClick(page - 1)}
          className="p-1.5 rounded-btn border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          icon={<ChevronRight size={14} />}
        />

        <TooltipButton
          tooltip="صفحه بعدی"
          disabled={page >= finalLastPage}
          onClick={() => handlePageClick(page + 1)}
          className="p-1.5 rounded-btn border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          icon={<ChevronLeft size={14} />}
        />

        <TooltipButton
          tooltip="صفحه آخر"
          disabled={page >= finalLastPage}
          onClick={() => handlePageClick(finalLastPage)}
          className="p-1.5 rounded-btn border border-gray-300 bg-white hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
          icon={<ChevronsLeft size={14} />}
        />
      </div>
    </div>
  );
}
