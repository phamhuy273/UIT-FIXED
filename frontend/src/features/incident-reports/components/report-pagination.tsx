import { Button } from '@/components/ui/button';
import './report-pagination.css';

interface ReportPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  loading?: boolean;
}

export function ReportPagination({
  page,
  totalPages,
  onChange,
  loading = false,
}: ReportPaginationProps) {
  if (totalPages < 2) return null;

  return (
    <nav className="report-pagination" aria-label="Phân trang danh sách">
      <Button
        variant="outline"
        size="sm"
        disabled={loading || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trang trước
      </Button>
      <span className="report-pagination-info">
        Trang {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={loading || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Trang sau
      </Button>
    </nav>
  );
}
