---
name: uit-fixed-workflow
description: >-
  Áp dụng nghiệp vụ UIT-FIXED cho Incident cơ sở vật chất của sinh viên UIT,
  vai trò STUDENT, ADMIN, TECH_STAFF, workflow PENDING đến RESOLVED hoặc REJECTED,
  và phân công Department theo Building. Dùng khi triển khai, sửa, review hoặc
  trả lời về báo cáo sự cố, duyệt, từ chối, phân công phòng ban, phân quyền
  và theo dõi Incident trong dự án UIT-FIXED.
---

# UIT-FIXED Workflow

Skill này là nguồn nghiệp vụ đã thống nhất. README hoặc code hiện tại nếu mô tả ticket, SLA, đa trường, hoặc trạng thái khác thì không được lấy đó làm yêu cầu đã chốt.

## Trước khi làm một tác vụ

1. Xác định yêu cầu có nằm trong mục **Đã thống nhất** hay không.
2. Xác định actor: `STUDENT`, `ADMIN`, hay `TECH_STAFF`.
3. Với đổi trạng thái: ghi trạng thái hiện tại, trạng thái đích, và ai được phép chuyển.
4. Với đọc dữ liệu: xác định phạm vi — của chính mình, của Department được giao, hay toàn bộ.
5. Với phân công: tách Department mặc định của Building và Department thực tế của Incident.
6. Thiết kế phân quyền ở backend (guard hoặc policy trên API). Ẩn giao diện không thay cho kiểm tra server.
7. Nếu trạng thái hoặc phòng ban được giao đổi, lưu lịch sử tương ứng.
8. Việc chưa có trong mục **Đã thống nhất** thì ghi vào **Cần xác minh** và dừng. Không tự thêm nghiệp vụ.

## Phạm vi sản phẩm

UIT-FIXED là hệ thống báo cáo và quản lý sự cố cơ sở vật chất dành cho sinh viên UIT.

Không mở rộng thành nền tảng dùng cho nhiều trường.

## Vai trò

| Vai trò | Việc được phép |
| :--- | :--- |
| `STUDENT` | Tạo Incident, tải ảnh minh chứng, xem và theo dõi Incident của chính mình. |
| `ADMIN` | Xem mọi Incident. Duyệt, từ chối, phân công Department. Ghi đè Department mà hệ thống đề xuất. Quản lý người dùng: tạo, xóa, xem, sửa account. |
| `TECH_STAFF` | Thuộc đúng một Department. Xem Incident được giao cho Department của mình. Tiếp nhận, cập nhật tiến độ, hoàn tất xử lý. |

Mỗi `TECH_STAFF` thuộc đúng một Department. Một Department có thể có nhiều `TECH_STAFF`.

## Workflow

Chỉ dùng các trạng thái: `PENDING`, `APPROVED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.

```text
PENDING → APPROVED → ASSIGNED → IN_PROGRESS → RESOLVED
PENDING → REJECTED
```

- Chỉ `ADMIN` được duyệt (`PENDING` → `APPROVED`), từ chối (`PENDING` → `REJECTED`), và phân công (`APPROVED` → `ASSIGNED`).
- Chỉ `TECH_STAFF` thuộc Department đang được phân công mới được tiếp nhận và xử lý.
- Khi `TECH_STAFF` tiếp nhận, trạng thái chuyển sang `IN_PROGRESS`.
- Hoàn tất xử lý đưa Incident sang `RESOLVED`.
- Không thêm trạng thái, không bỏ qua bước, không mở lại Incident, trừ khi người dùng xác nhận.

## Phân công

- Mỗi Building có `defaultDepartmentId` để đề xuất phòng ban xử lý.
- Một Department có thể quản lý nhiều Building.
- `ADMIN` được ghi đè Department được đề xuất.
- Department mặc định của Building và Department thực tế được giao cho Incident là hai giá trị khác nhau. Không lấy cái này ghi đè cái kia.
- Nếu Building chưa có Department mặc định, `ADMIN` tự phân công.
- Không suy diễn danh sách Building hoặc Department thực tế của UIT. Không seed tên cơ sở, tòa nhà, hoặc phòng ban nếu người dùng chưa cung cấp.

## Theo dõi

- `STUDENT` chỉ xem Incident do mình tạo.
- `TECH_STAFF` chỉ xem Incident thuộc Department được giao.
- `ADMIN` xem tất cả.
- Lưu lịch sử thay đổi trạng thái.
- Lưu lịch sử phân công.

Quyền xem và quyền đổi trạng thái đều kiểm tra ở backend.

## Đã thống nhất

- Sản phẩm chỉ phục vụ sự cố cơ sở vật chất cho sinh viên UIT, một trường.
- Ba vai trò: `STUDENT`, `ADMIN`, `TECH_STAFF`.
- Workflow và quyền chuyển trạng thái ở mục **Workflow**.
- Đề xuất phòng ban bằng `Building.defaultDepartmentId`; Department giao cho Incident là giá trị riêng; Admin được ghi đè và tự phân công khi Building chưa có mặc định.
- Phạm vi xem dữ liệu và hai loại lịch sử ở mục **Theo dõi**.
- `STUDENT` được tải ảnh minh chứng khi tạo Incident.
- `ADMIN` CRUD account.

## Không được giả định

- Tên Building, Department, hoặc sơ đồ cơ sở thật của UIT.
- Thêm trường, vai trò, trạng thái, SLA, email, đánh giá, hay quy trình đóng/mở lại.
- Coi workflow trong README cũ là quy tắc hiện hành.
- Chỉ ẩn nút trên frontend là đã phân quyền.

## Cần xác minh

Nếu tác vụ phụ thuộc một ý dưới đây, hỏi người dùng trước khi làm:

- Ai tạo và sửa Building, Department, cùng quan hệ Department–Building.
- Bắt buộc ảnh minh chứng, số lượng, và loại file.
- Lý do từ chối, sửa hoặc xóa Incident, và ai được cập nhật tiến độ chi tiết.
- Đổi Department sau khi đã `ASSIGNED` hoặc `IN_PROGRESS`.
- Nhiều `TECH_STAFF` cùng nhận một Incident, và người nào được hoàn tất.
- Trường dữ liệu của lịch sử trạng thái và lịch sử phân công.
