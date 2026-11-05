import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { emailError, fullNameError, passwordError, UIT_STUDENT_EMAIL_MESSAGE } from '@/features/auth/lib/auth-rules';
import { adminDepartmentKeys, getAdminDepartments } from '../api/departments.api';
import { adminStaffKeys, createStaff, deleteStaff, getAdminStaffMember, updateStaff } from '../api/staff-admin.api';
import { formatCategoryDate } from '../lib/format-category-date';
import type { AdminStaff, StaffUpdate } from '../types/admin.types';
import { MutationError } from './category-modals';

export function StaffStatus({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge--success' : 'badge--neutral'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {active ? 'Đang hoạt động' : 'Đã khóa'}
    </span>
  );
}

function useStaffMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AdminStaff>,
  onSaved: (staff: AdminStaff) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (staff) => {
      queryClient.setQueryData(adminStaffKeys.detail(staff.id), staff);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminStaffKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminDepartmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['departments'] }),
        queryClient.invalidateQueries({ queryKey: ['department-staff'] }),
      ]);
      onSaved(staff);
    },
  });
}

function displayName(staff: Pick<AdminStaff, 'fullName' | 'email'>) {
  return staff.fullName?.trim() || staff.email;
}

function staffEmailError(value: string) {
  const message = emailError(value);
  if (message === 'Nhập email sinh viên.') return 'Nhập email kỹ thuật viên.';
  if (message === UIT_STUDENT_EMAIL_MESSAGE) return 'Vui lòng sử dụng email có đuôi @gm.uit.edu.vn.';
  return message;
}

export function StaffFormModal({ staff, onClose, onSaved }: {
  staff: AdminStaff | null;
  onClose: () => void;
  onSaved: (staff: AdminStaff, created: boolean, passwordChanged: boolean) => void;
}) {
  const creating = staff === null;
  const departmentFieldId = useId();
  const [fullName, setFullName] = useState(staff?.fullName ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [departmentId, setDepartmentId] = useState(staff?.departmentId ? String(staff.departmentId) : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const departments = useQuery({
    queryKey: adminDepartmentKeys.all,
    queryFn: ({ signal }) => getAdminDepartments(signal),
  });
  const mutation = useStaffMutation(
    (input: { fullName: string; email: string; departmentId: number; password?: string }) => {
      if (!staff) {
        return createStaff({
          fullName: input.fullName,
          email: input.email,
          departmentId: input.departmentId,
          password: input.password ?? '',
        });
      }
      const departmentChanged = input.departmentId !== staff.departmentId;
      return updateStaff(staff.id, {
        fullName: input.fullName,
        email: input.email,
        ...(departmentChanged ? { departmentId: input.departmentId } : {}),
        ...(input.password ? { password: input.password } : {}),
      });
    },
    (saved) => onSaved(saved, creating, password.length > 0),
  );

  const departmentLocked = !creating && staff.openAssignmentCount > 0;
  const choices = (departments.data ?? []).filter((item) => item.isActive || item.id === staff?.departmentId);
  const changingPassword = creating || password.length > 0 || confirmPassword.length > 0;
  const nameMessage = fullNameError(fullName);
  const emailMessage = staffEmailError(email);
  const departmentMessage = departmentId ? null : 'Chọn phòng ban.';
  const passwordMessage = changingPassword ? passwordError(password) : null;
  const confirmMessage = changingPassword && password !== confirmPassword ? 'Mật khẩu xác nhận không khớp.' : null;
  const formId = creating ? 'staff-form-new' : `staff-form-${staff.id}`;
  const departmentMessageId = `${departmentFieldId}-message`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (
      nameMessage || emailMessage || departmentMessage || passwordMessage || confirmMessage
      || mutation.isPending || departments.isPending || departments.isError
    ) {
      return;
    }
    mutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      departmentId: Number(departmentId),
      ...(changingPassword ? { password } : {}),
    });
  };

  return (
    <Modal
      open
      onClose={() => { if (!mutation.isPending) onClose(); }}
      closeOnBackdrop={!mutation.isPending}
      title={creating ? 'Thêm kỹ thuật viên' : 'Sửa kỹ thuật viên'}
      description={creating
        ? 'Tài khoản được kích hoạt ngay và thuộc một phòng ban. Hãy chuyển mật khẩu cho kỹ thuật viên bên ngoài hệ thống.'
        : 'Đổi họ tên, email, phòng ban hoặc đặt mật khẩu mới. Hệ thống không gửi email.'}
      footer={<>
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Hủy</Button>
        <Button type="submit" form={formId} loading={mutation.isPending} disabled={departments.isPending || departments.isError}>
          {creating ? 'Tạo tài khoản' : 'Lưu thay đổi'}
        </Button>
      </>}
    >
      <form id={formId} className="category-form" onSubmit={submit} noValidate>
        <Input
          label="Họ và tên"
          required
          value={fullName}
          maxLength={100}
          autoComplete="name"
          disabled={mutation.isPending}
          error={touched ? nameMessage ?? undefined : undefined}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        <Input
          label="Email"
          required
          type="email"
          value={email}
          autoComplete="off"
          disabled={mutation.isPending}
          error={touched ? emailMessage ?? undefined : undefined}
          helperText="Chỉ nhận email có đuôi @gm.uit.edu.vn."
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        <div className="field">
          <label className="field__label" htmlFor={departmentFieldId}>
            Phòng ban<span className="req">*</span>
          </label>
          <select
            id={departmentFieldId}
            className="select"
            value={departmentId}
            required
            disabled={mutation.isPending || departments.isPending || departmentLocked}
            aria-invalid={touched && departmentMessage ? true : undefined}
            aria-describedby={departmentMessageId}
            onChange={(event) => setDepartmentId(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            {creating && <option value="">Chọn phòng ban</option>}
            {choices.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}{department.isActive ? '' : ' (đã ngừng)'}
              </option>
            ))}
          </select>
          <p
            id={departmentMessageId}
            className={touched && departmentMessage ? 'field__error' : 'field__hint'}
            role={touched && departmentMessage ? 'alert' : undefined}
          >
            {touched && departmentMessage
              ? departmentMessage
              : departmentLocked
                ? 'Còn sự cố chưa được phân công lại. Hãy phân công lại trước khi đổi phòng.'
                : 'Chỉ gán vào phòng ban đang hoạt động.'}
          </p>
        </div>
        <PasswordFields
          passwordLabel={creating ? 'Mật khẩu ban đầu' : 'Mật khẩu mới'}
          password={password}
          confirmPassword={confirmPassword}
          showPassword={showPassword}
          required={creating}
          disabled={mutation.isPending}
          passwordError={touched ? passwordMessage ?? undefined : undefined}
          confirmError={touched ? confirmMessage ?? undefined : undefined}
          helperText={creating
            ? 'Tối thiểu 8 ký tự, gồm chữ và số. Hệ thống không gửi email.'
            : 'Để trống nếu giữ mật khẩu cũ. Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.'}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirmPassword}
          onToggle={() => setShowPassword((current) => !current)}
          onBlur={() => setTouched(true)}
        />
        {departments.isError && (
          <p className="category-alert" role="alert">
            Không tải được danh sách phòng ban.{' '}
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void departments.refetch(); }}>Thử lại</button>
          </p>
        )}
        {mutation.isError && <MutationError error={mutation.error} fallback="Không lưu được tài khoản kỹ thuật viên. Vui lòng thử lại." />}
      </form>
    </Modal>
  );
}

