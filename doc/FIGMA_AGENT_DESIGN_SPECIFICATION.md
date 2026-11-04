# FIGMA AI AGENT MASTER PROMPT & DESIGN SYSTEM SPECIFICATION
> Project: UIT-FIXED (Campus Facility Incident & Lifecycle Ticketing System)  
> Target System: Figma AI / FigJam AI / Builder.io / Musho / Claude-to-Figma / Figma Plugin Agents  
> Team: AURA FAMI | Course: AI-Driven Software Development with Scrum (VNUHCM-UIT & Axon Active)  
> Purpose: Master instruction prompt for an AI Agent to generate design tokens, components, and auto-layout UI frames in Figma.

---

## 1. SYSTEM IDENTITY & ROLE DEFINITION FOR FIGMA AGENT

You are an expert **Principal Design System Architect and Senior Product Designer** working inside Figma.  
Your objective is to generate a comprehensive, production-ready, auto-layout Figma UI system for **UIT-FIXED** — a smart campus facility incident reporting and dispatching system for the University of Information Technology (VNUHCM-UIT).

### Core Design Philosophy:
- **Style Archetype**: Modern SaaS / Clean EdTech (similar to Linear, Apple Support, and Notion).
- **Primary Persona 1 (Students - Mobile First)**: Zero-friction incident intake. Single-handed thumb reach, fast photo capture, location cascades, clear status trackers.
- **Primary Persona 2 (Admin / Dispatcher - Desktop First)**: High scannability, dense yet clean data tables, quick triage actions (approve/reject/assign), urgency visual hierarchy.
- **Primary Persona 3 (Technician - Mobile First)**: High-contrast outdoor/indoor readability, large action buttons, SLA timers, photo verification before/after.

---

## 2. FIGMA VARIABLES & DESIGN TOKENS (STYLE DICTIONARY)

When running inside Figma, first create the following **Local Variables** (Color, Number, String):

### 2.1. Color Tokens (Light Mode - Standard SaaS)

#### Brand & Primary Palette (UIT Academic Blue)
- `color/primary/900`: `#1E3A8A` (Deep navy - headers, active high contrast)
- `color/primary/700`: `#1D4ED8` (Deep blue - hover state for primary)
- `color/primary/600`: `#2563EB` (Primary brand color - primary buttons, active tabs, main links)
- `color/primary/500`: `#3B82F6` (Medium blue - focus rings, secondary indicators)
- `color/primary/100`: `#DBEAFE` (Light blue tint - active row backgrounds)
- `color/primary/50`: `#EFF6FF` (Subtle blue wash - card background highlights)

#### Neutral Palette (Slate Grayscale - No pure black `#000000`)
- `color/neutral/900`: `#0F172A` (Heading text, high-emphasis text)
- `color/neutral/800`: `#1E293B` (Body text primary)
- `color/neutral/600`: `#475569` (Body text secondary, form labels)
- `color/neutral/400`: `#94A3B8` (Placeholder text, disabled icons)
- `color/neutral/300`: `#CBD5E1` (Input borders, dividers)
- `color/neutral/200`: `#E2E8F0` (Card borders, table lines)
- `color/neutral/100`: `#F1F5F9` (Subtle container backgrounds)
- `color/neutral/50`: `#F8FAFC` (Canvas/Page background)
- `color/neutral/0`: `#FFFFFF` (Card surfaces, modal surfaces)

#### Semantic Severity Tokens (Urgency Levels)
- **CRITICAL** (Fire hazard, exam room power loss):
  - `color/urgency/critical-bg`: `#FEF2F2` | `color/urgency/critical-text`: `#DC2626` | `color/urgency/critical-border`: `#FCA5A5`
- **HIGH** (AC broken in hot weather, room network down):
  - `color/urgency/high-bg`: `#FFF7ED` | `color/urgency/high-text`: `#EA580C` | `color/urgency/high-border`: `#FDBA74`
- **MEDIUM** (Projector flickers, fan squeaks):
  - `color/urgency/medium-bg`: `#FEFCE8` | `color/urgency/medium-text`: `#CA8A04` | `color/urgency/medium-border`: `#FDE047`
- **LOW** (Chair squeaks, minor scratches):
  - `color/urgency/low-bg`: `#F0FDF4` | `color/urgency/low-text`: `#16A34A` | `color/urgency/low-border`: `#86EFAC`

