import { useEffect, useState } from 'react';
import { Download, Loader2, Receipt as ReceiptIcon, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext.tsx';
import type { Receipt } from '../types/finance.ts';

interface ReceiptViewerModalProps {
  receiptId: string | null;
  transactionTitle: string;
  onClose: () => void;
}

export function ReceiptViewerModal({
  receiptId,
  transactionTitle,
  onClose,
}: ReceiptViewerModalProps) {
  const { fetchReceipt } = useFinance();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    fetchReceipt(receiptId)
      .then((res) => {
        if (!active) return;
        if (!res) {
          setError('Receipt attachment could not be found.');
        } else {
          setReceipt(res);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load receipt.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchReceipt, receiptId]);

  if (!receiptId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1E2E4D]">
          <div className="flex items-center gap-2.5 min-w-0">
            <ReceiptIcon className="w-5 h-5 text-[#287BFF] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {transactionTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {receipt?.fileName ?? 'Receipt Attachment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {receipt?.dataUrl && (
              <a
                href={receipt.dataUrl}
                download={receipt.fileName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#287BFF] hover:bg-[#1D5ED8] transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors cursor-pointer"
              aria-label="Close receipt viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 flex items-center justify-center min-h-[280px] max-h-[70vh] overflow-auto bg-slate-50 dark:bg-[#080D1B]">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-[#287BFF]" />
              <span className="text-sm">Loading receipt image...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-[#F87171]">{error}</p>
          ) : receipt?.dataUrl ? (
            <img
              src={receipt.dataUrl}
              alt={`Receipt for ${transactionTitle}`}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[60vh] rounded-xl object-contain border border-slate-200 dark:border-[#1E2E4D]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
