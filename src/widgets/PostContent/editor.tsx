'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import type { PostContentProps } from './frontend'

export const postContentEditor: ComponentConfig<PostContentProps> = {
  label: 'Document Body Content',
  fields: {
    showExcerptFirst: {
      type: 'radio',
      label: 'Show Excerpt / Lead Paragraph First',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    showExcerptFirst: false,
  },
  render: ({ showExcerptFirst = false }) => {
    return (
      <div
        className="zyvavu-widget-post-content"
        style={{
          padding: '20px',
          border: '1px dashed #ced4da',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
          margin: '16px 0',
        }}
      >
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0e6b66', fontWeight: 600, marginBottom: '8px' }}>
          Dynamic Document Content (Lexical RichText / Blocks)
        </div>
        {showExcerptFirst && (
          <p style={{ fontSize: '1.1rem', color: '#555', fontStyle: 'italic', marginBottom: '12px' }}>
            [Đoạn tóm tắt mở đầu (Excerpt) được hiển thị nổi bật tại đây khi được kích hoạt...]
          </p>
        )}
        <p style={{ margin: '0 0 12px', lineHeight: 1.7, color: '#333' }}>
          Đây là vùng hiển thị toàn bộ nội dung bài viết phong phú (Rich Text) được soạn thảo trong Payload CMS Lexical Editor. Khi xuất bản, người dùng sẽ đọc toàn văn bài viết, bao gồm các tiêu đề phụ H2, H3, danh sách và hình ảnh minh hoạ.
        </p>
        <div style={{ borderLeft: '3px solid #0e6b66', paddingLeft: '12px', margin: '16px 0', fontStyle: 'italic', color: '#555' }}>
          &ldquo;Nền tảng kiến trúc Theme Engine V1 của Zyvavu tách bạch hoàn toàn cấu trúc giao diện JSON và mã thực thi của các khối Widgets.&rdquo;
        </div>
        <p style={{ margin: 0, lineHeight: 1.7, color: '#333' }}>
          Nội dung thực tế từ cơ sở dữ liệu sẽ tự động được liên kết và hiển thị trên giao diện người dùng.
        </p>
      </div>
    )
  },
}
