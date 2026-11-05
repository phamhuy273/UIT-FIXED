import { Button } from '@/components/ui/button';
import { sharedStatusLabels, type DuplicateCandidate, type DuplicateResult } from '../api/duplicates.api';
import '../duplicates.css';
import { formatCampusPeriod } from '../utils/observation-period';

const kindLabels = {
  POSSIBLE_DUPLICATE: 'Có thể cùng sự cố đang được ghi nhận',
  POSSIBLE_RECURRENCE: 'Có thể là lỗi tái phát sau sửa chữa',
  PAST_EVENT: 'Có thể bạn gặp lỗi trước khi sự cố được sửa',
  NEEDS_TIME: 'Sự cố tương tự đã sửa — cần xác nhận thời điểm',
};

export function DuplicateNotice({ result, loading, failed, reviewed, disabled, onConfirm, onContinue, onRetry }: {
  result?: DuplicateResult; loading: boolean; failed: boolean; reviewed: boolean; disabled: boolean;
  onConfirm: (candidate: DuplicateCandidate, relativeToRepair?: 'BEFORE' | 'AFTER') => void;
  onContinue: (candidate?: DuplicateCandidate, relativeToRepair?: 'BEFORE' | 'AFTER') => void; onRetry: () => void;
}) {
  return <section className="duplicate-notice" aria-label="Kiểm tra báo cáo tương tự" aria-busy={loading}>
    <h3>Kiểm tra sự cố tương tự</h3>
    {loading && <p role="status">Đang kiểm tra nội dung tương tự… Bạn vẫn có thể gửi nếu cần.</p>}
    {(failed || result?.availability === 'unavailable') && <div role="status">
      <p>Chưa kiểm tra được bằng AI. Bạn vẫn có thể gửi báo cáo bình thường.</p>
      <Button type="button" variant="ghost" size="sm" disabled={disabled || loading} onClick={onRetry}>Kiểm tra lại</Button>
    </div>}
    {result?.availability === 'partial' && <p>Chỉ kiểm tra được một phần dữ liệu phòng này. Kết quả có thể còn thiếu.</p>}
    {!loading && result?.availability === 'ready' && !result.candidates.length && <p role="status">Chưa tìm thấy báo cáo tương tự. Đây không phải kết luận chắc chắn rằng sự cố chưa được báo.</p>}
    {result?.candidates.map((item) => <article className="duplicate-match" key={item.reportId}>
      <strong>{kindLabels[item.kind]}</strong>
      <p>{item.summary} · {sharedStatusLabels[item.status] ?? item.status}</p>
      <p>{item.symptom}</p>
      {item.isOwnReport && <p>Bạn đã gửi báo cáo này và có thể theo dõi trong “Báo cáo của tôi”.</p>}
      <p>Ghi nhận: {formatCampusPeriod(item.reportedAt)}</p>
      {item.resolvedAt && <p>Đã khắc phục: {formatCampusPeriod(item.resolvedAt)}.</p>}
      {item.kind === 'NEEDS_TIME' && <p>Chưa xác định được thứ tự vì lỗi có thể xảy ra trong cùng buổi sửa hoặc bạn chưa chọn buổi. Bạn gặp lỗi trước hay sau khi sửa? Nếu không rõ, hãy tiếp tục gửi báo cáo mới.</p>}
      <div className="duplicate-actions">
        {item.canConfirm && <Button type="button" variant="outline" disabled={disabled} onClick={() => onConfirm(item)}>Tôi cũng gặp sự cố này</Button>}
        {item.kind === 'NEEDS_TIME' && !item.isOwnReport && <Button type="button" variant="outline" disabled={disabled} onClick={() => onConfirm(item, 'BEFORE')}>Tôi gặp lỗi trước khi sửa</Button>}
        {(item.kind === 'POSSIBLE_RECURRENCE' || item.kind === 'NEEDS_TIME') && <Button type="button" variant="outline" disabled={disabled} onClick={() => onContinue(item, 'AFTER')}>Lỗi xuất hiện lại sau khi sửa</Button>}
      </div>
    </article>)}
    {!!result?.candidates.length && <>
      <p>AI chỉ gợi ý. Cùng phòng có thể có nhiều thiết bị hoặc nhiều lỗi khác nhau.</p>
      <Button type="button" variant="ghost" disabled={disabled} onClick={() => onContinue()}>Đây là lỗi khác / Tôi không chắc — tiếp tục gửi mới</Button>
    </>}
    {reviewed && <p role="status">Bạn đã chọn tiếp tục gửi báo cáo mới. Bấm “Gửi báo cáo” để hoàn tất.</p>}
  </section>;
}
