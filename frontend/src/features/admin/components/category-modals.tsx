import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { masterDataKeys } from '@/features/master-data';
import { adminCategoryKeys, createCategory, deleteCategory, getAdminCategory, updateCategory } from '../api/categories.api';
import { formatCategoryDate } from '../lib/format-category-date';
import type { AdminCategory, CategoryUpdate } from '../types/admin.types';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

export function CategoryStatus({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge--success' : 'badge--neutral'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {active ? 'Đang sử dụng' : 'Ngừng sử dụng'}
    </span>
  );
}

function useCategoryMutation<TInput>(mutationFn: (input: TInput) => Promise<AdminCategory>, onSaved: (category: AdminCategory) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (category) => {
      queryClient.setQueryData(adminCategoryKeys.detail(category.id), category);
      // The report form and review modal read the active list, so it must refresh too.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: masterDataKeys.categories }),
      ]);
      onSaved(category);
    },
  });
}

function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  // Axios network failures carry an English message and no statusCode; only API errors are shown verbatim.
  const fromApi = typeof error === 'object' && error !== null && 'statusCode' in error;
  return <p className="category-alert" role="alert">{fromApi ? readErrorMessage(error, fallback) : fallback}</p>;
}

export function CategoryFormModal({ category, onClose, onSaved }: {
  category: AdminCategory | null;
  onClose: () => void;
  onSaved: (category: AdminCategory, created: boolean) => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [touched, setTouched] = useState(false);
  const mutation = useCategoryMutation(
    (input: { name: string; description: string | null }) => category ? updateCategory(category.id, input) : createCategory(input),
    (saved) => onSaved(saved, !category),
  );
  const trimmedName = name.trim();
  const nameError = touched && !trimmedName ? 'Vui lòng nhập tên danh mục.' : undefined;
  const formId = category ? `category-form-${category.id}` : 'category-form-new';

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
      title={category ? 'Sửa danh mục' : 'Thêm danh mục'}
      description={category ? 'Đổi tên hoặc mô tả. Báo cáo cũ vẫn gắn với danh mục này.' : 'Danh mục mới sẽ xuất hiện ngay trong form báo cáo của sinh viên.'}
      footer={<>
        <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Hủy</Button>
        <Button type="submit" form={formId} loading={mutation.isPending}>
          {category ? 'Lưu thay đổi' : 'Tạo danh mục'}
        </Button>
      </>}
    >
      <form id={formId} className="category-form" onSubmit={submit} noValidate>
        <Input
          label="Tên danh mục"
          required
          value={name}
          maxLength={NAME_MAX}
          disabled={mutation.isPending}
          error={nameError}
          helperText="Không trùng với danh mục khác, kể cả danh mục đã ngừng sử dụng."
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
            placeholder="Ví dụ: Đèn, nguồn điện và ổ cắm."
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="field__hint">{description.length}/{DESCRIPTION_MAX} ký tự</span>
        </div>
        {mutation.isError && <MutationError error={mutation.error} fallback="Không lưu được danh mục. Vui lòng thử lại." />}
      </form>
    </Modal>
  );
}

