import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/ui/brand-logo';
import campus from '../assets/campus.jpg';
import camera from '../assets/camera.svg';
import check from '../assets/check.svg';
import timer from '../assets/timer.svg';
import '../gate.css';

const steps = [
  { icon: camera, label: 'Chụp ảnh & chọn phòng' },
  { icon: timer, label: 'Theo dõi tiến độ' },
  { icon: check, label: 'Xác nhận khi sửa xong' },
];

export function GateShell({ children }: { children: ReactNode }) {
  return (
    <main className="gate">
      <section className="gate-hero" aria-label="UIT-FIXED">
        <img className="gate-hero-photo" src={campus} alt="" />
        <div className="gate-hero-overlay" />
        <div className="gate-brand">
          <BrandLogo size={56} />
          <span>UIT-FIXED</span>
        </div>
        <div className="gate-promise">
          <p className="gate-display">
            Báo cáo nhanh.{' '}
            <br />
            Xử lý minh bạch.{' '}
            <br />
            An tâm học tập.
          </p>
          <ul className="gate-steps">
            {steps.map((step) => (
              <li key={step.label}>
                <img src={step.icon} alt="" />
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="gate-office">Văn phòng Quản trị Thiết bị · (028) 372 52002</p>
      </section>
      <section className="gate-panel">{children}</section>
    </main>
  );
}