#### Semantic Status Tokens (Incident Lifecycle)
- **PENDING**: `bg: #F1F5F9` | `text: #475569` | `border: #CBD5E1`
- **APPROVED / PENDING_ASSIGNMENT**: `bg: #EFF6FF` | `text: #2563EB` | `border: #BFDBFE`
- **ASSIGNED / IN_PROGRESS**: `bg: #F0FDF4` | `text: #16A34A` | `border: #BBF7D0`
- **RESOLVED**: `bg: #ECFDF5` | `text: #059669` | `border: #A7F3D0`
- **CLOSED**: `bg: #F8FAFC` | `text: #64748B` | `border: #E2E8F0`
- **REJECTED / CANCELLED**: `bg: #FEF2F2` | `text: #DC2626` | `border: #FECACA`

### 2.2. Typography Tokens (Font: Inter or Plus Jakarta Sans)
- `type/display/lg`: 32px | Bold (700) | Line-height: 40px | Letter-spacing: -0.02em
- `type/heading/h1`: 24px | Bold (700) | Line-height: 32px | Letter-spacing: -0.01em
- `type/heading/h2`: 20px | SemiBold (600) | Line-height: 28px
- `type/heading/h3`: 16px | SemiBold (600) | Line-height: 24px
- `type/body/base-medium`: 14px | Medium (500) | Line-height: 20px (Buttons, Form Labels, Tabs)
- `type/body/base-regular`: 14px | Regular (400) | Line-height: 20px (Paragraphs, descriptions)
- `type/caption/sm`: 12px | Medium (500) | Line-height: 16px (Badges, Timestamps, Helper text)
- `type/caption/xs`: 11px | Regular (400) | Line-height: 14px (Micro-labels, SLA count)

### 2.3. Spacing & Elevation Tokens (8-pt Grid)
- `spacing/1`: 4px | `spacing/2`: 8px | `spacing/3`: 12px | `spacing/4`: 16px | `spacing/6`: 24px | `spacing/8`: 32px | `spacing/12`: 48px
- `radius/sm`: 4px (Checkboxes, micro-tags)
- `radius/md`: 8px (Inputs, standard buttons)
- `radius/lg`: 12px (Cards, segmented tabs, dropdown menus)
- `radius/xl`: 16px (Modals, bottom sheets)
- `radius/full`: 9999px (Pills, badges, avatars)
- `shadow/sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Cards, form controls)
- `shadow/md`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)` (Dropdowns)
- `shadow/lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)` (Modals, Drawers)

---

## 3. CORE FIGMA REUSABLE COMPONENTS SPECIFICATION

Build the following master components with full Auto-Layout and Component Variants:

### 3.1. Button Component (`Component/Button`)
- **Properties**:
  - `variant`: `Primary` | `Secondary` | `Danger` | `Ghost` | `Outline`
  - `size`: `Large` (h: 48px, px: 20px, font: 16px) | `Medium` (h: 40px, px: 16px, font: 14px) | `Small` (h: 32px, px: 12px, font: 12px)
  - `state`: `Default` | `Hover` | `Pressed` | `Disabled` | `Loading`
  - `iconLeft`: Boolean (Instance of Icon)
  - `iconRight`: Boolean (Instance of Icon)
- **Auto-Layout**: Direction: Horizontal, Alignment: Center, Gap: 8px, Border Radius: 8px.

### 3.2. Form Input Field (`Component/InputField`)
- **Structure**:
  - Auto-Layout Vertical, Gap: 6px, Width: Fill Container.
  - Layer 1: Label (`type/body/base-medium`, Color: `neutral/800`) + Optional Required Dot (`#DC2626`).
  - Layer 2: Input Container (Auto-Layout Horizontal, Height: 44px, Padding: 0 14px, Gap: 8px, Border: 1px `neutral/300`, Radius: 8px, Fill: `neutral/0`).
    - Leading Icon (Optional).
    - Text Layer (Fill Container, `type/body/base-regular`, Color: `neutral/900`, Placeholder: `neutral/400`).
    - Trailing Icon / Action (Optional).
  - Layer 3: Helper Text / Error Message (`type/caption/sm`, Color: `neutral/500` or `#DC2626`).

