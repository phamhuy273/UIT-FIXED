---
name: database-prisma
description: >-
  Thiết kế, triển khai và bảo trì database UIT-FIXED bằng Prisma ORM 6 trên
  PostgreSQL 16, trong NestJS và TypeScript. Dùng khi đọc hoặc sửa schema.prisma,
  quan hệ, index, transaction, migration, User, Role, Department, Building,
  Floor, Location, Incident, IncidentCategory, IncidentAssignment,
  IncidentHistory hoặc Media.
---

# Database Prisma

Nghiệp vụ nằm ở [uit-fixed-workflow](../uit-fixed-workflow/SKILL.md). Skill này chỉ quy định cách đưa nghiệp vụ đó vào database.

Giữ Prisma ORM 6 và PostgreSQL 16. Không đổi phiên bản Prisma, không đổi provider, không cài ORM khác.

## Khi người dùng chỉ yêu cầu phân tích

Chỉ đưa thiết kế và phần giải thích. Không sửa `schema.prisma`, source NestJS, hay file migration. Không chạy `prisma migrate`, `prisma db push`, `prisma generate`, hoặc lệnh reset database.

## Trước khi thiết kế hoặc sửa schema

1. Đọc `backend/prisma/schema.prisma` và các migration hiện có.
2. Liệt kê model, enum, field, quan hệ và `onDelete` đang tồn tại.
3. Đối chiếu với nghiệp vụ đã chốt. Schema trong file có thể chưa khớp nghiệp vụ.
4. Đánh dấu từng thay đổi là **đề xuất** hoặc **đã được người dùng phê duyệt**.
5. Chỉ sửa schema sau khi người dùng phê duyệt thiết kế đó.

Không tạo model thứ hai cho `User` hoặc `Media`. Mở rộng model và quan hệ đã có.

## Giải thích mỗi thay đổi

Với mỗi thay đổi database, nêu đủ năm mục:

1. **Vì sao:** nghiệp vụ nào bắt buộc thay đổi này.
2. **Quan hệ và cardinality:** một–một, một–nhiều, hay nhiều–nhiều; field khóa ngoại nằm ở đâu.
3. **Ràng buộc:** bắt buộc, duy nhất, enum, khóa ngoại, `onDelete`, `onUpdate`.
4. **Dữ liệu hiện có:** bảng và dòng bị ảnh hưởng; cột mới có cần backfill không.
5. **Migration và kiểm tra:** migration thêm hay đổi gì; lệnh và dữ liệu dùng để kiểm tra sau khi người dùng cho phép chạy.

## Ràng buộc đã chốt

Các quan hệ sau là yêu cầu nghiệp vụ, chưa phải schema đã phê duyệt:

- `User` có một `Role`. Role nghiệp vụ là `STUDENT`, `ADMIN`, `TECH_STAFF`.
- Mỗi `TECH_STAFF` thuộc đúng một `Department`. `STUDENT` và `ADMIN` không thuộc Department.
- Một `Department` có nhiều `TECH_STAFF`.
- `Building.defaultDepartmentId` là Department được đề xuất. Nhiều Building có thể trỏ tới một Department. Trường này được để trống.
- Department thực tế của `Incident` là giá trị riêng. Không ghi đè `Building.defaultDepartmentId` khi phân công.
- Một `Incident` do một `STUDENT` tạo.
- Trạng thái `Incident` chỉ gồm `PENDING`, `APPROVED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`.
- `IncidentHistory` lưu mỗi lần đổi trạng thái. Cập nhật Incident không được xóa các dòng lịch sử này.
- `IncidentAssignment` lưu mỗi lần phân công. Đổi phòng ban không được xóa lịch sử phân công cũ; thêm bản ghi mới.
- Ảnh minh chứng dùng model `Media` đã có, gắn với `Incident`. Không tạo model media khác.

