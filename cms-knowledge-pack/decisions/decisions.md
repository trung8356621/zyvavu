DECISION REGISTRY — lựa chọn trích từ REMEMBER
Cách đọc: ID | STATUS | decision | source.
DEC-CORE-001 | CONFIRMED | Nền tảng Next.js + Payload + PostgreSQL; Core reuse; Traditional/Modern + Product module. | CMS §02–03.
DEC-CORE-002 | CONFIRMED | SEO-OPS độc lập, chỉ adapter push bài khi cần; CMS tự render không phụ thuộc. | CMS Phụ lục A.
DEC-CORE-003 | CONFIRMED | Site-admin khách chỉnh menu/theme/SEO/content; /admin/system chỉ system-admin, guard backend chung. | CMS Phụ lục A.
DEC-URL-001 | CONFIRMED | Flat URL Registry, exact lookup indexed URL→type/id; nhận URL WP cũ, không quét collection mỗi request. | SEO Backend Phụ lục URL.
DEC-URL-002 | CONFIRMED | URL source chung cho sitemap/canonical/breadcrumb/menu; slug change redirect/history; unique path, test collision. | SEO Backend §04 + phụ lục.
DEC-MIG-001 | CONFIRMED | SEO parity khi chuyển WP, giữ URL/metadata/status/internal links; benchmark trước đổi theme. | SEO Backend Phụ lục.
DEC-MENU-001 | CONFIRMED | Classic/Mega Desktop switch; Mega mixed blocks, ProductList lấy product không lấy category con tự động. | Mega §02–04.
DEC-MENU-002 | CONFIRMED | Mobile HTML SSR link trích xuất từ Mega; khách tự kéo sắp cây; link source đổi reset theo quy tắc. | Mega §03.
DEC-MENU-003 | OPEN | Dynamic ProductList URL nào tham gia link extraction và reset mobile? | Mega §06.
DEC-MEDIA-001 | CONFIRMED | Binary media ngoài DB; public media URL/proxy ổn định; migration storage API riêng do operator quản, không UI khách. | CMS Phụ lục D.
DEC-MEDIA-002 | CONFIRMED | Icon set phải có custom SVG Zalo. | CMS Phụ lục D.
DEC-MEDIA-003 | PROPOSED | Image variant on demand/cache, limited sizes; advanced WebP/AVIF paid, exact policy chưa xác nhận. | CMS Phụ lục D.
DEC-CACHE-001 | CONFIRMED | Single page/post/product invalidate ngay; aggregated listing/home/category/menu theo site delay D; URL/status/noindex an toàn ngay. | CMS Phụ lục C.
DEC-SUBMIT-001 | CONFIRMED | Sitemap publication delay D, IndexNow 2D, có manual trigger; không hứa Google indexing. | CMS Phụ lục C.
DEC-SUBMIT-002 | OPEN | D tính theo publish đầu tiên hay content edit cuối, theo batch hay per item? | CMS Phụ lục C.
DEC-LANG-001 | CONFIRMED | Payload localization native trên PostgreSQL; entity ID chung, title/slug/SEO localized; tránh fallback bản chưa dịch cho public SEO. | CMS Phụ lục E.
DEC-SEARCH-001 | CONFIRMED | PostgreSQL pg_trgm, xử lý tiếng Việt; không embedding/vector search. | CMS Phụ lục F.
DEC-BACKUP-001 | CONFIRMED | Portable application-level backup/restore kiểu SEO-OPS; không lấy SQL dump làm backup chính; omit cache/logs tái tạo được. | CMS Phụ lục F.
DEC-HOST-001 | CONFIRMED | Origin first, không phụ thuộc Cloudflare Proxy ở VN. Host/provider cụ thể cần benchmark. | CMS §08.
DEC-HOST-002 | OPEN | Site-per-instance hay multitenant? Ưu tiên site isolation để thử, chưa khóa. | CMS §11 + §16.
DEC-ANIM-001 | CONFIRMED | CSS-first/WAAPI, Canvas/WebGL chỉ khi cần, reduced motion, benchmark. | Roadmap §06.
DEC-UI-001 | CONFIRMED (Admin) / PROPOSED (Public) | Mantine là UI library chuẩn cho custom Admin controls; Lucide là icon set; src/theme/theme.json là cấu hình trực quan Admin trung tâm (no custom atom factory). Public frontend UI (shadcn/ui/Embla) giữ nguyên trạng thái PROPOSED, độc lập với Admin. | Skill cms-admin-design V2; Roadmap Bổ sung.
DEC-PRODUCT-001 | OPEN | Product Catalog MVP hỗ trợ quote/variants/checkout đến đâu. | CMS §16.
DEC-SCHEMA-001 | CONFIRMED | SEO backend học tốt từ WP Core, Yoast, Rank Math; schema watch thay đổi, không tự xây keyword score. | SEO Backend §02–08.
DEC-SYSTEM-001 | CONFIRMED | Không tạo CMS UI để khách thao tác hosting/storage credentials. | CMS Phụ lục A/D.

OPEN/VALIDATE BEFORE CODING:
1. Dynamic ProductList link extraction vs mobile reset.
2. Cache/sitemap delay D calculation semantics; manual IndexNow on delete.
3. Locale-specific published behavior / fallback in current Payload version.
4. URL collision/reserved route/host+locale normalization.
5. Static Profile vs always running Payload server.
6. Hosting provider, region & route ISP actual benchmarks.
7. Catalog business scope; quote/cart/variants.
8. S3/R2 image proxy and variant economics; exact free/paid partition.
9. Permissions implementation across custom views and APIs.
10. Backup format/version/media manifest/full restore tests.
11. How to ship shared core/themes across independent sites.
12. Which features belong to core vs standalone operational tooling.

RISK WARNING: Some older docs propose larger SEO-OPS API responsibilities. Later clarification confirms SEO-OPS only supports content push/automation; use latest narrow boundary. Some older docs say editor permissions undecided; later decision site-admin broad access except /admin/system supersedes this.
