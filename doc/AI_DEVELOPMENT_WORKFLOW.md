# Quy trình phát triển UIT-FIXED có AI hỗ trợ

## 1. Mục đích và phạm vi

Tài liệu này quy định cách nhóm AURA FAMI dùng AI như một trợ lý trong quy
trình Scrum: làm rõ yêu cầu, khảo sát code, đề xuất và triển khai thay đổi,
kiểm thử, rồi chuẩn bị Pull Request.

AI hỗ trợ công việc phát triển; đây **không** phải đặc tả một tính năng AI
chạy bên trong sản phẩm UIT-FIXED. Con người vẫn chịu trách nhiệm về yêu cầu,
quyết định nghiệp vụ, bảo mật, review và phê duyệt thay đổi.

## 2. Nguyên tắc bắt buộc

1. **Yêu cầu và code hiện có là căn cứ.** Đọc code và tài liệu liên quan trước
   khi đề xuất sửa. Không tạo module, API, trạng thái hoặc quy trình chỉ vì AI
   cho rằng đó là thông lệ.
2. **Không tự quyết nghiệp vụ chưa chốt.** Dùng
   [`uit-fixed-workflow`](../.agents/skills/uit-fixed-workflow/SKILL.md) làm
   nguồn nghiệp vụ hiện hành. Nếu yêu cầu phụ thuộc nội dung chưa xác minh hoặc
   mâu thuẫn với code/tài liệu, ghi rõ điểm cần xác nhận và hỏi Product Owner
   trước khi triển khai.
3. **Bảo vệ workflow và phân quyền.** Quyền phải được kiểm tra ở backend;
   không coi việc ẩn nút trên frontend là kiểm soát truy cập. Không tự thêm
   vai trò, trạng thái hoặc chuyển trạng thái.
4. **Không đưa dữ liệu nhạy cảm vào prompt.** Không gửi secret, token, nội dung
   `.env`, thông tin cá nhân hay dữ liệu sự cố thật đến dịch vụ AI. Dùng dữ liệu
   giả đã ẩn danh khi cần ví dụ.
5. **Thay đổi nhỏ, có thể review.** Không để AI sửa lan sang phần không thuộc
   task, nâng cấp dependency, chạy migration phá hủy dữ liệu, commit hoặc tạo PR
   nếu chưa được giao/phê duyệt.
6. **Không tin kết quả AI nếu chưa kiểm chứng.** Người phát triển phải xem diff,
   đọc lỗi thật và chạy kiểm tra phù hợp. Không báo test/build thành công nếu
   chưa thực sự chạy.

## 3. Luồng công việc

### Bước 1 — Chuẩn bị task trong Sprint

Người phụ trách ghi task bằng ngôn ngữ có thể kiểm chứng:

- Mục tiêu và actor liên quan (`STUDENT`, `ADMIN`, `TECH_STAFF`).
- Hành vi hiện tại và hành vi mong muốn.
- Acceptance criteria, trường hợp lỗi và giới hạn phạm vi.
- Phần nào được phép sửa; phụ thuộc backend, frontend, database hoặc UI.

Nếu thiếu quyết định nghiệp vụ, đưa câu hỏi cho Product Owner; không giao AI
tự điền chỗ trống.

### Bước 2 — Nhờ AI khảo sát trước khi sửa

AI đọc các file liên quan, tìm cách triển khai hiện tại, API contract, schema,
test và hướng dẫn dự án. AI tóm tắt:

- Nguyên nhân hoặc điểm cần thay đổi, kèm file/symbol liên quan.
- Các lớp bị ảnh hưởng và hành vi cần giữ nguyên.
- Rủi ro, giả định và câu hỏi cần người phụ trách quyết định.
- Những test/command phù hợp để xác minh.

Với task nhiều file, AI đưa kế hoạch ngắn để người phụ trách duyệt trước khi
chỉnh sửa. Với task nhỏ, có thể đi thẳng vào thay đổi nếu phạm vi rõ.

### Bước 3 — Xác nhận thiết kế và phạm vi

Trước khi code, người phụ trách xác nhận các quyết định ảnh hưởng đến:

- Quyền actor, phạm vi dữ liệu và chuyển trạng thái.
- API/request-response contract hoặc hành vi lỗi.
- Schema, migration, dữ liệu hiện có và quan hệ Prisma.
- Trải nghiệm người dùng hoặc thay đổi tương thích ngược.

Nếu chưa thống nhất, AI dừng ở phần liên quan và nêu lựa chọn cần xác nhận.

### Bước 4 — Triển khai theo lát cắt nhỏ

AI thực hiện theo kế hoạch đã duyệt, bám cấu trúc hiện tại:

- Backend: module/service/controller/DTO hiện hành, kiểm tra quyền phía server,
  validate input và dùng transaction khi logic hiện tại yêu cầu.
- Database: giữ Prisma schema, migration history và dữ liệu nhất quán; không
  tự dùng lệnh reset hoặc xóa dữ liệu.
- Frontend: dùng API client, state/query, component, style và response contract
  hiện có; thể hiện rõ loading, empty và error state khi phù hợp.
