import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { roleLabel } from '@/features/auth/lib/auth-rules';
import { adminDepartmentKeys, createDepartment, deleteDepartment, getAdminDepartment, updateDepartment } from '../api/departments.api';
import { formatCategoryDate } from '../lib/format-category-date';
import type { AdminDepartment, DepartmentUpdate } from '../types/admin.types';
import { MutationError } from './category-modals';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const SKELETON_MEMBERS = [0, 1];

export function DepartmentStatus({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge--success' : 'badge--neutral'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </span>
  );
}

function useRefreshDepartments() {
  const queryClient = useQueryClient();
  // The dispatch modal reads the active list and per-department staff under these keys.
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: adminDepartmentKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['departments'] }),
    queryClient.invalidateQueries({ queryKey: ['department-staff'] }),
  ]);
}

function useDepartmentMutation<TInput>(mutationFn: (input: TInput) => Promise<AdminDepartment>, onSaved: (department: AdminDepartment) => void) {
  const refresh = useRefreshDepartments();
  return useMutation({
    mutationFn,
    onSuccess: async (department) => {
      await refresh();
      onSaved(department);
    },
  });
}

export function DepartmentFormModal({ department, onClose, onSaved }: {
  department: AdminDepartment | null;
  onClose: () => void;
  onSaved: (department: AdminDepartment, created: boolean) => void;
}) {
  const [name, setName] = useState(department?.name ?? '');
  const [description, setDescription] = useState(department?.description ?? '');
  const [touched, setTouched] = useState(false);
  const mutation = useDepartmentMutation(
    (input: { name: string; description: string | null }) => department ? updateDepartment(department.id, input) : createDepartment(input),
    (saved) => onSaved(saved, !department),
  );
  const trimmedName = name.trim();
  const nameError = touched && !trimmedName ? 'Vui lòng nhập tên phòng ban.' : undefined;
  const formId = department ? `department-form-${department.id}` : 'department-form-new';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!trimmedName || mutation.isPending) return;
    mutation.mutate({ name: trimmedName, description: description.trim() || null });
  };

  return (
    <Modal
      open
      onClose={() => { if (!mutation.isPending) onClose(); }}
      closeOnBackdrop={!mutation.isPending}
      title={department ? 'Sửa phòng ban' : 'Thêm phòng ban'}
      description={department
        ? 'Đổi tên sẽ cập nhật tên hiển thị ở cả lịch sử phân công cũ. Kỹ thuật viên và phân công không thay đổi.'
        : 'Phòng ban mới sẽ xuất hiện ngay trong bước chọn phòng ban khi phân công sự cố.'}
      footer={<>
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Hủy</Button>
        <Button type="submit" form={formId} loading={mutation.isPending}>
          {department ? 'Lưu thay đổi' : 'Tạo phòng ban'}
        </Button>
      </>}
    >
      <form id={formId} className="category-form" onSubmit={submit} noValidate>
        <Input
          label="Tên phòng ban"
          required
          value={name}
          maxLength={NAME_MAX}
          disabled={mutation.isPending}
          error={nameError}
          helperText="Không trùng với phòng ban khác, kể cả phòng ban đã ngừng hoạt động."
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        <div className="field">
          <label className="field__label" htmlFor={`${formId}-description`}>Mô tả</label>
          <textarea
            id={`${formId}-description`}
            className="textarea"
            rows={3}
            value={description}
            maxLength={DESCRIPTION_MAX}
            disabled={mutation.isPending}
            placeholder="Phạm vi công việc phòng ban phụ trách."
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="field__hint">{description.length}/{DESCRIPTION_MAX} ký tự</span>
        </div>
        {mutation.isError && <MutationError error={mutation.error} fallback="Không lưu được phòng ban. Vui lòng thử lại." />}
      </form>
    </Modal>
  );
}

function blockingReferences(department: AdminDepartment) {
  return [
    department.memberCount > 0 ? `${department.memberCount} tài khoản thuộc phòng ban` : null,
    department.assignmentCount > 0 ? `${department.assignmentCount} lượt phân công trong lịch sử` : null,
    department.buildingCount > 0 ? `${department.buildingCount} tòa nhà tham chiếu` : null,
  ].filter((item): item is string => item !== null);
}

