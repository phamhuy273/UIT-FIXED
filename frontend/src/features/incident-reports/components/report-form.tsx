import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { LocationSelector, useLocations, useCategories, isValidLocationSelection, type LocationSelection } from '@/features/master-data';
import { ImageUploader } from '@/features/media/components/image-uploader';
import type { UploadMediaResponse } from '@/features/media/api/upload-media.api';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import { createReport } from '../api/incident-reports.api';
import { urgencyLabels, type Urgency } from '../types/incident-report.types';

export function ReportForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const buildings = useLocations();
  const categories = useCategories();
  const [location, setLocation] = useState<LocationSelection>({ buildingId: null, floorId: null, locationId: null });
  const [categoryId, setCategoryId] = useState('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<UploadMediaResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: createReport, onSuccess: async (report) => {
    await queryClient.invalidateQueries({ queryKey: ['reports'], refetchType: 'all' });
    navigate('/', { replace: true, state: { message: `Đã gửi báo cáo ${report.code}.` } });
  } });
  return <>
    <PageHeader eyebrow="BÁO CÁO SỰ CỐ" title="Không gian tốt hơn, từ bạn." description="Cho chúng tôi biết vị trí và tình trạng phòng học cần hỗ trợ." />
    <form className="report-form" noValidate onSubmit={(event) => {
      event.preventDefault(); setError('');
      if (mutation.isPending || uploading) return;
      if (!isValidLocationSelection(buildings.data ?? [], location)) { setError('Vui lòng chọn đúng tòa, tầng và phòng học.'); return; }
      if (!categories.data?.some((item) => item.id === Number(categoryId))) { setError('Vui lòng chọn danh mục sự cố.'); return; }
      if (title.trim().length < 5 || description.trim().length < 10) { setError('Tiêu đề cần ít nhất 5 ký tự và mô tả ít nhất 10 ký tự.'); return; }
      mutation.mutate({ buildingId: location.buildingId!, locationId: location.locationId!, categoryId: Number(categoryId), title: title.trim(), description: description.trim(), ...(urgency ? { urgency } : {}), mediaIds: images.map((image) => image.id) });
    }}>
      <section className="report-panel"><div className="report-section-heading"><span>01</span><h2>Vị trí chính xác</h2></div>
        <LocationSelector value={location} onChange={setLocation} required disabled={mutation.isPending} />
      </section>
      <section className="report-panel"><div className="report-section-heading"><span>02</span><h2>Phân loại sự cố</h2></div>
        <div className="report-field-grid"><div className="ui-field"><label htmlFor="report-category">Danh mục *</label>
          <select id="report-category" className="ui-select" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categories.isPending || categories.isError || mutation.isPending}>
            <option value="">Chọn danh mục</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>{categories.isError && <div role="alert" className="field-error">Không tải được danh mục. <Button variant="outline" size="sm" onClick={() => { void categories.refetch(); }}>Thử lại</Button></div>}
        </div><div className="ui-field"><label htmlFor="report-urgency">Mức độ đề xuất</label><select id="report-urgency" className="ui-select" value={urgency} onChange={(event) => setUrgency(event.target.value as Urgency | '')} disabled={mutation.isPending}>
          <option value="">Để quản trị viên xác định</option>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select><p className="field-helper">Quản trị viên xác nhận mức độ khi duyệt.</p></div></div>
      </section>
      <section className="report-panel"><div className="report-section-heading"><span>03</span><h2>Chi tiết hiện trạng</h2></div>
        <Input label="Tiêu đề ngắn" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} disabled={mutation.isPending} placeholder="Ví dụ: Máy chiếu không nhận tín hiệu HDMI" />
        <div className="ui-field report-description"><label htmlFor="report-description">Mô tả sự cố *</label><textarea id="report-description" required rows={5} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={mutation.isPending} placeholder="Sự cố xảy ra thế nào? Thiết bị hoặc khu vực nào bị ảnh hưởng?" /></div>
        <div className="report-upload"><h3>Hình ảnh hiện trường</h3><p className="field-helper">Không bắt buộc · Tối đa 3 ảnh · JPG, PNG, WebP, mỗi ảnh tối đa 5MB.</p>
          <ImageUploader disabled={images.length >= 3 || mutation.isPending} onLoadingChange={setUploading} onSuccess={(image) => setImages((current) => [...current, image])} />
          <div className="report-thumbnails">{images.map((image) => <figure key={image.id}><img src={image.url} alt="Ảnh hiện trường đã tải lên" /><Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))} aria-label="Bỏ ảnh khỏi báo cáo">✕</Button></figure>)}</div>
        </div>
      </section>
      {(error || mutation.isError) && <p className="error-notice" role="alert">{error || readErrorMessage(mutation.error, 'Không gửi được báo cáo. Vui lòng thử lại.')}</p>}
      <div className="report-submit-bar"><p>Báo cáo sẽ được quản trị viên kiểm tra trước khi xử lý.</p><Button type="submit" size="lg" loading={mutation.isPending} disabled={uploading || buildings.isPending || buildings.isError || categories.isPending || categories.isError}>Gửi báo cáo sự cố</Button></div>
    </form>
  </>;
}
