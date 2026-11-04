import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import {
  LocationSelector,
  useLocations,
  useCategories,
  isValidLocationSelection,
  type LocationSelection,
} from '@/features/master-data';
import { ImageUploader } from '@/features/media/components/image-uploader';
import type { UploadMediaResponse } from '@/features/media/api/upload-media.api';
import { createReport } from '../api/incident-reports.api';
import {
  urgencyLabels,
  type CreateReportInput,
  type Urgency,
} from '../types/incident-report.types';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import '../incidents.css';

export function ReportForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const buildings = useLocations();
  const categories = useCategories();
  const [location, setLocation] = useState<LocationSelection>({
    buildingId: null,
    floorId: null,
    locationId: null,
  });
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [images, setImages] = useState<UploadMediaResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: CreateReportInput) => createReport(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigate('/', { replace: true });
    },
  });

  return (
    <div className="page">
      <PageHeader
        title="Tạo báo cáo sự cố"
        description="Thông tin của bạn sẽ được chuyển đến ban quản trị và đội ngũ kỹ thuật xử lý."
      />

      <div className="layout-2col">
        <form
          className="form-card"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (uploading) {
              setError('Vui lòng đợi ảnh tải lên hoàn tất.');
              return;
            }
            if (!isValidLocationSelection(buildings.data ?? [], location)) {
              setError('Vui lòng chọn đúng tòa, tầng và phòng học.');
              return;
            }
            if (!categories.data?.some((item) => item.id === Number(categoryId))) {
              setError('Vui lòng chọn danh mục sự cố.');
              return;
            }
            if (title.trim().length < 5 || description.trim().length < 10) {
              setError('Tiêu đề cần ít nhất 5 ký tự và mô tả ít nhất 10 ký tự.');
              return;
            }
            mutation.mutate({
              buildingId: location.buildingId!,
              locationId: location.locationId!,
              categoryId: Number(categoryId),
              title: title.trim(),
              description: description.trim(),
              ...(urgency ? { urgency } : {}),
              mediaIds: images.map((image) => image.id),
            });
          }}
        >
          {/* Section 1: Location */}
          <section className="form-section">
            <div className="form-section__meta">
              <h2>Vị trí</h2>
              <p>Chọn tòa nhà và phòng gặp sự cố.</p>
            </div>
            <div className="form-section__body">
              <LocationSelector
                value={location}
                onChange={setLocation}
                required
                disabled={mutation.isPending}
              />
            </div>
          </section>

          {/* Section 2: Category & Urgency */}
          <section className="form-section">
            <div className="form-section__meta">
              <h2>Phân loại</h2>
              <p>Loại thiết bị và mức độ khẩn cấp đề xuất.</p>
            </div>
            <div className="form-section__body">
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor="report-category">
                    Danh mục <span className="req">*</span>
                  </label>
                  <select
                    id="report-category"
                    className="select"
                    required
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    disabled={categories.isPending || categories.isError || mutation.isPending}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.data?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {categories.isError && (
                    <div role="alert" className="field__error">
                      Không tải được danh mục.{' '}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          void categories.refetch();
                        }}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="report-urgency">
                    Mức độ đề xuất
                  </label>
                  <select
                    id="report-urgency"
                    className="select"
                    value={urgency}
                    onChange={(event) => setUrgency(event.target.value as Urgency | '')}
                    disabled={mutation.isPending}
                  >
                    <option value="">Để quản trị viên xác định</option>
                    {Object.entries(urgencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="field__hint">Quản trị viên xác nhận mức độ khi duyệt.</p>
            </div>
          </section>

          {/* Section 3: Details & Media */}
          <section className="form-section">
            <div className="form-section__meta">
              <h2>Chi tiết hiện trạng</h2>
              <p>Mô tả rõ hiện tượng giúp kỹ thuật viên chuẩn bị đồ nghề.</p>
            </div>
            <div className="form-section__body">
              <div className="field">
                <label className="field__label" htmlFor="report-title">
                  Tiêu đề ngắn <span className="req">*</span>
                </label>
                <input
                  id="report-title"
                  className="input"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={mutation.isPending}
                  placeholder="Ví dụ: Máy chiếu phòng A205 không nhận tín hiệu HDMI"
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="report-description">
                  Mô tả chi tiết sự cố <span className="req">*</span>
                </label>
                <textarea
                  id="report-description"
                  className="textarea"
                  required
                  rows={4}
                  maxLength={3000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={mutation.isPending}
                  placeholder="Sự cố xảy ra thế nào? Thiết bị hoặc khu vực nào bị ảnh hưởng?"
                />
              </div>

              <div className="field">
                <label className="field__label">Hình ảnh hiện trường (Tùy chọn)</label>
                <p className="field__hint">
                  Tối đa 3 ảnh · JPG, PNG, WebP (mỗi ảnh ≤ 5MB).
                </p>
                <ImageUploader
                  disabled={images.length >= 3 || mutation.isPending}
                  onLoadingChange={setUploading}
                  onSuccess={(image) => setImages((current) => [...current, image])}
                />
                {images.length > 0 && (
                  <div className="report-thumbnails" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {images.map((image) => (
                      <figure key={image.id} style={{ position: 'relative', margin: 0 }}>
                        <img
                          src={image.url}
                          alt="Ảnh hiện trường đã tải lên"
                          className="report-thumb"
                        />
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '22px',
                            height: '22px',
                            padding: 0,
                            borderRadius: '50%',
                          }}
                          disabled={mutation.isPending}
                          onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                          aria-label="Bỏ ảnh khỏi báo cáo"
                        >
                          ✕
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {error || mutation.isError ? (
            <p className="field__error" role="alert" style={{ marginTop: '16px', fontSize: '13px' }}>
              {error || readErrorMessage(mutation.error, 'Không gửi được báo cáo. Vui lòng thử lại.')}
            </p>
          ) : null}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate('/')}
              disabled={mutation.isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={
                mutation.isPending ||
                uploading ||
                buildings.isPending ||
                buildings.isError ||
                categories.isPending ||
                categories.isError
              }
            >
              {mutation.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>

        <aside className="layout-2col__aside">
          <div className="card aside-card">
            <h3>Quy trình xử lý</h3>
            <ol className="steps">
              <li>
                <span className="steps__dot" />
                <b>Gửi báo cáo</b>
                <small>Chọn phòng, mô tả, đính kèm ảnh.</small>
              </li>
              <li>
                <span className="steps__dot" />
                <b>Quản trị viên duyệt</b>
                <small>Xác nhận và đánh giá mức độ.</small>
              </li>
              <li>
                <span className="steps__dot" />
                <b>Kỹ thuật viên xử lý</b>
                <small>Được phân công và sửa chữa.</small>
              </li>
              <li>
                <span className="steps__dot" />
                <b>Bạn xác nhận</b>
                <small>Xác nhận khi đã sửa xong.</small>
              </li>
            </ol>
          </div>
          <div className="card aside-card">
            <h3>Cần hỗ trợ gấp?</h3>
            <p className="text-muted">Văn phòng Quản trị Thiết bị</p>
            <p className="aside-phone">(028) 372 52002</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
