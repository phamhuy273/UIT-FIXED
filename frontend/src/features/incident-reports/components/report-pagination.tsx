import { Button } from '@/components/ui/button';

export function ReportPagination({ page, totalPages, onChange, loading = false }: {
  page: number; totalPages: number; onChange: (page: number) => void; loading?: boolean;
}) {
  if (totalPages < 2) return null;
  return <nav className="report-pagination" aria-label="Phân trang báo cáo">
    <Button variant="outline" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>Trang trước</Button>
    <span>Trang {page} / {totalPages}</span>
    <Button variant="outline" disabled={loading || page >= totalPages} onClick={() => onChange(page + 1)}>Trang sau</Button>
  </nav>;
}
