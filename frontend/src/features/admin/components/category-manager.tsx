import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Tags, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { adminCategoryKeys, getAdminCategories } from '../api/categories.api';
import type { AdminCategory } from '../types/admin.types';
import { formatCategoryDate } from '../lib/format-category-date';
import { CategoryDetailModal, CategoryFormModal, CategoryStatus } from './category-modals';
import '@/features/incident-reports/incidents.css';
import '../category-manager.css';

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type Dialog = { kind: 'create' } | { kind: 'edit'; category: AdminCategory } | { kind: 'detail'; category: AdminCategory } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang sử dụng' },
  { id: 'INACTIVE', label: 'Ngừng sử dụng' },
];

const SKELETON_ROWS = [0, 1, 2, 3];

export function CategoryManager() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const categories = useQuery({ queryKey: adminCategoryKeys.all, queryFn: ({ signal }) => getAdminCategories(signal) });

  const all = categories.data ?? [];
  const activeCount = all.filter((item) => item.isActive).length;
  const counts: Record<Filter, number> = { ALL: all.length, ACTIVE: activeCount, INACTIVE: all.length - activeCount };
  const visible = filter === 'ALL' ? all : all.filter((item) => item.isActive === (filter === 'ACTIVE'));

  const openCreate = () => { setNotice(null); setDialog({ kind: 'create' }); };

  return (
    <div className="page">
      <PageHeader
        title="Danh mục sự cố"
        description="Nhóm sự cố sinh viên chọn khi gửi báo cáo. Danh mục ngừng sử dụng sẽ ẩn khỏi báo cáo mới nhưng vẫn giữ trên các báo cáo cũ."
        action={<Button iconLeft={<Plus size={16} />} onClick={openCreate}>Thêm danh mục</Button>}
      />

      {notice && (
        <div className="category-notice" role="status">
          <span>{notice}</span>
          <button type="button" className="btn btn--ghost btn--sm" aria-label="Đóng thông báo" onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      <div className="card category-card">
        <div className="queue-toolbar">
          <div className="queue-counter">
            <strong>{categories.data ? activeCount : '—'}</strong>
            <span>danh mục đang dùng trong form báo cáo</span>
          </div>
          <div className="segmented" role="tablist" aria-label="Lọc theo trạng thái">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}{categories.data ? ` (${counts[item.id]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {categories.isError ? (
          <div className="category-error" role="alert">
            <span>Không tải được danh sách danh mục. Kiểm tra kết nối rồi thử lại.</span>
            <Button variant="secondary" size="sm" loading={categories.isFetching} onClick={() => { void categories.refetch(); }}>Thử lại</Button>
          </div>
        ) : !categories.isPending && all.length === 0 ? (
          <div className="empty">
            <Tags size={28} />
            <h3>Chưa có danh mục nào</h3>
            <p>Sinh viên cần ít nhất một danh mục đang sử dụng để gửi báo cáo.</p>
            <Button iconLeft={<Plus size={16} />} onClick={openCreate}>Tạo danh mục đầu tiên</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table category-table" aria-label="Danh mục sự cố" aria-busy={categories.isPending}>
              <thead>
                <tr>
                  <th scope="col">Danh mục</th>
                  <th scope="col" className="category-table__status">Trạng thái</th>
                  <th scope="col" className="num">Báo cáo</th>
                  <th scope="col" className="category-table__date">Cập nhật</th>
                  <th scope="col" className="actions"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {categories.isPending ? SKELETON_ROWS.map((row) => (
                  <tr key={row} aria-hidden="true">
                    <td><div className="skeleton category-skeleton" style={{ width: '45%' }} /><div className="skeleton category-skeleton category-skeleton--sub" /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 96 }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 24, marginLeft: 'auto' }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 110 }} /></td>
                    <td />
                  </tr>
                )) : visible.length === 0 ? (
                  <tr><td colSpan={5} className="category-table__none">Không có danh mục nào ở trạng thái này.</td></tr>
                ) : visible.map((category) => (
                  <tr key={category.id} className={category.isActive ? undefined : 'is-inactive'}>
                    <td>
                      <div className="cell-title">{category.name}</div>
                      <div className="cell-sub category-table__desc">{category.description ?? '—'}</div>
                    </td>
                    <td><CategoryStatus active={category.isActive} /></td>
                    <td className="num">{category.reportCount}</td>
                    <td className="cell-sub">{formatCategoryDate(category.updatedAt)}</td>
                    <td className="actions">
                      <div className="category-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'detail', category }); }}>Chi tiết</button>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'edit', category }); }}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <CategoryFormModal
          key={dialog.kind === 'edit' ? dialog.category.id : 'new'}
          category={dialog.kind === 'edit' ? dialog.category : null}
          onClose={() => setDialog(null)}
          onSaved={(saved, created) => {
            setDialog(null);
            setNotice(created ? `Đã tạo danh mục “${saved.name}”.` : `Đã lưu thay đổi cho “${saved.name}”.`);
          }}
        />
      )}
      {dialog?.kind === 'detail' && (
        <CategoryDetailModal
          key={dialog.category.id}
          category={dialog.category}
          onClose={() => setDialog(null)}
          onEdit={(category) => setDialog({ kind: 'edit', category })}
          onSaved={(saved) => {
            setDialog(null);
            setNotice(saved.isActive ? `Đã kích hoạt lại “${saved.name}”.` : `Đã ngừng sử dụng “${saved.name}”. Báo cáo cũ vẫn giữ danh mục này.`);
          }}
          onDeleted={(deleted) => {
            setDialog(null);
            setNotice(`Đã xóa danh mục “${deleted.name}”.`);
          }}
        />
      )}
    </div>
  );
}