- Tài liệu và test: cập nhật phần liên quan trực tiếp đến thay đổi.

Sau mỗi lát cắt, kiểm tra diff để bảo đảm không lẫn thay đổi không liên quan
hoặc ghi đè công việc đang có trong worktree.

### Bước 5 — Xác minh

Chọn kiểm tra nhỏ nhất bao phủ thay đổi; nếu pass thì mới mở rộng khi cần.
Các script hiện có:

```powershell
# Backend (đứng tại backend/)
npm.cmd run build
npm.cmd run lint
npm.cmd test -- --maxWorkers=1 --no-file-parallelism
npm.cmd run test:e2e -- --maxWorkers=1 --no-file-parallelism

# Frontend (đứng tại frontend/)
npm.cmd run build
npm.cmd run lint
npm.cmd run test:master-data
```

Không bắt buộc chạy toàn bộ suite cho mọi thay đổi: ưu tiên test liên quan
trực tiếp; ghi rõ lệnh nào đã chạy và kết quả. Nếu môi trường thiếu dependency,
database hoặc service, báo blocker và không diễn giải việc chưa chạy thành
thành công.

### Bước 6 — AI tự rà soát, người thật review

Trước khi bàn giao, yêu cầu AI rà diff theo checklist:

- Có lỗi logic, edge case, null/undefined hoặc kiểu dữ liệu không?
- Có giữ API contract, response envelope và hành vi hiện tại không?
- Backend có kiểm tra actor/quyền và phạm vi bản ghi không?
- Có validate input, xử lý lỗi rõ ràng và tránh lộ secret/dữ liệu không?
- Có cập nhật test cho hành vi hoặc bug đã sửa không?
- Có thay đổi ngoài phạm vi, file do người khác sửa, migration nguy hiểm hoặc
  dependency không cần thiết không?

Đây chỉ là vòng rà soát bổ sung. Một thành viên khác vẫn review Pull Request
theo quy trình Git của nhóm; không merge chỉ dựa trên nhận xét của AI.

### Bước 7 — Bàn giao qua Pull Request

Người thực hiện mở PR theo quy trình Git trong README và cung cấp:

- Tóm tắt thay đổi và lý do.
- Acceptance criteria đã đáp ứng và cách kiểm thử.
- Test đã chạy, test chưa chạy và blocker (nếu có).
- Ảnh/video nếu thay đổi UI; ghi chú migration/config nếu có.
- Những quyết định còn cần Product Owner hoặc reviewer xác nhận.

Chỉ người được phân công mới phê duyệt và merge. AI không tự tạo commit/PR
hoặc tuyên bố task hoàn tất thay cho reviewer.

## 4. Checklist hoàn tất task

- [ ] Yêu cầu và acceptance criteria rõ; nghiệp vụ chưa chốt đã được hỏi.
- [ ] Đã khảo sát code, tài liệu, API contract và test liên quan.
- [ ] Thay đổi đúng phạm vi, không làm mất chỉnh sửa có sẵn.
- [ ] Quyền và dữ liệu được kiểm soát ở backend khi task có liên quan.
- [ ] Có test phù hợp và đã chạy; kết quả được báo chính xác.
- [ ] Diff đã được người thực hiện và reviewer xem.
- [ ] Tài liệu liên quan và mô tả PR được cập nhật.

## 5. Prompt mẫu cho task

```text
Bạn là trợ lý lập trình cho dự án UIT-FIXED (React/Vite frontend,
NestJS/Prisma backend).

Task:
<mô tả mục tiêu và vấn đề hiện tại>

Actor và acceptance criteria:
- <ai dùng>
- <kết quả quan sát được>
- <trường hợp lỗi/edge case>

Phạm vi:
- Được sửa: <module/file nếu đã biết>
- Không được sửa: <phần loại trừ>

Trước khi code:
1. Đọc code và tài liệu hiện hành liên quan.
2. Nêu cách hoạt động hiện tại, file sẽ tác động, test cần chạy và rủi ro.
3. Không tự giả định nghiệp vụ; hỏi nếu yêu cầu chưa được xác nhận.

Khi triển khai:
- Làm thay đổi nhỏ nhất nhưng đầy đủ, theo pattern hiện có.
- Giữ API contract, schema/migration và phân quyền.
- Không sửa file ngoài phạm vi, không chạy lệnh phá hủy dữ liệu,
  không commit và không tạo PR.

Khi hoàn tất:
- Tóm tắt file/hành vi đã đổi.
- Báo chính xác lệnh test/build đã chạy và kết quả.
- Nêu test chưa chạy, blocker và quyết định còn cần xác nhận.
```

## 6. Tài liệu dự án cần đối chiếu

- [Quy tắc dự án cho AI trong Cursor](../.cursor/rules/uit-fixed-project.mdc)
- [Nghiệp vụ và workflow đã thống nhất](../.agents/skills/uit-fixed-workflow/SKILL.md)
- [Hợp đồng tích hợp Dev 3/4](DEV3_DEV4_INTEGRATION.md)
- [Schema Prisma](../backend/prisma/schema.prisma)
- [Quy trình Git và Pull Request](../README.md)
