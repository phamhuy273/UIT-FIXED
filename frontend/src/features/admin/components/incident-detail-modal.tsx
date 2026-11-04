import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import type { IncidentQueueItem } from '../api/dispatch.api';
import './incident-detail-modal.css';

interface IncidentDetailModalProps {
  incident: IncidentQueueItem;
  onClose: () => void;
  onDispatch?: () => void;
}

export function IncidentDetailModal({ incident, onClose, onDispatch }: IncidentDetailModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT':
        return 'Chờ phân công KTV';
      case 'ASSIGNED':
        return 'Chờ KTV tiếp nhận';
      case 'IN_PROGRESS':
        return 'KTV đang xử lý';
      case 'RESOLVED':
        return 'Đã hoàn tất khắc phục';
      default:
        return status;
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Chi tiết sự cố ${incident.report.code}`}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Đóng
            </button>
            {incident.status !== 'RESOLVED' && onDispatch && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  onClose();
                  onDispatch();
                }}
              >
                {incident.assignment ? 'Phân công lại' : 'Giao việc cho KTV'}
              </button>
            )}
          </>
        }
      >
        <div className="incident-detail-content">
          {/* Header Card */}
          <div className="detail-section" style={{ background: '#F8FAFC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {incident.report.title}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Badge kind="urgency" value={incident.urgency} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
              <span>Trạng thái: <strong>{getStatusText(incident.status)}</strong></span>
              {incident.deadline && (
                <span>Hạn chót: <strong>{formatDateTime(incident.deadline)}</strong></span>
              )}
            </div>
          </div>

          {/* Section 1: Report Details */}
          <div className="detail-section">
            <h4 className="detail-section-title">Thông tin phản ánh từ sinh viên</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-item-label">Vị trí</span>
                <span className="detail-item-value">
                  {incident.report.building.name} · {incident.report.location.floor?.name ?? 'Khu vực chung'} · {incident.report.location.name}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item-label">Danh mục</span>
                <span className="detail-item-value">{incident.report.category.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item-label">Người báo cáo</span>
                <span className="detail-item-value">
                  {incident.report.student.fullName ?? 'Sinh viên'} ({incident.report.student.email})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item-label">Thời gian gửi</span>
                <span className="detail-item-value">{formatDateTime(incident.report.createdAt)}</span>
              </div>
            </div>

            <div className="detail-item" style={{ marginTop: 4 }}>
              <span className="detail-item-label">Mô tả chi tiết</span>
              <p className="detail-item-value" style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {incident.report.description || 'Không có mô tả chi tiết.'}
              </p>
            </div>

            {incident.report.media && incident.report.media.length > 0 && (
              <div className="detail-item" style={{ marginTop: 4 }}>
                <span className="detail-item-label">Hình ảnh hiện trường ({incident.report.media.length})</span>
                <div className="detail-media-grid">
                  {incident.report.media.map((m) => (
                    <img
                      key={m.id}
                      src={m.url}
                      alt="Hiện trường"
                      className="detail-thumb"
                      onClick={() => setSelectedPhoto(m.url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Technician Assignment */}
          <div className="detail-section">
            <h4 className="detail-section-title">Phân công kỹ thuật viên</h4>
            {incident.assignment ? (
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-item-label">Kỹ thuật viên phụ trách</span>
                  <span className="detail-item-value" style={{ color: '#2563EB', fontWeight: 600 }}>
                    {incident.assignment.assignee.fullName ?? incident.assignment.assignee.email}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Phòng ban</span>
                  <span className="detail-item-value">{incident.assignment.departmentName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Người giao việc</span>
                  <span className="detail-item-value">
                    {incident.assignment.assignedBy.fullName ?? incident.assignment.assignedBy.email}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Thời gian giao</span>
                  <span className="detail-item-value">{formatDateTime(incident.assignment.createdAt)}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: '#D97706', fontSize: 13 }}>
                Sự cố chưa được phân công cho Kỹ thuật viên nào.
              </div>
            )}
          </div>

          {/* Section 3: Progress Notes */}
          {incident.progressNotes && incident.progressNotes.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-section-title">
                Nhật ký tiến độ hiện trường ({incident.progressNotes.length})
              </h4>
              <div className="detail-progress-list">
                {incident.progressNotes.map((note) => (
                  <div key={note.id} className="detail-progress-card">
                    <div>{note.content}</div>
                    <div className="detail-progress-meta">
                      <span>{note.author.fullName ?? note.author.email}</span>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Resolution info if resolved */}
          {incident.resolution && (
            <div className="detail-section" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
              <h4 className="detail-section-title" style={{ color: '#166534' }}>
                Kết quả nghiệm thu xử lý
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-item-label">Người hoàn tất</span>
                  <span className="detail-item-value">
                    {incident.resolution.resolvedBy.fullName ?? incident.resolution.resolvedBy.email}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label">Thời gian hoàn tất</span>
                  <span className="detail-item-value">{formatDateTime(incident.resolution.resolvedAt)}</span>
                </div>
              </div>
              <div className="detail-item" style={{ marginTop: 4 }}>
                <span className="detail-item-label">Ghi chú khắc phục</span>
                <p className="detail-item-value" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {incident.resolution.note}
                </p>
              </div>

              {incident.resolution.media && incident.resolution.media.length > 0 && (
                <div className="detail-item" style={{ marginTop: 4 }}>
                  <span className="detail-item-label">Ảnh nghiệm thu</span>
                  <div className="detail-media-grid">
                    {incident.resolution.media.map((m) => (
                      <img
                        key={m.id}
                        src={m.url}
                        alt="Nghiệm thu"
                        className="detail-thumb"
                        onClick={() => setSelectedPhoto(m.url)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Full-size Photo Preview Modal */}
      {selectedPhoto && (
        <Modal open onClose={() => setSelectedPhoto(null)} title="Xem ảnh">
          <div style={{ textAlign: 'center' }}>
            <img
              src={selectedPhoto}
              alt="Xem ảnh lớn"
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8 }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
