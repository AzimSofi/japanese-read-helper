"use client";

import React from "react";
import { CSS_VARS } from "@/lib/constants";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxButtons?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxButtons = 5,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const halfButtons = Math.floor(maxButtons / 2);

    let startPage = Math.max(1, currentPage - halfButtons);
    let endPage = Math.min(totalPages, currentPage + halfButtons);

    // 開始ページを調整（右端に寄りすぎている場合）
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // 終了ページを調整（左端に寄りすぎている場合）
    if (endPage - startPage < maxButtons - 1) {
      endPage = Math.min(totalPages, startPage + maxButtons - 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const buttonStyle = (isActive: boolean) => ({
    padding: "0.5rem 1rem",
    margin: "0 0.25rem",
    border: "2px solid",
    borderColor: isActive ? CSS_VARS.PRIMARY : CSS_VARS.NEUTRAL,
    backgroundColor: isActive ? CSS_VARS.PRIMARY : "transparent",
    color: isActive ? "white" : CSS_VARS.PRIMARY,
    borderRadius: "0.375rem",
    cursor: "pointer",
    fontWeight: isActive ? "bold" : "normal",
    transition: "all 0.2s",
  });

  return (
    <div className="flex justify-center items-center my-6 gap-2">
      {/* 最初のページへ */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        style={{
          ...buttonStyle(false),
          opacity: currentPage === 1 ? 0.3 : 1,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
        }}
        aria-label="最初のページ"
      >
        ««
      </button>

      {/* 前のページへ */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...buttonStyle(false),
          opacity: currentPage === 1 ? 0.3 : 1,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
        }}
        aria-label="前のページ"
      >
        «
      </button>

      {/* 最初のページを表示（省略記号が必要な場合） */}
      {pageNumbers[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={buttonStyle(false)}
          >
            1
          </button>
          {pageNumbers[0] > 2 && (
            <span style={{ margin: "0 0.5rem", color: CSS_VARS.PRIMARY }}>
              ...
            </span>
          )}
        </>
      )}

      {/* ページ番号 */}
      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={buttonStyle(page === currentPage)}
          aria-label={`ページ ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </button>
      ))}

      {/* 最後のページを表示（省略記号が必要な場合） */}
      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span style={{ margin: "0 0.5rem", color: CSS_VARS.PRIMARY }}>
              ...
            </span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            style={buttonStyle(false)}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* 次のページへ */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...buttonStyle(false),
          opacity: currentPage === totalPages ? 0.3 : 1,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        }}
        aria-label="次のページ"
      >
        »
      </button>

      {/* 最後のページへ */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        style={{
          ...buttonStyle(false),
          opacity: currentPage === totalPages ? 0.3 : 1,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        }}
        aria-label="最後のページ"
      >
        »»
      </button>

      {/* ページ情報 */}
      <span
        style={{
          marginLeft: "1rem",
          color: CSS_VARS.PRIMARY,
          fontWeight: "500",
        }}
      >
        {currentPage} / {totalPages}
      </span>
    </div>
  );
};

export default Pagination;
