import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Play,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/stores/auth.store';
import {
  acceptStaffTask,
  getStaffTasks,
  type StaffTasksResponse,
} from '../api/staff.api';
import type { IncidentQueueItem } from '@/features/admin/api/dispatch.api';
import { ProgressNoteModal } from './progress-note-modal';
import { ResolveModal } from './resolve-modal';
import '../staff.css';

function formatSla(deadlineToFormat: string | null) {
  if (!deadlineToFormat) return null;
  const deadline = new Date(deadlineToFormat);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdueMin = Math.abs(Math.round(diffMs / (60 * 1000)));
    if (overdueMin < 60) return { text: `Quá hạn ${overdueMin} phút`, type: 'is-overdue' };
    const overdueHour = Math.floor(overdueMin / 60);
    return { text: `Quá hạn ${overdueHour} giờ`, type: 'is-overdue' };
  }

  const min = Math.round(diffMs / (60 * 1000));
  if (min < 60) {
    return { text: `Còn ${min} phút (Gấp)`, type: 'is-warning' };
  }
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  if (hours < 24) {
    return { text: `Còn ${hours}h ${remMin > 0 ? `${remMin}m` : ''}`, type: hours <= 2 ? 'is-warning' : 'is-normal' };
  }
  const days = Math.floor(hours / 24);
  return { text: `Còn ${days} ngày`, type: 'is-normal' };
}