export function DepartmentDetailModal({ department, onClose, onEdit, onSaved, onDeleted }: {
  department: AdminDepartment;
  onClose: () => void;
  onEdit: (department: AdminDepartment) => void;
  onSaved: (department: AdminDepartment) => void;
  onDeleted: (department: AdminDepartment) => void;
}) {
  const queryClient = useQueryClient();
  const refresh = useRefreshDepartments();
  const [confirming, setConfirming] = useState<'deactivate' | 'delete' | null>(null);
  const detail = useQuery({
    queryKey: adminDepartmentKeys.detail(department.id),
    queryFn: ({ signal }) => getAdminDepartment(department.id, signal),
  });
  const current: AdminDepartment = detail.data ?? department;
  const mutation = useDepartmentMutation((input: DepartmentUpdate) => updateDepartment(department.id, input), (saved) => {
    setConfirming(null);
    onSaved(saved);
  });
  const removal = useMutation({
    mutationFn: () => deleteDepartment(department.id),
    onSuccess: () => {
      // Close first so the detail query has no observer left to refetch a 404.
      onDeleted(current);
      queryClient.removeQueries({ queryKey: adminDepartmentKeys.detail(department.id) });
      void refresh();
    },
    onError: () => { void detail.refetch(); },
  });
  const busy = mutation.isPending || removal.isPending;
  const blockers = blockingReferences(current);
  const deletable = !current.isActive && blockers.length === 0;

  const footer = confirming === 'deactivate' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => setConfirming(null)}>Quay lại</Button>
    <Button variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate({ isActive: false })}>Xác nhận ngừng hoạt động</Button>
  </> : confirming === 'delete' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => { setConfirming(null); removal.reset(); }}>Quay lại</Button>
    <Button variant="danger" loading={removal.isPending} disabled={!deletable} onClick={() => removal.mutate()}>Xóa vĩnh viễn</Button>
  </> : <>
    {deletable && <Button variant="danger" disabled={busy} onClick={() => setConfirming('delete')}>Xóa</Button>}
    {current.isActive
      ? <Button variant="secondary" disabled={busy} onClick={() => setConfirming('deactivate')}>Ngừng hoạt động</Button>
      : <Button variant="secondary" loading={mutation.isPending} disabled={busy} onClick={() => mutation.mutate({ isActive: true })}>Kích hoạt lại</Button>}
    <Button disabled={busy} onClick={() => onEdit(current)}>Sửa</Button>
  </>;

  return (
    <Modal
      open
      onClose={() => { if (!busy) onClose(); }}
      closeOnBackdrop={!busy}
      title={current.name}
      description="Chi tiết phòng ban"
      footer={footer}
    >
      <div className="category-detail">
        <dl className="category-facts">
          <div><dt>Trạng thái</dt><dd><DepartmentStatus active={current.isActive} /></dd></div>
          <div><dt>Kỹ thuật viên đang hoạt động</dt><dd className="num">{current.staffCount}</dd></div>
          <div><dt>Công việc đang xử lý</dt><dd className="num">{current.activeAssignmentCount}</dd></div>
          <div><dt>Lượt phân công (lịch sử)</dt><dd className="num">{current.assignmentCount}</dd></div>
          <div><dt>Tạo lúc</dt><dd>{formatCategoryDate(current.createdAt)}</dd></div>
          <div><dt>Cập nhật</dt><dd>{formatCategoryDate(current.updatedAt)}</dd></div>
        </dl>
        <div>
          <h3 className="category-detail__label">Mô tả</h3>
          <p className={current.description ? 'category-detail__text' : 'category-detail__text text-muted'}>
            {current.description ?? 'Chưa có mô tả.'}
          </p>
        </div>
        <div>
          <h3 className="category-detail__label">Thành viên ({detail.data ? detail.data.staff.length : current.memberCount})</h3>
          {detail.isError ? (
            <p className="category-alert" role="alert">
              Không tải được danh sách thành viên.{' '}
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void detail.refetch(); }}>Thử lại</button>
            </p>
          ) : detail.isPending ? (
            <ul className="department-members" aria-busy="true">
              {SKELETON_MEMBERS.map((row) => (
                <li key={row} aria-hidden="true"><div className="skeleton category-skeleton" style={{ width: '40%' }} /></li>
              ))}
            </ul>
          ) : detail.data.staff.length === 0 ? (
            <p className="category-detail__text text-muted">Chưa có kỹ thuật viên nào thuộc phòng ban này.</p>
          ) : (
            <ul className="department-members">
              {detail.data.staff.map((member) => (
                <li key={member.id} className={member.isActive ? undefined : 'is-inactive'}>
                  <div>
                    <div className="cell-title">{member.fullName ?? member.email}</div>
                    <div className="cell-sub">{member.email}</div>
                  </div>
                  <span className="cell-sub department-members__role">
                    {member.isActive ? roleLabel(member.role) : `${roleLabel(member.role)} · Đã khóa`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!current.isActive && blockers.length > 0 && confirming === null && (
          <p className="category-detail__text text-muted">
            Không thể xóa vì còn {blockers.join(', ')}. Phòng ban được giữ lại để bảo toàn lịch sử.
          </p>
        )}
        {confirming === 'deactivate' && (
          <p className="category-confirm" role="alert">
            Admin sẽ không phân công được sự cố mới cho “{current.name}”. {current.activeAssignmentCount} công việc đang xử lý vẫn tiếp tục đến khi hoàn tất,
            và {current.staffCount} kỹ thuật viên vẫn giữ phòng ban hiện tại.
          </p>
        )}
        {confirming === 'delete' && (
          <p className="category-confirm" role="alert">
            Xóa vĩnh viễn “{current.name}”? Phòng ban không còn tài khoản, phân công hay tòa nhà nào tham chiếu. Thao tác này không thể hoàn tác.
          </p>
        )}
        {mutation.isError && <MutationError error={mutation.error} fallback="Không cập nhật được trạng thái. Vui lòng thử lại." />}
        {removal.isError && <MutationError error={removal.error} fallback="Không xóa được phòng ban. Vui lòng thử lại." />}
      </div>
    </Modal>
  );
}
