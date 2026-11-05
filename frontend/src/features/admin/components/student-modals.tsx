import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { emailError, fullNameError, passwordError } from '@/features/auth/lib/auth-rules';
import { adminStudentKeys, createStudent, deleteStudent, getAdminStudent, updateStudent } from '../api/students.api';
import { formatCategoryDate } from '../lib/format-category-date';
import type { AdminStudent, StudentUpdate } from '../types/admin.types';
import { MutationError } from './category-modals';

export function StudentStatus({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge--success' : 'badge--neutral'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {active ? 'Đang hoạt động' : 'Đã khóa'}
    </span>
  );
}

function useStudentMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AdminStudent>,
  onSaved: (student: AdminStudent) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (student) => {
      queryClient.setQueryData(adminStudentKeys.detail(student.id), student);
      await queryClient.invalidateQueries({ queryKey: adminStudentKeys.all });
      onSaved(student);
    },
  });
}

function displayName(student: Pick<AdminStudent, 'fullName' | 'email'>) {
  return student.fullName?.trim() || student.email;
}

export function StudentFormModal({ student, onClose, onSaved }: {
  student: AdminStudent | null;
  onClose: () => void;
  onSaved: (student: AdminStudent, created: boolean, passwordChanged: boolean) => void;
}) {
  const creating = student === null;
  const [fullName, setFullName] = useState(student?.fullName ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const mutation = useStudentMutation(
    (input: { fullName: string; email: string; password?: string }) => {
      if (!student) {
        return createStudent({ fullName: input.fullName, email: input.email, password: input.password ?? '' });
      }
      return updateStudent(student.id, {
        fullName: input.fullName,
        email: input.email,
        ...(input.password ? { password: input.password } : {}),
      });
    },
    (saved) => onSaved(saved, creating, password.length > 0),
  );

  const changingPassword = creating || password.length > 0 || confirmPassword.length > 0;
  const nameMessage = fullNameError(fullName);
  const emailMessage = emailError(email);
  const passwordMessage = changingPassword ? passwordError(password) : null;
  const confirmMessage = changingPassword && password !== confirmPassword ? 'Mật khẩu xác nhận không khớp.' : null;
  const formId = creating ? 'student-form-new' : `student-form-${student.id}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameMessage || emailMessage || passwordMessage || confirmMessage || mutation.isPending) return;
    mutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      ...(changingPassword ? { password } : {}),
    });
  };

  return (
    <Modal
      open
      onClose={() => { if (!mutation.isPending) onClose(); }}
      closeOnBackdrop={!mutation.isPending}
      title={creating ? 'Thêm sinh viên' : 'Sửa sinh viên'}
      description={creating
        ? 'Tài khoản được kích hoạt ngay. Hãy chuyển mật khẩu cho sinh viên bên ngoài hệ thống.'
        : 'Đổi họ tên, email hoặc đặt mật khẩu mới khi sinh viên quên. Hệ thống không gửi email.'}
      footer={<>
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Hủy</Button>
        <Button type="submit" form={formId} loading={mutation.isPending}>
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
          label="Email sinh viên"
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
        {mutation.isError && <MutationError error={mutation.error} fallback="Không lưu được tài khoản sinh viên. Vui lòng thử lại." />}
      </form>
    </Modal>
  );
}

export function StudentDetailModal({ student, onClose, onEdit, onSaved, onDeleted }: {
  student: AdminStudent;
  onClose: () => void;
  onEdit: (student: AdminStudent) => void;
  onSaved: (student: AdminStudent) => void;
  onDeleted: (student: AdminStudent) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'lock' | 'delete' | null>(null);
  const detail = useQuery({
    queryKey: adminStudentKeys.detail(student.id),
    queryFn: ({ signal }) => getAdminStudent(student.id, signal),
    placeholderData: student,
  });
  const current = detail.data ?? student;
  const mutation = useStudentMutation((input: StudentUpdate) => updateStudent(current.id, input), (saved) => {
    setConfirming(null);
    onSaved(saved);
  });
  const removal = useMutation({
    mutationFn: () => deleteStudent(current.id),
    onSuccess: () => {
      onDeleted(current);
      queryClient.removeQueries({ queryKey: adminStudentKeys.detail(current.id) });
      void queryClient.invalidateQueries({ queryKey: adminStudentKeys.all });
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
      description="Chi tiết tài khoản sinh viên"
      footer={footer}
    >
      <div className="category-detail">
        <dl className="category-facts">
          <div><dt>Trạng thái</dt><dd><StudentStatus active={current.isActive} /></dd></div>
          <div><dt>Email</dt><dd>{current.email}</dd></div>
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
        {!current.isActive && current.referenceCount > 0 && confirming === null && (
          <p className="category-detail__text text-muted">
            Không thể xóa vì tài khoản còn {current.referenceCount} bản ghi lịch sử. Tài khoản được giữ lại để bảo toàn báo cáo và lịch sử xử lý.
          </p>
        )}
        {confirming === 'lock' && (
          <p className="category-confirm" role="alert">
            Khóa tài khoản “{name}”? Sinh viên sẽ không đăng nhập được. Báo cáo và lịch sử đã có vẫn được giữ.
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
  passwordError,
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
        error={passwordError}
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