export function StaffWorkspace() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'>('ASSIGNED');
  const [selectedIncidentForNote, setSelectedIncidentForNote] = useState<IncidentQueueItem | null>(null);
  const [selectedIncidentForResolve, setSelectedIncidentForResolve] = useState<IncidentQueueItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery<StaffTasksResponse>({
    queryKey: ['staff-tasks', activeTab],
    queryFn: () => getStaffTasks({ tab: activeTab }),
    refetchInterval: 15_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => acceptStaffTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      setActiveTab('IN_PROGRESS');
    },
  });

  const counts = data?.counts ?? { all: 0, assigned: 0, inProgress: 0, resolved: 0 };

  return (
    <div className="staff-page">
      {/* 1. Header Hero Card */}
      <div className="staff-hero">
        <div className="staff-profile">
          <div className="staff-avatar-large">
            {user?.fullName?.charAt(0).toUpperCase() ?? 'K'}
          </div>
          <div>
            <h1 className="staff-hero-name">{user?.fullName ?? 'Kỹ thuật viên UIT'}</h1>
            <div className="staff-hero-dept">
              {data?.department?.name ?? 'Đội Kỹ thuật & Sửa chữa UIT'}
            </div>
            <div className="text-small text-muted" style={{ marginTop: 2 }}>
              {user?.email}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => void refetch()}
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. Workload Metrics */}
      <div className="staff-metrics">
        <div className="metric-card is-assigned">
          <div className="metric-val" style={{ color: '#2563EB' }}>
            {counts.assigned}
          </div>
          <div className="metric-label">Việc chờ tiếp nhận</div>
        </div>
        <div className="metric-card is-in-progress">
          <div className="metric-val" style={{ color: '#F59E0B' }}>
            {counts.inProgress}
          </div>
          <div className="metric-label">Đang xử lý tại hiện trường</div>
        </div>
        <div className="metric-card is-resolved">
          <div className="metric-val" style={{ color: '#10B981' }}>
            {counts.resolved}
          </div>
          <div className="metric-label">Đã hoàn tất khắc phục</div>
        </div>
      </div>

      {/* 3. Segmented Tabs */}
      <div className="staff-tabs">
        <button
          type="button"
          className={`staff-tab-btn ${activeTab === 'ASSIGNED' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('ASSIGNED')}
        >
          <span>Chờ tiếp nhận</span>
          <span className="tab-badge">{counts.assigned}</span>
        </button>
        <button
          type="button"
          className={`staff-tab-btn ${activeTab === 'IN_PROGRESS' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('IN_PROGRESS')}
        >
          <span>Đang xử lý</span>
          <span className="tab-badge">{counts.inProgress}</span>
        </button>
        <button
          type="button"
          className={`staff-tab-btn ${activeTab === 'RESOLVED' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('RESOLVED')}
        >
          <span>Đã hoàn thành</span>
          <span className="tab-badge">{counts.resolved}</span>
        </button>
      </div>

      {/* 4. Task List */}
      {isPending && (
        <div className="text-center text-muted" style={{ padding: 40 }}>
          Đang tải danh sách công việc...
        </div>
      )}

      {isError && (
        <div
          style={{
            padding: 20,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            color: '#991B1B',
            textAlign: 'center',
          }}
        >
          Không thể tải danh sách công việc. Vui lòng kiểm tra lại kết nối.
        </div>
      )}

      {data && data.items.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
            {activeTab === 'ASSIGNED'
              ? 'Không có công việc nào đang chờ tiếp nhận'
              : activeTab === 'IN_PROGRESS'
                ? 'Hiện tại không có sự cố nào đang trong tiến trình xử lý'
                : 'Chưa có sự cố nào hoàn tất'}
          </div>
          <p className="text-small text-muted" style={{ marginTop: 4 }}>
            Mọi sự cố mới được Admin điều phối sẽ tự động hiển thị tại đây.
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div className="staff-task-list">
          {data.items.map((task) => {
            const sla = formatSla(task.deadline);
            return (
              <div key={task.id} className="staff-task-card">
                {/* Header */}
                <div className="task-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="room-prominent-badge">
                      <MapPin size={15} />
                      {task.report.location.name}
                    </span>
                    <Badge kind="urgency" value={task.urgency} />
                    <span className="text-small text-muted" style={{ fontWeight: 600 }}>
                      {task.report.code}
                    </span>
                  </div>

                  {sla && (
                    <div className={`sla-clock ${sla.type}`}>
                      <Clock size={14} />
                      <span>{sla.text}</span>
                    </div>
                  )}
                </div>

                {/* Location detail */}
                <div className="text-small text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{task.report.building.name}</span>
                  <span>·</span>
                  <span>{task.report.location.floor?.name ?? 'Khu vực chung'}</span>
                  <span>·</span>
                  <span>Danh mục: <strong>{task.report.category.name}</strong></span>
                </div>

                {/* Title & Desc */}
                <div>
                  <h3 className="task-title">{task.report.title}</h3>
                  <p className="task-desc" style={{ marginTop: 6 }}>
                    {task.report.description}
                  </p>
                </div>

                {/* Student photos */}
                {task.report.media && task.report.media.length > 0 && (
                  <div>
                    <span className="text-small text-muted" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                      Ảnh hiện trường do sinh viên chụp ({task.report.media.length}):
                    </span>
                    <div className="task-photos">
                      {task.report.media.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt="Ảnh lỗi"
                          className="task-photo-thumb"
                          onClick={() => setZoomedImage(img.url)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress notes if any */}
                {task.progressNotes && task.progressNotes.length > 0 && (
                  <div className="task-progress-box">
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#334155' }}>
                      Nhật ký tiến độ hiện trường ({task.progressNotes.length}):
                    </span>
                    <div style={{ marginTop: 4 }}>
                      {task.progressNotes.map((note) => (
                        <div key={note.id} className="task-progress-item">
                          <span>•</span>
                          <div>
                            <span>{note.content}</span>
                            <span className="text-small text-muted" style={{ marginLeft: 8 }}>
                              ({new Date(note.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution note if resolved */}
                {task.resolution && (
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={15} /> Kết quả khắc phục ({new Date(task.resolution.resolvedAt).toLocaleDateString('vi-VN')}):
                    </div>
                    <div style={{ marginTop: 4, color: '#15803D' }}>{task.resolution.note}</div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="task-card-actions">
                  {task.status === 'ASSIGNED' && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate(task.id)}
                    >
                      <Play size={16} style={{ marginRight: 6 }} />
                      {acceptMutation.isPending ? 'Đang tiếp nhận...' : 'Tiếp nhận xử lý'}
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => setSelectedIncidentForNote(task)}
                      >
                        <FileText size={15} style={{ marginRight: 6 }} />
                        Thêm ghi chú tiến độ
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ background: '#16A34A', borderColor: '#16A34A' }}
                        onClick={() => setSelectedIncidentForResolve(task)}
                      >
                        <Wrench size={15} style={{ marginRight: 6 }} />
                        Hoàn tất xử lý
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Note Modal */}
      {selectedIncidentForNote && (
        <ProgressNoteModal
          incidentId={selectedIncidentForNote.id}
          incidentCode={selectedIncidentForNote.report.code}
          onClose={() => setSelectedIncidentForNote(null)}
        />
      )}

      {/* Resolve Modal */}
      {selectedIncidentForResolve && (
        <ResolveModal
          incidentId={selectedIncidentForResolve.id}
          incidentCode={selectedIncidentForResolve.report.code}
          onClose={() => setSelectedIncidentForResolve(null)}
        />
      )}

      {/* Zoom Image Modal */}
      {zoomedImage && (
        <Modal
          open
          onClose={() => setZoomedImage(null)}
          title="Ảnh hiện trường"
          footer={
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setZoomedImage(null)}
            >
              Đóng
            </button>
          }
        >
          <img
            src={zoomedImage}
            alt="Phóng to ảnh"
            style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </Modal>
      )}
    </div>
  );
}