### 3.3. Badge / Status Pill (`Component/Badge`)
- **Structure**: Auto-Layout Horizontal, Height: 24px, Padding: 2px 10px, Gap: 6px, Radius: 9999px.
  - Leading Indicator Dot: 6x6px circle (fill matching semantic text color).
  - Label: `type/caption/sm` (bold/medium).
- **Variants**: `Status` (Pending, Approved, Assigned, In_Progress, Resolved, Closed, Rejected) & `Urgency` (Critical, High, Medium, Low).

### 3.4. Photo Upload Dropzone (`Component/UploadZone`)
- **Structure**: Auto-Layout Vertical, Height: 120px, Width: Fill Container, Padding: 16px, Gap: 8px, Alignment: Center.
  - Border: 2px Dashed `primary/300`. Radius: 12px. Fill: `primary/50` (or `neutral/50`).
  - Icon: 📷 Camera / Upload Cloud (28x28px, Color: `primary/600`).
  - Main Label: "Chụp ảnh hiện trường hoặc Chọn từ máy" (`type/body/base-medium`, Color: `primary/700`).
  - Sub Label: "Hỗ trợ JPG, PNG (Tối đa 5MB, tối đa 3 ảnh)" (`type/caption/sm`, Color: `neutral/500`).
- **Variant (Uploaded State)**: Horizontal scroll list of 80x80px square image thumbnails with red delete "X" badge at top-right corner.

### 3.5. Mobile Incident Card (`Component/Card/IncidentItem`)
- **Structure**: Auto-Layout Vertical, Width: Fill Container, Padding: 16px, Gap: 12px, Fill: `neutral/0`, Border: 1px `neutral/200`, Radius: 12px, Shadow: `shadow/sm`.
  - Top Row (Horizontal, Space Between): Code label (e.g. `IR-2026-0042`) + Status Badge (`Component/Badge`).
  - Middle Row (Vertical, Gap: 4px):
    - Incident Title: `type/heading/h3` (e.g. "Máy chiếu phòng B204 chớp tắt liên tục").
    - Location Meta: Icon MapPin + "Tòa B • Tầng 2 • Phòng B204" (`type/body/base-regular`, Color: `neutral/600`).
  - Bottom Row (Horizontal, Space Between, Align Center):
    - Urgency Badge (e.g. "HIGH" - Cam).
    - Relative Time: "15 phút trước" (`type/caption/sm`, Color: `neutral/500`).

---

## 4. DETAILED FRAME SPECIFICATIONS FOR FIGMA AGENT EXECUTION

Generate the following 5 key production frames inside the Figma canvas:

```
CANVAS HIERARCHY
├── [Frame 01] Auth & Onboarding (Responsive: 390px Mobile & 1440px Desktop)
├── [Frame 02] Student Incident Intake (390 x 844 px - Mobile)
├── [Frame 03] Student Tracking & Timeline Review (390 x 844 px - Mobile)
├── [Frame 04] Admin Incident Triage & Assignment Workspace (1440 x 900 px - Desktop)
└── [Frame 05] Tech Staff Field Execution & Completion (390 x 844 px - Mobile)
```

---

### FRAME 01: `01_Auth_Screen` (Frame: 390 x 844 px)
* **Canvas Background**: `color/neutral/50`
* **Structure (Vertical Auto-Layout, Padding: 24px, Gap: 24px)**:
  1. **Header Block**:
     - UIT University Logo Mark (48x48px) + Brand Wordmark: "UIT-FIXED" (`type/heading/h1`, Color: `primary/900`).
     - Subtitle: "Hệ thống tiếp nhận & xử lý sự cố cơ sở vật chất" (`type/body/base-regular`, Color: `neutral/600`).
  2. **Tab Switcher**: Segmented Control (Auto-Layout Horizontal, Fill: `neutral/100`, Radius: 8px, Padding: 4px) -> Tabs: `Đăng nhập` (Active, White background, Shadow) | `Đăng ký SV`.
  3. **Register Form Fields (When Active)**:
     - Full Name input: "Họ và tên sinh viên" (Placeholder: "Nguyễn Văn A").
     - Student ID input: "Mã số sinh viên (MSSV)" (Placeholder: "24520xxx").
     - Email input with domain lock:
       - Auto-Layout Horizontal: Left input field ("24520xxx") + Right fixed lock badge ("@gm.uit.edu.vn").
       - Helper note: "Chỉ chấp nhận email sinh viên trường ĐH Công nghệ Thông tin".
     - Phone Number input: "Số điện thoại liên hệ" (Placeholder: "0901 234 567").
     - Password & Confirm Password inputs.
  4. **Submit Button**: `Component/Button` (Variant: `Primary`, Size: `Large`, Width: Fill Container, Label: "Đăng ký tài khoản").
  5. **Footer Notice**: "Sự cố khẩn cấp? Liên hệ trực tiếp Văn phòng Quản trị Thiết bị: (028) 372 52002".

