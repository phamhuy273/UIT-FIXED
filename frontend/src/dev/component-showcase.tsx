import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

export function ComponentShowcase() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return <>
    <div className="page-heading"><span className="eyebrow blue">UIT-FIXED DESIGN SYSTEM</span><h1>Thư viện giao diện</h1><p>Các thành phần dùng chung theo Figma Specification.</p></div>
    <section className="panel showcase-section"><h2>Nút bấm</h2><p>5 biến thể · 3 kích thước · trạng thái tải và vô hiệu hóa.</p>
      <div className="component-row">{(['primary', 'secondary', 'danger', 'ghost', 'outline'] as const).map((variant) => <Button key={variant} variant={variant} onClick={() => setOpen(true)}>{variant}</Button>)}</div>
      <div className="component-row"><Button size="sm" onClick={() => setOpen(true)}>Nhỏ</Button><Button size="md" onClick={() => setOpen(true)}>Vừa</Button><Button size="lg" onClick={() => setOpen(true)}>Lớn</Button><Button loading>Đang xử lý</Button><Button disabled>Vô hiệu hóa</Button></div>
    </section>
    <section className="panel showcase-section"><h2>Trường nhập liệu</h2><form className="showcase-form" noValidate onSubmit={(event) => { event.preventDefault(); setSubmitted(true); if (name.trim()) setOpen(true); }}>
      <Input label="Tên hiển thị" value={name} onChange={(event) => setName(event.target.value)} required placeholder="Nguyễn Văn A" helperText="Nhập tên để xem trạng thái xác nhận." error={submitted && !name.trim() ? 'Vui lòng nhập tên hiển thị.' : undefined} />
      <Input label="Trường bị vô hiệu hóa" disabled value="Không thể chỉnh sửa" />
      <Button type="submit">Kiểm tra trường nhập</Button>
    </form></section>
    <section className="panel showcase-section"><h2>Trạng thái & mức độ</h2><div className="component-row">{(['PENDING', 'APPROVED', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CANCELLED'] as const).map((value) => <Badge key={value} kind="status" value={value} />)}</div><div className="component-row">{(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((value) => <Badge key={value} kind="urgency" value={value} />)}</div></section>
    <section className="panel showcase-section"><h2>Hộp thoại</h2><p>Hỗ trợ bàn phím, phím Escape, giữ focus và trả focus về nút mở.</p><Button variant="outline" onClick={() => setOpen(true)}>Mở hộp thoại</Button></section>
    <Modal open={open} onClose={() => setOpen(false)} title="Hộp thoại mẫu" description="Thành phần dùng chung cho các màn hình UIT-FIXED." footer={<Button onClick={() => setOpen(false)}>Đóng</Button>}><p>{name.trim() ? `Xin chào ${name.trim()}.` : 'Bạn có thể đóng bằng nút, phím Escape hoặc nhấn ra ngoài hộp thoại.'}</p></Modal>
  </>;
}
