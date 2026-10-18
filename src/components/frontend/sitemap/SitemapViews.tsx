import React from 'react'

import type { SitemapChunkView, SitemapIndexRow } from '@/lib/seo/sitemap-view'
import { sitemapViewPath } from '@/lib/seo/sitemap-view'
import { sitemapChunkPath } from '@/lib/seo/sitemap'

function formatLastmod(value?: string): string {
  if (!value) return '—'
  const time = Date.parse(value)
  if (Number.isNaN(time)) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(time))
}

function Lastmod({ value }: { value?: string }) {
  if (!value || Number.isNaN(Date.parse(value))) return <>—</>
  return <time dateTime={value} title={value}>{formatLastmod(value)} UTC</time>
}

export function SitemapIndexView({ rows, xmlNavigation = false }: { rows: SitemapIndexRow[]; xmlNavigation?: boolean }) {
  return (
    <main className="zv-sitemap">
      <p className="zv-sitemap__brand">Zyvavu</p>
      <h1>Sơ đồ trang web XML</h1>
      <p className="zv-sitemap__lead">
        Bản xem này giúp người đọc duyệt các sơ đồ trang. Công cụ tìm kiếm vẫn nhận tệp XML gốc. Trang không dùng XSLT.
      </p>
      <p>
        <a href="/sitemap.xml?raw=1">Xem XML gốc</a>
      </p>
      {rows.length === 0 ? (
        <p>Chưa có sơ đồ nào được xuất bản.</p>
      ) : (
        <div className="zv-sitemap__table-wrap">
          <table>
            <caption>Các nhóm sơ đồ trang</caption>
            <thead>
              <tr>
                <th scope="col">Sơ đồ</th>
                <th scope="col">Số URL</th>
                <th scope="col">Cập nhật lần cuối</th>
                <th scope="col">XML</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.group}-${row.page}`}>
                  <td>
                    <a href={xmlNavigation ? row.xmlPath : row.viewPath}>
                      {row.label}
                      {row.page > 1 ? ` — phần ${row.page}` : ''}
                    </a>
                  </td>
                  <td>{row.urlCount}</td>
                  <td><Lastmod value={row.lastmod} /></td>
                  <td>
                    <a href={`${row.xmlPath}?raw=1`}>Xem XML gốc</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export function SitemapChunkView({ view, xmlNavigation = false }: { view: SitemapChunkView; xmlNavigation?: boolean }) {
  const pages = Array.from({ length: view.pageCount }, (_, index) => index + 1)
  return (
    <main className="zv-sitemap">
      <p className="zv-sitemap__brand">Zyvavu</p>
      <p>
        <a href={xmlNavigation ? '/sitemap.xml' : '/sitemap-view'}>Quay lại sơ đồ trang</a>
      </p>
      <h1>
        {view.label}
        {view.pageCount > 1 ? ` — phần ${view.page}` : ''}
      </h1>
      <p className="zv-sitemap__lead">
        {view.entries.length} URL trong phần này.
        {view.pageCount > 1 ? ` Có ${view.pageCount} phần.` : ''}
      </p>
      <p>
        <a href={`${view.xmlPath}?raw=1`}>Xem XML gốc</a>
      </p>
      <div className="zv-sitemap__table-wrap">
        <table>
          <caption>
            URL chính thức của {view.label.toLowerCase()}
          </caption>
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">Cập nhật lần cuối</th>
            </tr>
          </thead>
          <tbody>
            {view.entries.length === 0 ? (
              <tr>
                <td colSpan={2}>Phần này không có URL có thể lập chỉ mục.</td>
              </tr>
            ) : (
              view.entries.map((entry) => (
                <tr key={entry.loc}>
                  <td>
                    <a href={entry.loc}>{entry.loc}</a>
                  </td>
                  <td><Lastmod value={entry.lastmod} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {view.pageCount > 1 ? (
        <nav className="zv-sitemap__pager" aria-label="Phân trang sơ đồ">
          {pages.map((page) =>
            page === view.page ? (
              <span key={page} aria-current="page">
                {page}
              </span>
            ) : (
              <a key={page} href={xmlNavigation ? sitemapChunkPath(view.group, page) : sitemapViewPath(view.group, page)}>
                {page}
              </a>
            ),
          )}
        </nav>
      ) : null}
    </main>
  )
}