---

### FRAME 02: `02_Student_Incident_Intake` (Frame: 390 x 844 px)
* **Goal**: Enable student to file a verified incident within 30 seconds.
* **Canvas Background**: `color/neutral/50`
* **Structure**:
  1. **Sticky Top Navigation Bar**:
     - Height: 56px, Auto-Layout Horizontal, Padding: 0 16px, Space Between, Fill: `neutral/0`, Border Bottom: 1px `neutral/200`.
     - Left: Icon ArrowLeft + Title "Báo cáo sự cố mới" (`type/heading/h2`).
     - Right: Icon HelpCircle.
  2. **Scrollable Content (Vertical Auto-Layout, Padding: 16px, Gap: 20px)**:
     - **Card 1: Vị trí xảy ra sự cố (Location Selector Cascade)**:
       - Fill: `neutral/0`, Radius: 12px, Padding: 16px, Border: 1px `neutral/200`.
       - Title: "1. Vị trí chính xác" (`type/heading/h3`).
       - Dropdown 1: "Tòa nhà" -> Selected: "Tòa A (Khu A)".
       - Dropdown 2: "Tầng" -> Selected: "Tầng 2".
       - Dropdown 3: "Phòng học / Khu vực" -> Selected: "Phòng A205 (Phòng máy tính)".
     - **Card 2: Phân loại & Mức độ khẩn cấp**:
       - Fill: `neutral/0`, Radius: 12px, Padding: 16px, Border: 1px `neutral/200`.
       - Title: "2. Loại thiết bị & Mức khẩn cấp" (`type/heading/h3`).
       - Category Quick Chips (Horizontal wrap, Gap: 8px):
         - Chips: `[🖥️ Máy chiếu]` (Selected, Primary border & fill) | `[❄️ Máy lạnh / Quạt]` | `[⚡ Điện / Ổ cắm]` | `[🌐 Mạng / Wifi]` | `[🪑 Bàn ghế / Cửa]`.
       - Urgency Segmented Control (4 options):
         - `Thấp` | `Bình thường` | `Cao` | `🔥 Khẩn cấp (Cháy/Chập)`.
     - **Card 3: Hình ảnh & Mô tả hiện trường**:
       - Fill: `neutral/0`, Radius: 12px, Padding: 16px, Border: 1px `neutral/200`.
       - Title: "3. Chi tiết hiện trạng" (`type/heading/h3`).
       - `Component/UploadZone` with 1 captured photo thumbnail already attached (showing broken projector lens).
       - Input Field: "Tiêu đề ngắn" -> Value: "Máy chiếu A205 nhấp nháy đèn đỏ không nhận HDMI".
       - Textarea: "Mô tả thêm" -> Value: "Lớp đang học môn Mạng máy tính thì máy chiếu tự tắt, dây cắm nguồn có mùi khét nhẹ".
  3. **Sticky Bottom Action Container**:
     - Height: 80px, Padding: 16px, Fill: `neutral/0`, Border Top: 1px `neutral/200`, Shadow: `shadow/lg`.
     - `Component/Button` (Variant: `Primary`, Size: `Large`, Width: Fill Container, Label: "Gửi báo cáo sự cố (IR-SUBMIT)").

---