export function CategoryDetailModal({ category, onClose, onEdit, onSaved, onDeleted }: {
  category: AdminCategory;
  onClose: () => void;
  onEdit: (category: AdminCategory) => void;
  onSaved: (category: AdminCategory) => void;
  onDeleted: (category: AdminCategory) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'deactivate' | 'delete' | null>(null);
  const detail = useQuery({
    queryKey: adminCategoryKeys.detail(category.id),
    queryFn: ({ signal }) => getAdminCategory(category.id, signal),
    placeholderData: category,
  });
  const current = detail.data ?? category;
  const mutation = useCategoryMutation((input: CategoryUpdate) => updateCategory(category.id, input), (saved) => {
    setConfirming(null);
    onSaved(saved);
  });
  const removal = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: () => {
      // Close first so the detail query has no observer left to refetch a 404.
      onDeleted(current);
      queryClient.removeQueries({ queryKey: adminCategoryKeys.detail(category.id) });
      void queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: masterDataKeys.categories });
    },
    onError: () => { void detail.refetch(); },
  });
  const busy = mutation.isPending || removal.isPending;
  const deletable = !current.isActive && current.reportCount === 0;

  const footer = confirming === 'deactivate' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => setConfirming(null)}>Quay lại</Button>
    <Button variant="danger" loading={mutation.isPending} onClick={() => mutation.mutate({ isActive: false })}>Xác nhận ngừng sử dụng</Button>
  </> : confirming === 'delete' ? <>
    <Button variant="secondary" disabled={busy} onClick={() => { setConfirming(null); removal.reset(); }}>Quay lại</Button>
    <Button variant="danger" loading={removal.isPending} disabled={!deletable} onClick={() => removal.mutate()}>Xóa vĩnh viễn</Button>
  </> : <>
    {deletable && <Button variant="danger" disabled={busy} onClick={() => setConfirming('delete')}>Xóa</Button>}
    {current.isActive
      ? <Button variant="secondary" disabled={busy} onClick={() => setConfirming('deactivate')}>Ngừng sử dụng</Button>
      : <Button variant="secondary" loading={mutation.isPending} disabled={busy} onClick={() => mutation.mutate({ isActive: true })}>Kích hoạt lại</Button>}
    <Button disabled={busy} onClick={() => onEdit(current)}>Sửa</Button>
  </>;

  return (
    <Modal
      open
      onClose={() => { if (!busy) onClose(); }}
      closeOnBackdrop={!busy}
      title={current.name}
      description="Chi tiết danh mục sự cố"
      footer={footer}
    >
      <div className="category-detail">
        <dl className="category-facts">
          <div><dt>Trạng thái</dt><dd><CategoryStatus active={current.isActive} /></dd></div>
          <div><dt>Báo cáo đã gắn</dt><dd className="num">{current.reportCount}</dd></div>
          <div><dt>Tạo lúc</dt><dd>{formatCategoryDate(current.createdAt)}</dd></div>
          <div><dt>Cập nhật</dt><dd>{formatCategoryDate(current.updatedAt)}</dd></div>
        </dl>
        <div>
          <h3 className="category-detail__label">Mô tả</h3>
          <p className={current.description ? 'category-detail__text' : 'category-detail__text text-muted'}>
            {current.description ?? 'Chưa có mô tả.'}
          </p>
        </div>
        {detail.isError && (
          <p className="category-alert" role="alert">
            Không tải được dữ liệu mới nhất, đang hiển thị dữ liệu từ danh sách.{' '}
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => { void detail.refetch(); }}>Thử lại</button>
          </p>
        )}
        {!current.isActive && current.reportCount > 0 && confirming === null && (
          <p className="category-detail__text text-muted">
            Không thể xóa vì còn {current.reportCount} báo cáo gắn danh mục này. Danh mục được giữ lại để bảo toàn lịch sử.
          </p>
        )}
        {confirming === 'deactivate' && (
          <p className="category-confirm" role="alert">
            Sinh viên sẽ không chọn được “{current.name}” khi gửi báo cáo mới. {current.reportCount} báo cáo đã gắn danh mục này vẫn giữ nguyên.
          </p>
        )}
        {confirming === 'delete' && (
          <p className="category-confirm" role="alert">
            Xóa vĩnh viễn “{current.name}”? Danh mục chưa gắn với báo cáo nào. Thao tác này không thể hoàn tác.
          </p>
        )}
        {mutation.isError && <MutationError error={mutation.error} fallback="Không cập nhật được trạng thái. Vui lòng thử lại." />}
        {removal.isError && <MutationError error={removal.error} fallback="Không xóa được danh mục. Vui lòng thử lại." />}
      </div>
    </Modal>
  );
}
