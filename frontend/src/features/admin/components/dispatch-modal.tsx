import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { readErrorMessage } from '@/features/auth/lib/api-error';
import {
  assignIncident,
  getDepartments,
  getDepartmentStaff,
  type DepartmentOption,
  type IncidentQueueItem,
  type StaffMemberOption,
} from '../api/dispatch.api';
import '../dispatch-modal.css';

interface DispatchModalProps {
  incident: IncidentQueueItem;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatchModal({ incident, onClose, onSuccess }: DispatchModalProps) {
  const queryClient = useQueryClient();
  const defaultDeptId = incident.report.building.defaultDepartmentId ?? undefined;

  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(defaultDeptId);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(incident.assignment?.assignee?.id ?? null);
  const [deadlinePreset, setDeadlinePreset] = useState<'2h' | '24h' | '3d' | 'custom'>('24h');
  const [customDeadline, setCustomDeadline] = useState('');
  const [note, setNote] = useState('');

  // 1. Fetch departments
  const deptsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  // Automatically select default or first department
  useEffect(() => {
    if (!selectedDeptId && deptsQuery.data && deptsQuery.data.length > 0) {
      const match = defaultDeptId ? deptsQuery.data.find((d) => d.id === defaultDeptId) : null;
      setSelectedDeptId(match ? match.id : deptsQuery.data[0].id);
    }
  }, [selectedDeptId, deptsQuery.data, defaultDeptId]);

  // 2. Fetch staff for selected department
  const staffQuery = useQuery({
    queryKey: ['department-staff', selectedDeptId],
    queryFn: () => getDepartmentStaff(selectedDeptId!),
    enabled: !!selectedDeptId,
    staleTime: 0,
  });

  // Automatically select first available staff if none selected
  useEffect(() => {
    if (staffQuery.data && staffQuery.data.length > 0) {
      const currentSelectedStillExists = staffQuery.data.some((s) => s.id === selectedStaffId);
      if (!currentSelectedStillExists) {
        // Prefer available staff (workload = 0)
        const available = staffQuery.data.find((s) => s.workloadStatus === 'AVAILABLE');
        setSelectedStaffId(available?.id ?? staffQuery.data[0].id);
      }
    } else {
      setSelectedStaffId(null);
    }
  }, [staffQuery.data, selectedStaffId]);

  // Calculate deadline date
  const computeDeadline = (): string | undefined => {
    const now = new Date();
    if (deadlinePreset === '2h') {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }
    if (deadlinePreset === '24h') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
    if (deadlinePreset === '3d') {
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (deadlinePreset === 'custom' && customDeadline) {
      return new Date(customDeadline).toISOString();
    }
    return undefined;
  };

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedDeptId || !selectedStaffId) {
        throw new Error('Vui lòng chọn phòng ban và kỹ thuật viên.');
      }
      return assignIncident(incident.id, {
        departmentId: selectedDeptId,
        assigneeId: selectedStaffId,
        deadline: computeDeadline(),
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      await queryClient.invalidateQueries({ queryKey: ['incidents'] });
      await queryClient.invalidateQueries({ queryKey: ['department-staff'] });
      await queryClient.invalidateQueries({ queryKey: ['departments'] });
      onSuccess?.();
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      closeOnBackdrop={!mutation.isPending}
      title={`Điều phối & Phân công ${incident.report.code}`}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={mutation.isPending || !selectedDeptId || !selectedStaffId}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Đang giao việc...' : 'Xác nhận giao việc'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Incident Summary Card */}
        <div className="dispatch-summary">
          <div className="dispatch-summary-row">
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              {incident.report.title}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Badge kind="urgency" value={incident.urgency} />
              <Badge kind="status" value={incident.status} />
            </div>
          </div>
          <div className="text-small text-muted">
            {incident.report.building.name} · {incident.report.location.floor?.name ?? 'Khu vực chung'} · {incident.report.location.name}
          </div>
        </div>

        {/* Section 1: Department Selection */}
        <div className="dispatch-section">
          <label htmlFor="dept-select" className="dispatch-section-title">
            <span>Phòng ban phụ trách</span>
          </label>
          <select
            id="dept-select"
            className="select"
            style={{ width: '100%' }}
            value={selectedDeptId ?? ''}
            disabled={deptsQuery.isPending}
            onChange={(e) => {
              setSelectedDeptId(Number(e.target.value));
              setSelectedStaffId(null);
            }}
          >
            {deptsQuery.data?.map((dept: DepartmentOption) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section 2: Staff Selection with Workload */}
        <div className="dispatch-section">
          <div className="dispatch-section-title">
            <span>Chọn Kỹ thuật viên</span>
            <span className="text-small text-muted">
              {staffQuery.data ? `${staffQuery.data.length} nhân sự` : 'Đang tải...'}
            </span>
          </div>

          {staffQuery.isPending && (
            <div className="text-center text-muted" style={{ padding: 16 }}>
              Đang tải danh sách kỹ thuật viên...
            </div>
          )}

          {staffQuery.isSuccess && staffQuery.data.length === 0 && (
            <div
              style={{
                padding: '16px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              Phòng ban này chưa có tài khoản Kỹ thuật viên nào đang hoạt động.
            </div>
          )}

          {staffQuery.isSuccess && staffQuery.data.length > 0 && (
            <div className="staff-grid">
              {staffQuery.data.map((staff: StaffMemberOption) => {
                const isSelected = selectedStaffId === staff.id;
                const inProg = staff.inProgressCount ?? 0;
                const assigned = staff.assignedCount ?? 0;
                const total = staff.activeTasksCount ?? inProg + assigned;

                let statusLabel = '0 việc · Rảnh';
                let badgeClass = 'workload-tag is-available';

                if (inProg > 0 && assigned > 0) {
                  statusLabel = `${inProg} đang làm · ${assigned} chờ nhận`;
                  badgeClass = total >= 3 ? 'workload-tag is-overloaded' : 'workload-tag is-busy';
                } else if (inProg > 0) {
                  statusLabel = `${inProg} việc đang làm`;
                  badgeClass = total >= 3 ? 'workload-tag is-overloaded' : 'workload-tag is-busy';
                } else if (assigned > 0) {
                  statusLabel = `${assigned} việc chờ nhận`;
                  badgeClass = total >= 3 ? 'workload-tag is-overloaded' : 'workload-tag is-busy';
                }

                return (
                  <button
                    key={staff.id}
                    type="button"
                    className={`staff-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedStaffId(staff.id)}
                  >
                    <div className="staff-info">
                      <div className="staff-avatar">
                        {staff.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="staff-name">{staff.fullName}</div>
                        <div className="staff-email">{staff.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={badgeClass}>
                        <span className="workload-tag-dot" aria-hidden="true" />
                        <span>{statusLabel}</span>
                      </span>
                      <span className="staff-radio" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: SLA Deadline Presets */}
        <div className="dispatch-section">
          <label className="dispatch-section-title">
            <span>Thời hạn hoàn thành</span>
          </label>
          <div className="deadline-segmented">
            <button
              type="button"
              className={`deadline-segment-btn ${deadlinePreset === '2h' ? 'is-active' : ''}`}
              onClick={() => setDeadlinePreset('2h')}
            >
              2 giờ
            </button>
            <button
              type="button"
              className={`deadline-segment-btn ${deadlinePreset === '24h' ? 'is-active' : ''}`}
              onClick={() => setDeadlinePreset('24h')}
            >
              24 giờ
            </button>
            <button
              type="button"
              className={`deadline-segment-btn ${deadlinePreset === '3d' ? 'is-active' : ''}`}
              onClick={() => setDeadlinePreset('3d')}
            >
              3 ngày
            </button>
            <button
              type="button"
              className={`deadline-segment-btn ${deadlinePreset === 'custom' ? 'is-active' : ''}`}
              onClick={() => setDeadlinePreset('custom')}
            >
              Tùy chọn khác
            </button>
          </div>

          {deadlinePreset === 'custom' && (
            <input
              type="datetime-local"
              className="input"
              style={{ marginTop: 6 }}
              value={customDeadline}
              onChange={(e) => setCustomDeadline(e.target.value)}
            />
          )}
        </div>

        {/* Section 4: Assignment Note */}
        <div className="dispatch-section">
          <label htmlFor="assign-note" className="dispatch-section-title">
            Ghi chú điều phối
          </label>
          <textarea
            id="assign-note"
            className="input"
            rows={2}
            placeholder="Ví dụ: Cần mang theo bóng đèn led dài 1m2 thay thế..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Error message display */}
        {mutation.isError && (
          <div
            style={{
              padding: 10,
              background: '#FEE2E2',
              color: '#B91C1C',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {readErrorMessage(mutation.error, 'Giao việc thất bại. Vui lòng thử lại.')}
          </div>
        )}
      </div>
    </Modal>
  );
}