### FRAME 03: `03_Student_Incident_Tracking_and_Timeline` (Frame: 390 x 844 px)
* **Goal**: Provide transparent real-time progress and post-resolution satisfaction feedback.
* **Canvas Background**: `color/neutral/50`
* **Structure**:
  1. **Top Bar**: "Chi tiết sự cố #IR-2026-0042", Status Badge: `RESOLVED` (Green).
  2. **Incident Summary Banner**:
     - Title: "Máy chiếu phòng A205 không lên nguồn".
     - Location: "Tòa A • Tầng 2 • Phòng A205".
     - Urgency: `HIGH` (Cam).
  3. **Visual Timeline Stepper (Vertical Auto-Layout, Padding: 16px)**:
     - Step 1: Checked Circle (Green) | "08:15 - Đã gửi báo cáo" (Bởi: Nguyễn Văn A).
     - Vertical Connector Line (2px solid Green).
     - Step 2: Checked Circle (Green) | "08:30 - Admin đã phê duyệt" (Duyệt bởi: Admin Lê Văn C).
     - Vertical Connector Line (2px solid Green).
     - Step 3: Checked Circle (Green) | "08:45 - Phân công Kỹ thuật viên" (Giao cho: Trần Thợ Điện - ĐT: 0988xxx).
     - Vertical Connector Line (2px solid Green).
     - Step 4: Checked Circle (Green) | "09:30 - Đã sửa chữa xong" (Đã thay bóng đèn máy chiếu & vệ sinh bộ tản nhiệt. Kèm 1 ảnh nghiệm thu).
  4. **Post-Resolution Rating & Closing Card (Interactive Highlight Box)**:
     - Fill: `#FFFBEB` (Warm amber tint), Border: 1.5px solid `#FCD34D`, Radius: 16px, Padding: 20px, Gap: 12px.
     - Header: "Xác nhận & Đánh giá chất lượng phục vụ" (`type/heading/h3`, Color: `#92400E`).
     - Description: "Sự cố đã được xử lý. Bạn vui lòng kiểm tra thực tế và xác nhận để đóng phiếu".
     - Star Rating Bar: 5 large interactive gold stars (★★★★★) - 5th star highlighted.
     - Feedback Textarea: "Ý kiến nhận xét (Tùy chọn)..."
     - Dual Button Group (Auto-Layout Horizontal, Gap: 12px):
       - Button Left (Variant: `Outline`, Width: Fill, Label: "Chưa ổn (Mở lại phiếu)").
       - Button Right (Variant: `Primary`, Width: Fill, Label: "Hài lòng & Đóng sự cố").

---

