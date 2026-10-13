---
name: cms-multilingual
description: Use for Payload field localization, localized URLs and SEO canonical hreflang and sitemap behavior.
---
# Multilingual
Source: https://docs.google.com/document/d/1D0ar9L1rAkORzF4B7q-eHCvq1o1kU9EuUu680LAasJY/edit
CONFIRMED:
- Payload native localized fields on PostgreSQL. Common entity identity and translated field values, not products_vi and products_en collections.
- Localized slugs, metadata, canonicals and hreflang for actually published and indexable translated versions only.
- Avoid SEO exposure of locale fallback producing untranslated English page.
- Media original can be shared; translate alt/caption separately.
- Registry checks actual host/path uniqueness across locales; no conflicting public route.
VERIFY AGAINST VERSION:
- Locale draft/publish behavior, fallbackLocale behavior, actual physical DB schema, generated sitemap/hreflang reciprocity.
TEST:
- Vi published, en draft/absent, translated permalink change, canonical/hreflang, editing one locale does not overwrite another.
