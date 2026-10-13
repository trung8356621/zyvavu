CMS KNOWLEDGE PACK — DRIVE-NATIVE EDITION
Mục tiêu: bộ tài liệu dùng trực tiếp trong Docs Project; có thể xuất bản Markdown/SKILL.md và TypeScript khi chuyển sang coding agent.
Nguồn quyết định: 4 Google Docs gốc trong folder REMEMBER. Không sửa tài liệu gốc.
QUY TẮC TRI THỨC:
CONFIRMED = người dùng chốt rõ trong hội thoại; PROPOSED = hướng kỹ thuật đáng thử; OPEN = chưa quyết; CONFLICT = tài liệu mâu thuẫn; EXTERNAL = phải xác minh phiên bản source và docs chính thức trước khi dùng.
Document gốc:
ROADMAP https://docs.google.com/document/d/1SOW7UdS1ojrU5LJozS3K-k4xvtNHFE4P1nFc7YF9fEM/edit
CMS/HOSTING https://docs.google.com/document/d/1D0ar9L1rAkORzF4B7q-eHCvq1o1kU9EuUu680LAasJY/edit
MEGA MENU https://docs.google.com/document/d/1CZQ0d9y3xGZBlkbz3eJ9BrKqw7t_xGsEAKVGbp768Tk/edit
SEO BACKEND https://docs.google.com/document/d/1DqWEe4v3frWWr_uuf9MZ1EngCuyMd3jlMwhEzTu7uEU/edit

CẤU TRÚC DRIVE:
01 — DECISIONS & Open Questions
02–09 — 8 AGENT SKILL source documents (nội dung đặt trong SKILL.md khi export).
10 — MCP Server Design & Sources
11 — MCP Server TypeScript Source
12 — Setup & Validation Guide
Đây là Docs chứa SOURCE TEXT chứ không phải file .md/.ts đang được chạy. Để cài thực sự: export nội dung từng Docs ra UTF-8, lưu theo file path trong tiêu đề, npm install, build, chạy kiểm thử trên máy có Node.js và nối MCP client. Không tuyên bố đã cài MCP chỉ vì có Docs.

MỤC ĐÍCH MỖI ĐƠN VỊ:
Skills hướng dẫn agent chọn khi nào đọc nguồn, các quy tắc confirmed và tiêu chí phản biện.
MCP phục vụ get_decision, search_knowledge, get_source, list_open_questions từ bản export local. Không cần embedding/vector store.
Docs Project: thêm folder/những Google Docs vào project để hỏi đáp ngay; MCP chỉ dùng sau khi có coding environment và file local.

CẢNH BÁO:
Chưa chốt hình thức multi-tenant/site-per-instance; chưa chốt image paid tier chi tiết, exact delay D, dynamic product links, phiên bản thư viện lúc triển khai.
Không gắn SEO-OPS vào SEO Core.
Không giao công cụ maintenance, storage credentials cho site-admin.
Không nhầm trạng thái project Docs với MCP hoạt động.