Chưa được tự điền tên Building hoặc Department thật của UIT. Không seed danh sách cơ sở khi người dùng chưa cung cấp và chưa xác nhận.

Những ý nghiệp vụ chưa chốt trong workflow, như xóa Incident, đổi Department sau `IN_PROGRESS`, hoặc nhiều người cùng nhận một Incident, không được biến thành ràng buộc schema. Hỏi trước.

## Domain cần hỗ trợ

Khi được yêu cầu thiết kế, phủ các domain sau. Chưa thêm model ngoài danh sách này nếu người dùng chưa xác nhận.

| Domain | Việc cần thể hiện |
| :--- | :--- |
| `User`, `Role` | Account và đúng một vai trò. `TECH_STAFF` có khóa ngoại tới `Department`. |
| `Department` | Phòng ban xử lý. Không chứa dữ liệu cơ sở thật cho đến khi được xác nhận. |
| `Building`, `Floor`, `Location` | Building chứa nhiều Floor; Floor chứa nhiều Location. Building giữ `defaultDepartmentId`. |
| `Incident`, `IncidentCategory` | Sự cố gắn một Location, một category, người tạo, trạng thái, và Department được giao. |
| `IncidentAssignment` | Lịch sử phân công, chỉ thêm bản ghi. |
| `IncidentHistory` | Lịch sử trạng thái, chỉ thêm bản ghi. |
| `Media` | Model hiện có; thêm quan hệ minh chứng tới Incident. |

`Incident` tham chiếu Location để biết vị trí. Không tách thêm cấp cơ sở ngoài Building, Floor và Location.

## Index

Đánh giá index cho trường dùng để tìm, lọc hoặc phân trang. Với UIT-FIXED, xem xét ít nhất:

- `Incident`: người tạo, trạng thái, Department được giao, Location, thời điểm tạo.
- `IncidentHistory` và `IncidentAssignment`: Incident và thời điểm ghi lịch sử.
- `User`: Department của `TECH_STAFF`, kèm `email` đang là duy nhất.
- `Floor` theo Building; `Location` theo Floor; Building theo `defaultDepartmentId`.

Chỉ đề xuất index cho truy vấn có thật. Không đánh index mọi khóa ngoại.

## Transaction

Dùng một transaction khi một nghiệp vụ ghi nhiều bản ghi:

- Đổi trạng thái Incident và thêm `IncidentHistory`.
- Gán Department, cập nhật Incident và thêm `IncidentAssignment`.
- Tạo Incident cùng các `Media` minh chứng.

Không để lịch sử được ghi khi bản ghi chính đã rollback, hoặc ngược lại.

## Migration an toàn

- Thêm migration có thể xem lại. Không chạy `migrate reset`, `db push --force-reset`, hoặc `DROP` database trừ khi người dùng yêu cầu rõ thao tác đó.
- Đổi enum `Role` phải có bước dữ liệu cho dòng `User` hiện có. Không mặc định mọi `USER` cũ thành `STUDENT` nếu chưa được xác nhận.
- Cột mới trên bảng đã có dữ liệu phải có giá trị mặc định, cho phép trống trong bước chuyển tiếp, hoặc có backfill.
- Khóa ngoại tới dữ liệu cũ phải xử lý dòng không khớp trước khi đặt `NOT NULL`.
- `onDelete` của Incident với hai bảng lịch sử phải được nêu rõ. Cascade có thể xóa lịch sử khi xóa Incident; đó không phải cách cập nhật trạng thái hay phân công.

## Đề xuất và schema đã duyệt

- Thiết kế chưa được người dùng chấp nhận là đề xuất. Không ghi đề xuất vào `schema.prisma`.
- Schema đã phê duyệt mới được triển khai, và chỉ đúng phần đã duyệt.
- Sau khi sửa schema được duyệt, nói rõ migration nào sẽ tạo và cách kiểm tra. Vẫn chờ người dùng cho phép trước khi chạy migration.