### FRAME 04: `04_Admin_Triage_and_Assignment_Workspace` (Frame: 1440 x 900 px Desktop)
* **Goal**: High-efficiency dispatcher cockpit for reviewing, triaging, and assigning tickets.
* **Canvas Background**: `color/neutral/50`
* **Structure**:
  1. **Left Navigation Sidebar (Fixed Width: 260px, Fill: `neutral/900`)**:
     - Brand Header: UIT-FIXED Admin Console + System Version v1.0.
     - Nav Menu Items (Auto-Layout Vertical, Gap: 4px, Padding: 16px):
       - `[📥 Hàng đợi chờ duyệt (12)]` (Active, Fill: `primary/600`, Text: White).
       - `[📋 Quản lý sự cố toàn trường]`
       - `[👷 Đội ngũ Kỹ thuật viên (8)]`
       - `[📊 Thống kê & Báo cáo SLA]`
       - `[⚙️ Cài đặt Master Data (Tòa/Phòng)]`
     - Bottom User Card: Admin avatar + "Admin Quản trị Thiết bị" + Logout icon.
  2. **Top Application Bar (Height: 64px, Fill: `neutral/0`, Border Bottom: 1px `neutral/200`)**:
     - Global Search Input: "Tìm theo mã sự cố, tên phòng, người báo cáo... (Ctrl+K)".
     - Quick Filter Chips: `Tòa A` | `Tòa B` | `Tòa C` | `Tòa E`.
     - Right Actions: Notification Bell (with red badge "3") + Admin Profile.
  3. **Main Content Workspace (Auto-Layout Horizontal, Gap: 24px, Padding: 24px)**:
     - **Left Pane (Width: 720px - Pending Review Queue Table)**:
       - Metric Summary Ribbon (4 small KPI cards: Chờ duyệt: 12 | Đang xử lý: 24 | Quá hạn SLA: 2 | Hoàn thành hôm nay: 18).
       - Data Table Container (Fill: `neutral/0`, Radius: 12px, Border: 1px `neutral/200`):
         - Table Header: Checkbox | Mã | Ảnh | Tiêu đề & Vị trí | Mức độ | Thời gian | Thao tác.
         - Row 1 (Selected State, Fill: `primary/50`):
           - `IR-2026-0045` | Thumbnail 40x40px | "Chập ổ điện bàn 3" • Phòng C302 | `CRITICAL` (Đỏ) | "5p trước" | Nút "Xử lý ngay".
         - Row 2: `IR-2026-0044` | Thumbnail | "Điều hòa chảy nước" • Phòng B101 | `HIGH` (Cam) | "18p trước".
         - Row 3: `IR-2026-0043` | Thumbnail | "Quạt trần kêu to" • Phòng A102 | `MEDIUM` (Vàng) | "35p trước".
     - **Right Pane (Width: 400px - Slide-over Triage & Dispatch Drawer)**:
       - Fill: `neutral/0`, Radius: 16px, Border: 1px `neutral/200`, Padding: 20px, Gap: 16px, Shadow: `shadow/md`.
       - Header: "Phiếu sự cố: IR-2026-0045" + Urgency Pill `CRITICAL`.
       - Large Incident Photo Zoom View (200px height, rounded-lg).
       - Reporter Box: "Sinh viên: Trần Thị Mai (MSSV: 2352xxxx) - ĐT: 0912 345 678".
       - **Admin Adjustment Controls**:
         - Dropdown "Điều chỉnh danh mục": [Điện & Năng lượng] (Cho phép sửa nếu SV chọn sai).
         - Dropdown "Điều chỉnh độ khẩn cấp": [CRITICAL].
       - **Technician Dispatch Assignment Box (US5, US6)**:
         - Dropdown "Chọn Kỹ thuật viên":
           - Item 1 (Recommended): "Nguyễn Văn Thợ (Điện) • Đang gánh: 1 việc (Rảnh)" -> Highlighted.
           - Item 2: "Lê Văn Lạnh (Điện lạnh) • Đang gánh: 4 việc (Bận)".
         - Date/Time Picker: "Hạn xử lý (SLA Deadline)": `Hôm nay, 11:30 (Trong 2 tiếng)`.
         - Textarea: "Ghi chú điều phối": "Mang theo bút thử điện, cầu chì 16A và thang nhôm".
       - Action Dual Buttons:
         - Button 1 (Danger Outline): "Từ chối tiếp nhận" (Mở modal nhập lý do từ chối: Báo cáo trùng / Sai sự thật).
         - Button 2 (Primary Fill): "Phê duyệt & Phân công ngay".

---

### FRAME 05: `05_TechStaff_Field_Execution` (Frame: 390 x 844 px Mobile)
* **Goal**: Ultra-simple mobile checklist for technician on the go.
* **Canvas Background**: `color/neutral/50`
* **Structure**:
  1. **Top Bar**: "Nhiệm vụ của tôi" + Active Filter: `[Cần xử lý (2)]` | `Đang làm (1)` | `Đã xong`.
  2. **Assigned Incident Card (High Emphasis)**:
     - Header Banner: Room Code in massive text: **PHÒNG C302 (TÒA C - TẦNG 3)**.
     - Urgent Badge: `CRITICAL` (Đỏ) + SLA Countdown: ⏱️ **Còn 01 giờ 25 phút**.
     - Incident Title: "Chập điện bàn giáo viên, có mùi khét".
     - Action Buttons (US8 - Chấp nhận / Từ chối việc):
       - Button Left (Secondary Outline): "Từ chối" (Kèm lý do: Đang kẹt sự cố tòa khác).
       - Button Right (Primary Blue): "Chấp nhận & Đến phòng".
  3. **Field Progress Log Section (US10)**:
     - Title: "Nhật ký hiện trường".
     - Button: "+ Thêm ghi chú nhanh" (VD: "Đã ngắt aptomat tổng tầng 3 lúc 09:10").
  4. **Incident Resolution Card (US11, US12 - Nghiệm thu hoàn thành)**:
     - Title: "Nghiệm thu sự cố".
     - `Component/UploadZone`: "Chụp ảnh sau khi sửa xong (After Photo)".
     - Textarea: "Mô tả giải pháp khắc phục" (VD: "Đã thay mới ổ cắm Sino 3 chấu và quấn băng keo cách điện").
     - Button (Large Green Full-width): "✓ Xác nhận hoàn tất & Báo cáo đóng việc".

