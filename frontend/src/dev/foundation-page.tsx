import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LocationSelector } from '@/features/master-data/components/location-selector';
import { useCategories, useLocations } from '@/features/master-data/hooks/use-master-data';
import type { LocationSelection } from '@/features/master-data/types/master-data.types';
import { getLocationOptions, isValidLocationSelection } from '@/features/master-data/utils/location-selection';

export function FoundationPage() {
  const [selection, setSelection] = useState<LocationSelection>({ buildingId: null, floorId: null, locationId: null });
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [showLocation, setShowLocation] = useState(false);
  const [error, setError] = useState('');
  const buildings = useLocations();
  const categories = useCategories();
  const { building, floor, locations } = getLocationOptions(buildings.data ?? [], selection);
  const location = locations.find(({ id }) => id === selection.locationId);
  const category = categories.data?.find(({ id }) => id === categoryId);
  const floorCount = buildings.data?.reduce((sum, item) => sum + item.floors.length, 0);
  const locationCount = buildings.data?.reduce((sum, item) => sum + item.locations.length + item.floors.reduce((total, level) => total + level.locations.length, 0), 0);

  return <>
    <section className="welcome-banner">
      <div className="welcome-copy"><span className="eyebrow blue">KẾT NỐI KHÔNG GIAN HỌC TẬP</span>
        <h1>Khám phá không gian UIT<span className="heading-dot">.</span></h1>
        <p>Mỗi báo cáo bắt đầu từ một vị trí chính xác.<br />Tìm tòa nhà, phòng học và khu vực bạn cần hỗ trợ.</p>
        <span className="welcome-tag"><span className="campus-dot" />Một khuôn viên, cùng chăm sóc</span>
      </div>
      <div className="campus-art" aria-hidden="true"><span className="art-orbit" /><div className="art-building art-building--back"><i /><i /><i /><i /><i /><i /></div><div className="art-building art-building--front"><b>UIT</b><i /><i /><i /><i /><i /><i /><span /></div><span className="art-tree art-tree--one" /><span className="art-tree art-tree--two" /><div className="art-ground" /><span className="art-pin">⌖</span></div>
    </section>

    <div className="stats-grid" aria-label="Tổng quan dữ liệu đang hoạt động">
      {[
        { label: 'Tòa nhà', value: buildings.data?.length, mark: '▦' },
        { label: 'Tầng đang hoạt động', value: floorCount, mark: '≡' },
        { label: 'Phòng & khu vực', value: locationCount, mark: '⌖' },
        { label: 'Danh mục hỗ trợ', value: categories.data?.length, mark: '◇' },
      ].map((stat) => <div className="stat-card" key={stat.label}><span className="stat-icon" aria-hidden="true">{stat.mark}</span><div><strong>{stat.value ?? '—'}</strong><span>{stat.label}</span></div></div>)}
    </div>

    <div className="foundation-grid">
      <section className="panel location-panel" aria-labelledby="location-heading">
        <div className="section-heading"><span className="step-number">01</span><div><h2 id="location-heading">Bạn cần hỗ trợ ở đâu?</h2><p>Chọn tòa nhà, sau đó chọn tầng và phòng.</p></div></div>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!isValidLocationSelection(buildings.data ?? [], selection)) { setError('Vui lòng chọn một phòng hoặc khu vực hợp lệ.'); return; }
          setShowLocation(true);
        }}>
          <LocationSelector value={selection} required error={error}
            onChange={(value) => { setSelection(value); setError(''); }} />
          <div className="selection-summary"><span className="selection-pin" aria-hidden="true">⌖</span>
            <div><small>VỊ TRÍ ĐANG CHỌN</small><p>{[building?.name, floor?.name, location?.name].filter(Boolean).join(' / ') || 'Chưa chọn địa điểm'}</p></div>
          </div>
          <div className="panel-actions"><p>Bạn có thể chọn khu vực chung của tòa.</p><Button type="submit" disabled={buildings.isPending || buildings.isError || !buildings.data?.length} iconRight={<span aria-hidden="true">↗</span>}>Xem vị trí</Button></div>
        </form>
      </section>

      <aside className="panel category-panel" aria-labelledby="categories-heading">
        <div className="section-heading"><span className="step-number">02</span><div><h2 id="categories-heading">Danh mục hỗ trợ</h2><p>Chọn nhóm thiết bị hoặc vấn đề.</p></div></div>
        {categories.isPending && <p role="status" className="field-helper">Đang tải danh mục…</p>}
        {categories.isError && <div className="error-notice" role="alert">Không tải được danh mục.<Button variant="outline" size="sm" onClick={() => { void categories.refetch(); }}>Thử tải lại</Button></div>}
        {categories.data?.length === 0 && <p className="empty-notice">Chưa có danh mục đang hoạt động.</p>}
        <div className="category-list">{categories.data?.map((item) => <button type="button" key={item.id} aria-pressed={categoryId === item.id}
          className={`category-choice ${categoryId === item.id ? 'is-selected' : ''}`} onClick={() => setCategoryId((current) => current === item.id ? null : item.id)}>
          <span className="category-symbol" aria-hidden="true">◇</span><span><strong>{item.name}</strong><small>{item.description}</small></span><span className="choice-indicator" aria-hidden="true">{categoryId === item.id ? '✓' : '+'}</span>
        </button>)}</div>
      </aside>
    </div>

    <section className="building-section" aria-labelledby="buildings-heading"><div className="section-title-row"><div><span className="eyebrow">KHÔNG GIAN TRONG TRƯỜNG</span><h2 id="buildings-heading">Các tòa nhà</h2></div><span className="muted-caption">Chọn một tòa để xem địa điểm</span></div>
      <div className="building-grid">{buildings.data?.map((item, index) => <button type="button" key={item.id} className="building-card" onClick={() => { setSelection({ buildingId: item.id, floorId: null, locationId: null }); setError(''); document.getElementById('location-heading')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
        <span className={`building-tile building-tile--${index % 4}`}><span aria-hidden="true">▥</span><b>{item.name.replace(/^Tòa\s+/i, '')}</b></span>
        <div><strong>{item.name}</strong><small>{item.floors.length} tầng · {item.locations.length + item.floors.reduce((total, level) => total + level.locations.length, 0)} địa điểm</small></div><span className="building-arrow" aria-hidden="true">↗</span>
      </button>)}</div>
    </section>

    <Modal open={showLocation} onClose={() => setShowLocation(false)} title="Thông tin vị trí"
      description="Kiểm tra địa điểm và danh mục bạn đã chọn."
      footer={<Button onClick={() => setShowLocation(false)}>Đã hiểu</Button>}>
      <dl className="location-details"><dt>Tòa nhà</dt><dd>{building?.name ?? '—'}</dd><dt>Tầng</dt><dd>{floor?.name ?? 'Khu vực chung'}</dd><dt>Phòng / Khu vực</dt><dd>{location?.name ?? '—'}</dd><dt>Danh mục</dt><dd>{category?.name ?? 'Chưa chọn'}</dd></dl>
      {location?.description && <p className="data-note">{location.description}</p>}
    </Modal>
  </>;
}
