import { useState } from 'react';
import { ImageUploader } from './features/media';
import { getOptimizedImageUrl } from './utils/cloudinary-url.util';

interface UploadedItem {
  id: string;
  url: string;
  publicId: string;
}

export function App() {
  const [uploadedImages, setUploadedImages] = useState<UploadedItem[]>([]);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '0 20px' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>UIT-FIXED</h1>
        <p style={{ color: '#64748b', margin: '0 0 4px 0' }}>
          Hệ Thống Quản Lý Vòng Đời Sự Cố (Ticketing System) Nội Bộ Dành Riêng Cho Trường Học
        </p>
        <p style={{ color: '#0284c7', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
          Nhóm thực hiện: AURA FAMI | Khóa học: AI-Driven Software Development with Scrum
        </p>
      </header>

      <section style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '16px', color: '#1e293b' }}>
          Upload Hình ảnh (Stream qua NestJS tới Cloudinary)
        </h2>
        <ImageUploader
          onSuccess={(res) => {
            setUploadedImages((prev) => [
              { id: (res as any).id || Date.now().toString(), url: res.url, publicId: res.publicId },
              ...prev,
            ]);
          }}
        />
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '16px' }}>
          Danh sách ảnh đã tải lên ({uploadedImages.length})
        </h2>
        {uploadedImages.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có hình ảnh nào được tải lên.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {uploadedImages.map((img) => (
              <div
                key={img.id || img.publicId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <img
                  src={getOptimizedImageUrl(img.url, { width: 300, height: 200, crop: 'fill' })}
                  alt={img.publicId}
                  style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                />
                <div style={{ padding: '12px' }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', wordBreak: 'break-all', margin: '0 0 6px 0' }}>
                    {img.publicId}
                  </p>
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none' }}
                  >
                    Xem ảnh gốc ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
