import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { adminDepartmentKeys, getAdminDepartments } from '../api/departments.api';
import { adminStaffKeys, getAdminStaff } from '../api/staff-admin.api';
import type { AdminStaff } from '../types/admin.types';
import { formatCategoryDate } from '../lib/format-category-date';
import { StaffDetailModal, StaffFormModal, StaffStatus } from './staff-modals';
import '@/features/incident-reports/incidents.css';
import '../category-manager.css';
import '../staff-manager.css';

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type Dialog = { kind: 'create' } | { kind: 'edit'; staff: AdminStaff } | { kind: 'detail'; staff: AdminStaff } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang hoạt động' },
  { id: 'INACTIVE', label: 'Đã khóa' },
];

const SKELETON_ROWS = [0, 1, 2, 3];

export function StaffManager() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const staff = useQuery({ queryKey: adminStaffKeys.all, queryFn: ({ signal }) => getAdminStaff(signal) });
  const departments = useQuery({
    queryKey: adminDepartmentKeys.all,
    queryFn: ({ signal }) => getAdminDepartments(signal),
  });

  const all = staff.data ?? [];
  const inDepartment = departmentFilter === ''
    ? all
    : all.filter((item) => item.departmentId === Number(departmentFilter));
  const activeCount = inDepartment.filter((item) => item.isActive).length;
  const counts: Record<Filter, number> = {
    ALL: inDepartment.length,
    ACTIVE: activeCount,
    INACTIVE: inDepartment.length - activeCount,
  };
  const needle = query.trim().toLowerCase();
  const visible = inDepartment.filter((item) => {
    const matchesStatus = filter === 'ALL' || item.isActive === (filter === 'ACTIVE');
    if (!matchesStatus) return false;
    if (!needle) return true;
    return `${item.fullName ?? ''} ${item.email} ${item.department?.name ?? ''}`.toLowerCase().includes(needle);
  });

  const openCreate = () => { setNotice(null); setDialog({ kind: 'create' }); };

  return (
    <div className="page">
      <PageHeader
        title="Kỹ thuật viên"
        description="Mỗi kỹ thuật viên thuộc một phòng ban và dùng email @gm.uit.edu.vn. Khóa tài khoản không hủy sự cố đang được giao."
        action={<Button iconLeft={<Plus size={16} />} onClick={openCreate}>Thêm kỹ thuật viên</Button>}
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
            <strong>{staff.data ? activeCount : '—'}</strong>
            <span>kỹ thuật viên đang được đăng nhập</span>
          </div>
          <div className="staff-toolbar">
            <input
              className="input staff-search"
              type="search"
              value={query}
              placeholder="Tìm tên hoặc email"
              aria-label="Tìm kỹ thuật viên theo tên hoặc email"
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="select staff-department-filter"
              aria-label="Lọc theo phòng ban"
              value={departmentFilter}
              disabled={departments.isPending || departments.isError}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">Tất cả phòng ban</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}{department.isActive ? '' : ' (đã ngừng)'}
                </option>
              ))}
            </select>
            <div className="segmented" role="tablist" aria-label="Lọc theo trạng thái">
              {FILTERS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                  {item.label}{staff.data ? ` (${counts[item.id]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {departments.isError && (
          <div className="category-error" role="alert">
            <span>Không tải được danh sách phòng ban để lọc.</span>
            <Button variant="secondary" size="sm" loading={departments.isFetching} onClick={() => { void departments.refetch(); }}>Thử lại</Button>
          </div>
        )}

        {staff.isError ? (
          <div className="category-error" role="alert">
            <span>Không tải được danh sách kỹ thuật viên. Kiểm tra kết nối rồi thử lại.</span>
            <Button variant="secondary" size="sm" loading={staff.isFetching} onClick={() => { void staff.refetch(); }}>Thử lại</Button>
          </div>
        ) : !staff.isPending && all.length === 0 ? (
          <div className="empty">
            <Wrench size={28} />
            <h3>Chưa có kỹ thuật viên nào</h3>
            <p>Tạo tài khoản bằng email @gm.uit.edu.vn và chọn một phòng ban đang hoạt động.</p>
            <Button iconLeft={<Plus size={16} />} onClick={openCreate}>Tạo kỹ thuật viên đầu tiên</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table category-table" aria-label="Kỹ thuật viên" aria-busy={staff.isPending}>
              <thead>
                <tr>
                  <th scope="col">Kỹ thuật viên</th>
                  <th scope="col">Phòng ban</th>
                  <th scope="col" className="category-table__status">Trạng thái</th>
                  <th scope="col" className="num">Việc đang giữ</th>
                  <th scope="col" className="category-table__date">Cập nhật</th>
                  <th scope="col" className="actions"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {staff.isPending ? SKELETON_ROWS.map((row) => (
                  <tr key={row} aria-hidden="true">
                    <td><div className="skeleton category-skeleton" style={{ width: '45%' }} /><div className="skeleton category-skeleton category-skeleton--sub" /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 120 }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 96 }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 24, marginLeft: 'auto' }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 110 }} /></td>
                    <td />
                  </tr>
                )) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="category-table__none">Không có kỹ thuật viên nào khớp bộ lọc.</td></tr>
                ) : visible.map((member) => (
                  <tr key={member.id} className={member.isActive ? undefined : 'is-inactive'}>
                    <td>
                      <div className="cell-title">{member.fullName?.trim() || 'Chưa có tên'}</div>
                      <div className="cell-sub category-table__desc">{member.email}</div>
                    </td>
                    <td>
                      <div className="cell-title">{member.department?.name ?? 'Chưa gán phòng'}</div>
                      {member.department && !member.department.isActive && <div className="cell-sub">Đã ngừng</div>}
                    </td>
                    <td><StaffStatus active={member.isActive} /></td>
                    <td className="num">{member.openAssignmentCount}</td>
                    <td className="cell-sub">{formatCategoryDate(member.updatedAt)}</td>
                    <td className="actions">
                      <div className="category-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'detail', staff: member }); }}>Chi tiết</button>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'edit', staff: member }); }}>Sửa</button>
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
        <StaffFormModal
          key={dialog.kind === 'edit' ? dialog.staff.id : 'new'}
          staff={dialog.kind === 'edit' ? dialog.staff : null}
          onClose={() => setDialog(null)}
          onSaved={(saved, created, passwordChanged) => {
            setDialog(null);
            const name = saved.fullName?.trim() || saved.email;
            if (created) {
              setNotice(`Đã tạo tài khoản “${name}”. Hãy chuyển mật khẩu cho kỹ thuật viên.`);
            } else if (passwordChanged) {
              setNotice(`Đã đặt mật khẩu mới cho “${name}”. Hãy chuyển mật khẩu này cho kỹ thuật viên.`);
            } else {
              setNotice(`Đã lưu thay đổi cho “${name}”.`);
            }
          }}
        />
      )}
      {dialog?.kind === 'detail' && (
        <StaffDetailModal
          key={dialog.staff.id}
          staff={dialog.staff}
          onClose={() => setDialog(null)}
          onEdit={(member) => setDialog({ kind: 'edit', staff: member })}
          onSaved={(saved) => {
            setDialog(null);
            const name = saved.fullName?.trim() || saved.email;
            setNotice(saved.isActive
              ? `Đã kích hoạt lại “${name}”.`
              : `Đã khóa “${name}”. Sự cố đang giao vẫn được giữ.`);
          }}
          onDeleted={(deleted) => {
            setDialog(null);
            setNotice(`Đã xóa tài khoản “${deleted.fullName?.trim() || deleted.email}”.`);
          }}
        />
      )}
    </div>
  );
}
