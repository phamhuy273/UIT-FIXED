import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { adminDepartmentKeys, getAdminDepartments } from '../api/departments.api';
import type { AdminDepartment } from '../types/admin.types';
import { formatCategoryDate } from '../lib/format-category-date';
import { DepartmentDetailModal, DepartmentFormModal, DepartmentStatus } from './department-modals';
import '@/features/incident-reports/incidents.css';
import '../category-manager.css';
import '../department-manager.css';

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type Dialog = { kind: 'create' } | { kind: 'edit'; department: AdminDepartment } | { kind: 'detail'; department: AdminDepartment } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang hoạt động' },
  { id: 'INACTIVE', label: 'Ngừng hoạt động' },
];

const SKELETON_ROWS = [0, 1, 2, 3];

export function DepartmentManager() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const departments = useQuery({ queryKey: adminDepartmentKeys.all, queryFn: ({ signal }) => getAdminDepartments(signal) });

  const all = departments.data ?? [];
  const activeCount = all.filter((item) => item.isActive).length;
  const counts: Record<Filter, number> = { ALL: all.length, ACTIVE: activeCount, INACTIVE: all.length - activeCount };
  const visible = filter === 'ALL' ? all : all.filter((item) => item.isActive === (filter === 'ACTIVE'));

  const openCreate = () => { setNotice(null); setDialog({ kind: 'create' }); };

  return (
    <div className="page">
      <PageHeader
        title="Phòng ban"
        description="Đơn vị kỹ thuật nhận phân công sự cố. Phòng ban ngừng hoạt động không nhận được phân công mới, nhưng công việc đang xử lý và lịch sử phân công vẫn giữ nguyên."
        action={<Button iconLeft={<Plus size={16} />} onClick={openCreate}>Thêm phòng ban</Button>}
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
            <strong>{departments.data ? activeCount : '—'}</strong>
            <span>phòng ban đang nhận phân công</span>
          </div>
          <div className="segmented" role="tablist" aria-label="Lọc theo trạng thái">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}{departments.data ? ` (${counts[item.id]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {departments.isError ? (
          <div className="category-error" role="alert">
            <span>Không tải được danh sách phòng ban. Kiểm tra kết nối rồi thử lại.</span>
            <Button variant="secondary" size="sm" loading={departments.isFetching} onClick={() => { void departments.refetch(); }}>Thử lại</Button>
          </div>
        ) : !departments.isPending && all.length === 0 ? (
          <div className="empty">
            <Network size={28} />
            <h3>Chưa có phòng ban nào</h3>
            <p>Cần ít nhất một phòng ban đang hoạt động để phân công sự cố cho kỹ thuật viên.</p>
            <Button iconLeft={<Plus size={16} />} onClick={openCreate}>Tạo phòng ban đầu tiên</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table department-table" aria-label="Phòng ban" aria-busy={departments.isPending}>
              <thead>
                <tr>
                  <th scope="col">Phòng ban</th>
                  <th scope="col" className="department-table__status">Trạng thái</th>
                  <th scope="col" className="num">Kỹ thuật viên</th>
                  <th scope="col" className="num">Đang xử lý</th>
                  <th scope="col" className="department-table__date">Cập nhật</th>
                  <th scope="col" className="actions"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {departments.isPending ? SKELETON_ROWS.map((row) => (
                  <tr key={row} aria-hidden="true">
                    <td><div className="skeleton category-skeleton" style={{ width: '45%' }} /><div className="skeleton category-skeleton category-skeleton--sub" /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 110 }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 24, marginLeft: 'auto' }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 24, marginLeft: 'auto' }} /></td>
                    <td className="department-table__date"><div className="skeleton category-skeleton" style={{ width: 110 }} /></td>
                    <td />
                  </tr>
                )) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="category-table__none">Không có phòng ban nào ở trạng thái này.</td></tr>
                ) : visible.map((department) => (
                  <tr key={department.id} className={department.isActive ? undefined : 'is-inactive'}>
                    <td>
                      <div className="cell-title">{department.name}</div>
                      <div className="cell-sub category-table__desc">{department.description ?? '—'}</div>
                    </td>
                    <td><DepartmentStatus active={department.isActive} /></td>
                    <td className="num">{department.staffCount}</td>
                    <td className="num">{department.activeAssignmentCount}</td>
                    <td className="cell-sub department-table__date">{formatCategoryDate(department.updatedAt)}</td>
                    <td className="actions">
                      <div className="category-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'detail', department }); }}>Chi tiết</button>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'edit', department }); }}>Sửa</button>
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
        <DepartmentFormModal
          key={dialog.kind === 'edit' ? dialog.department.id : 'new'}
          department={dialog.kind === 'edit' ? dialog.department : null}
          onClose={() => setDialog(null)}
          onSaved={(saved, created) => {
            setDialog(null);
            setNotice(created ? `Đã tạo phòng ban “${saved.name}”.` : `Đã lưu thay đổi cho “${saved.name}”.`);
          }}
        />
      )}
      {dialog?.kind === 'detail' && (
        <DepartmentDetailModal
          key={dialog.department.id}
          department={dialog.department}
          onClose={() => setDialog(null)}
          onEdit={(department) => setDialog({ kind: 'edit', department })}
          onSaved={(saved) => {
            setDialog(null);
            setNotice(saved.isActive
              ? `Đã kích hoạt lại “${saved.name}”. Phòng ban có thể nhận phân công mới.`
              : `Đã ngừng hoạt động “${saved.name}”. Công việc đang xử lý vẫn tiếp tục đến khi hoàn tất.`);
          }}
          onDeleted={(deleted) => {
            setDialog(null);
            setNotice(`Đã xóa phòng ban “${deleted.name}”.`);
          }}
        />
      )}
    </div>
  );
}