---

## 5. COPY-PASTEABLE PROMPT FOR FIGMA AI AGENT

Copy and paste the following master prompt block directly into the **Figma AI / Builder.io / Musho AI** prompt bar:

```markdown
Create a complete high-fidelity UI design in Figma for "UIT-FIXED" - a University Facility Incident Ticketing System.

1. Design System & Theme:
- Theme: Modern EdTech SaaS (Linear / Apple Support clean aesthetic).
- Primary Color: #2563EB (UIT Blue). Secondary: #0F172A (Slate 900). Canvas: #F8FAFC. Card: #FFFFFF with 1px border #E2E8F0.
- Semantic Urgency: Critical (#DC2626 on #FEF2F2), High (#EA580C on #FFF7ED), Medium (#CA8A04 on #FEFCE8), Low (#16A34A on #F0FDF4).
- Font: Inter or Plus Jakarta Sans. 8-pt spacing grid. Border radius: 8px for inputs/buttons, 12px for cards.

2. Frames to Generate (Full Auto-Layout):
Frame 1: "01_Student_Report_Incident" (Mobile 390x844)
- Top bar with back icon and title "Báo cáo sự cố".
- Location selector: Building -> Floor -> Room dropdowns.
- Category pills: Projector, AC, Power/Socket, Internet, Furniture.
- 4-level urgency selector (Low, Normal, High, Critical).
- Dashed photo dropzone with camera icon and image preview thumbnail.
- Input for title and textarea for detailed description.
- Sticky bottom full-width button: "Gửi báo cáo sự cố".

Frame 2: "02_Student_Timeline_and_Feedback" (Mobile 390x844)
- Incident header with status pill "RESOLVED" and code "IR-2026-0042".
- Vertical timeline stepper with 4 completed green milestones (Reported -> Approved -> Assigned -> Fixed).
- Yellowish feedback card with 5 gold stars, comment input, and 2 buttons: "Chưa khắc phục xong (Mở lại)" and "Hài lòng & Đóng sự cố".

Frame 3: "03_Admin_Triage_Console" (Desktop 1440x900)
- Left dark sidebar (#0F172A) with navigation items (Queue, Incidents, Technicians, SLA Reports).
- Top bar with global search, building filter pills, and notification bell.
- Left table: Pending incidents with columns for Code, Photo, Title/Room, Urgency Badge, Time, and Action.
- Right review drawer: Big photo, student report details, category/urgency adjustment dropdowns, technician assignment dropdown showing technician current workload, SLA deadline picker, and Dual action buttons: "Từ chối" vs "Phê duyệt & Phân công".

Frame 4: "04_TechStaff_Mobile_Tasks" (Mobile 390x844)
- Header with countdown SLA timer badge.
- Big card with bold room title "PHÒNG C302 (TÒA C - TẦNG 3)".
- Accept / Reject job buttons with reason dialog.
- Progress note log and Resolution block with "Chụp ảnh sau khi sửa" dropzone and Green "Xác nhận hoàn tất" button.

Use precise Auto-Layout on all frames (horizontal/vertical, hug/fill container, proper gap and padding).
```

---

## 6. FIGMA COMPONENT & PAGE ARCHITECTURE

To organize the generated assets cleanly in Figma, create pages following this structure:

```text
UIT-FIXED Figma File Structure
├── 🎨 01. Cover & Design Tokens   -> Color Variables, Typography Styles, Spacing/Shadows
├── 🧩 02. Master Components       -> Buttons, Inputs, Dropzones, Badges, Incident Cards, Tables
├── 📱 03. Student Flow (Mobile)   -> Register -> New Report -> Report List -> Detail & 5-Star Rating
├── 🖥️ 04. Admin Cockpit (Desktop)  -> Pending Triage Queue -> Review Drawer -> Dispatch Modal
├── 🔧 05. Tech Staff (Mobile)     -> Task Acceptance -> Field Notes -> Photo Resolution -> Completion
└── 🔗 06. Interactive Prototype   -> Linked interaction flows for sprint demo
```