# SCRUM Enterprise Fullstack Architecture
Hệ thống mẫu hoàn chỉnh xây dựng theo chuẩn doanh nghiệp (Enterprise Architecture).

## 🛠 Công nghệ Sử dụng (Tech Stack)
- **Backend:** NestJS, TypeScript, Prisma ORM, Multer, Streamifier, Cloudinary SDK.
- **Frontend:** ReactJS 19, Vite, TypeScript, Axios, Zustand, TanStack Query.
- **Database:** PostgreSQL 16.
- **Media CDN:** Cloudinary (Stream Buffer Upload).
- **Containerization:** Docker & Docker Compose.

---

## 📁 Cấu trúc Thư mục Tổng thể (Monorepo)

```text
SCRUM/
├── docker-compose.yml          # Điều phối 3 container: postgres, backend, frontend
├── .env.example                # File mẫu biến môi trường toàn cục
├── .env                        # Biến môi trường local (chứa key Cloudinary, DB, JWT)
├── .gitignore
│
├── backend/                    # Source code NestJS
│   ├── Dockerfile
│   ├── prisma/
│   │   └── schema.prisma       # Định nghĩa Schema PostgreSQL (User, Media)
│   └── src/
│       ├── main.ts             # Entrypoint: CORS, Pipes, Filters, Interceptors
│       ├── app.module.ts       # Root module kết nối Config, Database, Media
│       ├── common/             # Filters, Interceptors, Decorators, Guards, Pipes
│       ├── config/             # Load biến môi trường Cloudinary, App, DB
│       ├── core/database/      # PrismaService & DatabaseModule (Global)
│       ├── shared/cloudinary/  # Provider & Service Stream Buffer lên Cloudinary
│       └── modules/media/      # Controller & Service quản lý Media và lưu DB
│
└── frontend/                   # Source code ReactJS (Vite + Feature-Based)
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.tsx             # Demo Dashboard + Cloudinary Image Uploader
        ├── features/media/     # Feature Slice: API, ImageUploader Component
        ├── lib/axios.ts        # Axios client interceptor
        ├── lib/query-client.ts # TanStack Query Client
        ├── stores/auth.store.ts# State management với Zustand
        ├── types/              # Type definitions
        └── utils/              # Helper xử lý tối ưu Cloudinary URL (f_auto, q_auto)
```

---

## 🚀 Hướng dẫn Khởi chạy (Quick Start)

### 1. Cấu hình biến môi trường
Mở file `.env` tại thư mục gốc và điền thông tin tài khoản Cloudinary của bạn:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Chạy toàn bộ với Docker (Khuyên dùng)
Chỉ cần 1 lệnh duy nhất để khởi động toàn bộ PostgreSQL, Backend NestJS và Frontend React:
```bash
docker-compose up --build
```
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api/v1
- **PostgreSQL:** localhost:5432

### 3. Chạy thủ công trên máy cục bộ (Local Development)

#### Backend:
```bash
cd backend
npm install
# Khởi tạo Prisma Client
npx prisma generate
npm run start:dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Luồng Xử lý Upload Ảnh (Buffer Streaming)
1. **Frontend (React)**: Người dùng chọn file -> Validate dung lượng (< 5MB) & định dạng ảnh (jpg, png, webp) -> Gửi `multipart/form-data` tới `POST /api/v1/media/upload`.
2. **Backend (NestJS)**: Nhận file qua Multer Memory Storage -> Stream trực tiếp file buffer lên Cloudinary thông qua thư viện `streamifier` (hoàn toàn không tốn I/O ghi đĩa tạm).
3. **Cloudinary**: Trả về `public_id`, `secure_url`.
4. **PostgreSQL (Prisma)**: NestJS lưu metadata vào bảng `media` và phản hồi kết quả về cho React hiển thị kèm các transformation tối ưu CDN (`f_auto`, `q_auto`, `w_300`).
