import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { adminStudentKeys, getAdminStudents } from '../api/students.api';
import type { AdminStudent } from '../types/admin.types';
import { formatCategoryDate } from '../lib/format-category-date';
import { StudentDetailModal, StudentFormModal, StudentStatus } from './student-modals';
import '@/features/incident-reports/incidents.css';
import '../category-manager.css';
import '../student-manager.css';

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type Dialog = { kind: 'create' } | { kind: 'edit'; student: AdminStudent } | { kind: 'detail'; student: AdminStudent } | null;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ACTIVE', label: 'Đang hoạt động' },
  { id: 'INACTIVE', label: 'Đã khóa' },
];

const SKELETON_ROWS = [0, 1, 2, 3];

export function StudentManager() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const students = useQuery({ queryKey: adminStudentKeys.all, queryFn: ({ signal }) => getAdminStudents(signal) });

  const all = students.data ?? [];
  const activeCount = all.filter((item) => item.isActive).length;
  const counts: Record<Filter, number> = { ALL: all.length, ACTIVE: activeCount, INACTIVE: all.length - activeCount };
  const needle = query.trim().toLowerCase();
  const visible = all.filter((item) => {
    const matchesStatus = filter === 'ALL' || item.isActive === (filter === 'ACTIVE');
    if (!matchesStatus) return false;
    if (!needle) return true;
    return `${item.fullName ?? ''} ${item.email}`.toLowerCase().includes(needle);
  });

  const openCreate = () => { setNotice(null); setDialog({ kind: 'create' }); };

  return (
    <div className="page">
      <PageHeader
        title="Sinh viên"
        description="Tài khoản sinh viên dùng email @gm.uit.edu.vn. Khóa tài khoản thì không đăng nhập được, nhưng báo cáo và lịch sử vẫn được giữ."
        action={<Button iconLeft={<Plus size={16} />} onClick={openCreate}>Thêm sinh viên</Button>}
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
            <strong>{students.data ? activeCount : '—'}</strong>
            <span>sinh viên đang được đăng nhập</span>
          </div>
          <div className="student-toolbar">
            <input
              className="input student-search"
              type="search"
              value={query}
              placeholder="Tìm tên hoặc email"
              aria-label="Tìm sinh viên theo tên hoặc email"
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="segmented" role="tablist" aria-label="Lọc theo trạng thái">
              {FILTERS.map((item) => (
                <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>
                  {item.label}{students.data ? ` (${counts[item.id]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {students.isError ? (
          <div className="category-error" role="alert">
            <span>Không tải được danh sách sinh viên. Kiểm tra kết nối rồi thử lại.</span>
            <Button variant="secondary" size="sm" loading={students.isFetching} onClick={() => { void students.refetch(); }}>Thử lại</Button>
          </div>
        ) : !students.isPending && all.length === 0 ? (
          <div className="empty">
            <GraduationCap size={28} />
            <h3>Chưa có sinh viên nào</h3>
            <p>Tạo tài khoản bằng email @gm.uit.edu.vn, hoặc sinh viên có thể tự đăng ký.</p>
            <Button iconLeft={<Plus size={16} />} onClick={openCreate}>Tạo sinh viên đầu tiên</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table category-table" aria-label="Sinh viên" aria-busy={students.isPending}>
              <thead>
                <tr>
                  <th scope="col">Sinh viên</th>
                  <th scope="col" className="category-table__status">Trạng thái</th>
                  <th scope="col" className="num">Lịch sử</th>
                  <th scope="col" className="category-table__date">Cập nhật</th>
                  <th scope="col" className="actions"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {students.isPending ? SKELETON_ROWS.map((row) => (
                  <tr key={row} aria-hidden="true">
                    <td><div className="skeleton category-skeleton" style={{ width: '45%' }} /><div className="skeleton category-skeleton category-skeleton--sub" /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 96 }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 24, marginLeft: 'auto' }} /></td>
                    <td><div className="skeleton category-skeleton" style={{ width: 110 }} /></td>
                    <td />
                  </tr>
                )) : visible.length === 0 ? (
                  <tr><td colSpan={5} className="category-table__none">Không có sinh viên nào khớp bộ lọc.</td></tr>
                ) : visible.map((student) => (
                  <tr key={student.id} className={student.isActive ? undefined : 'is-inactive'}>
                    <td>
                      <div className="cell-title">{student.fullName?.trim() || 'Chưa có tên'}</div>
                      <div className="cell-sub category-table__desc">{student.email}</div>
                    </td>
                    <td><StudentStatus active={student.isActive} /></td>
                    <td className="num">{student.referenceCount}</td>
                    <td className="cell-sub">{formatCategoryDate(student.updatedAt)}</td>
                    <td className="actions">
                      <div className="category-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'detail', student }); }}>Chi tiết</button>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setNotice(null); setDialog({ kind: 'edit', student }); }}>Sửa</button>
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
        <StudentFormModal
          key={dialog.kind === 'edit' ? dialog.student.id : 'new'}
          student={dialog.kind === 'edit' ? dialog.student : null}
          onClose={() => setDialog(null)}
          onSaved={(saved, created, passwordChanged) => {
            setDialog(null);
            const name = saved.fullName?.trim() || saved.email;
            if (created) {
              setNotice(`Đã tạo tài khoản “${name}”. Hãy chuyển mật khẩu cho sinh viên.`);
            } else if (passwordChanged) {
              setNotice(`Đã đặt mật khẩu mới cho “${name}”. Hãy chuyển mật khẩu này cho sinh viên.`);
            } else {
              setNotice(`Đã lưu thay đổi cho “${name}”.`);
            }
          }}
        />
      )}
      {dialog?.kind === 'detail' && (
        <StudentDetailModal
          key={dialog.student.id}
          student={dialog.student}
          onClose={() => setDialog(null)}
          onEdit={(student) => setDialog({ kind: 'edit', student })}
          onSaved={(saved) => {
            setDialog(null);
            const name = saved.fullName?.trim() || saved.email;
            setNotice(saved.isActive ? `Đã kích hoạt lại “${name}”.` : `Đã khóa “${name}”. Lịch sử vẫn được giữ.`);
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