export function StaffDetailModal({ staff, onClose, onEdit, onSaved, onDeleted }: {
  staff: AdminStaff;
  onClose: () => void;
  onEdit: (staff: AdminStaff) => void;
  onSaved: (staff: AdminStaff) => void;
  onDeleted: (staff: AdminStaff) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'lock' | 'delete' | null>(null);
  const detail = useQuery({
    queryKey: adminStaffKeys.detail(staff.id),
    queryFn: ({ signal }) => getAdminStaffMember(staff.id, signal),
    placeholderData: staff,
  });
  const current = detail.data ?? staff;
  const mutation = useStaffMutation((input: StaffUpdate) => updateStaff(current.id, input), (saved) => {
    setConfirming(null);
    onSaved(saved);
  });
  const removal = useMutation({
    mutationFn: () => deleteStaff(current.id),
    onSuccess: () => {
      onDeleted(current);
      queryClient.removeQueries({ queryKey: adminStaffKeys.detail(current.id) });
      void queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminDepartmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      void queryClient.invalidateQueries({ queryKey: ['department-staff'] });
    },
    onError: () => { void detail.refetch(); },
  });
  const busy = mutation.isPending || removal.isPending;
  const deletable = !current.isActive && current.referenceCount === 0;
  const name = displayName(current);

  const footer = confirming === 'lock' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => setConfirming(null)}>Quay lại</Button>
    <Button variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate({ isActive: false })}>Xác nhận khóa</Button>
  </> : confirming === 'delete' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => { setConfirming(null); removal.reset(); }}>Quay lại</Button>
    <Button variant="danger" loading={removal.isPending} disabled={!deletable} onClick={() => removal.mutate()}>Xóa vĩnh viễn</Button>
  </> : <>
    {deletable && <Button variant="danger" disabled={busy} onClick={() => setConfirming('delete')}>Xóa</Button>}
    {current.isActive
      ? <Button variant="secondary" disabled={busy} onClick={() => setConfirming('lock')}>Khóa tài khoản</Button>
      : <Button variant="secondary" loading={mutation.isPending} disabled={busy} onClick={() => mutation.mutate({ isActive: true })}>Kích hoạt lại</Button>}
    <Button disabled={busy} onClick={() => onEdit(current)}>Sửa</Button>
  </>;

  return (
    <Modal
      open
      onClose={() => { if (!busy) onClose(); }}
      closeOnBackdrop={!busy}
      title={name}
      description="Chi tiết tài khoản kỹ thuật viên"
      footer={footer}
    >
      <div className="category-detail">
        <dl className="category-facts">
          <div><dt>Trạng thái</dt><dd><StaffStatus active={current.isActive} /></dd></div>
          <div><dt>Email</dt><dd>{current.email}</dd></div>
          <div><dt>Phòng ban</dt><dd>{current.department?.name ?? 'Chưa gán phòng'}{current.department && !current.department.isActive ? ' (đã ngừng)' : ''}</dd></div>
          <div><dt>Việc đang giữ</dt><dd className="num">{current.openAssignmentCount}</dd></div>
          <div><dt>Lịch sử liên quan</dt><dd className="num">{current.referenceCount}</dd></div>
          <div><dt>Tạo lúc</dt><dd>{formatCategoryDate(current.createdAt)}</dd></div>
          <div><dt>Cập nhật</dt><dd>{formatCategoryDate(current.updatedAt)}</dd></div>
        </dl>
        {detail.isError && (
          <p className="category-alert" role="alert">
            Không tải được dữ liệu mới nhất, đang hiển thị dữ liệu từ danh sách.{' '}
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void detail.refetch(); }}>Thử lại</button>
          </p>
        )}
        {current.openAssignmentCount > 0 && confirming === null && (
          <p className="category-detail__text text-muted">
            Còn {current.openAssignmentCount} sự cố chưa được phân công lại. Có thể khóa tài khoản, nhưng chưa thể đổi phòng ban.
          </p>
        )}
        {!current.isActive && current.referenceCount > 0 && confirming === null && (
          <p className="category-detail__text text-muted">
            Không thể xóa vì tài khoản còn {current.referenceCount} bản ghi lịch sử. Tài khoản được giữ lại để bảo toàn báo cáo và lịch sử xử lý.
          </p>
        )}
        {confirming === 'lock' && (
          <p className="category-confirm" role="alert">
            Khóa tài khoản “{name}”? Kỹ thuật viên sẽ không đăng nhập được. Sự cố đang giao vẫn giữ nguyên cho đến khi được phân công lại.
          </p>
        )}
        {confirming === 'delete' && (
          <p className="category-confirm" role="alert">
            Xóa vĩnh viễn “{name}”? Tài khoản chưa có báo cáo hay lịch sử nghiệp vụ. Thao tác này không thể hoàn tác.
          </p>
        )}
        {mutation.isError && <MutationError error={mutation.error} fallback="Không cập nhật được tài khoản. Vui lòng thử lại." />}
        {removal.isError && <MutationError error={removal.error} fallback="Không xóa được tài khoản. Vui lòng thử lại." />}
      </div>
    </Modal>
  );
}

function PasswordFields({
  passwordLabel,
  password,
  confirmPassword,
  showPassword,
  required,
  disabled,
  passwordError: passwordMessage,
  confirmError,
  helperText,
  onPasswordChange,
  onConfirmChange,
  onToggle,
  onBlur,
}: {
  passwordLabel: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  required: boolean;
  disabled: boolean;
  passwordError?: string;
  confirmError?: string;
  helperText: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onToggle: () => void;
  onBlur: () => void;
}) {
  return (
    <>
      <Input
        label={passwordLabel}
        required={required}
        type={showPassword ? 'text' : 'password'}
        value={password}
        autoComplete="new-password"
        disabled={disabled}
        error={passwordMessage}
        helperText={helperText}
        onChange={(event) => onPasswordChange(event.target.value)}
        onBlur={onBlur}
      />
      <Input
        label="Nhập lại mật khẩu"
        required={required}
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        autoComplete="new-password"
        disabled={disabled}
        error={confirmError}
        onChange={(event) => onConfirmChange(event.target.value)}
        onBlur={onBlur}
      />
      <button type="button" className="btn btn--ghost btn--sm" onClick={onToggle}>
        {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      </button>
    </>
  );
}
