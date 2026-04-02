'use client'

import ProgressPhotoBodyBreakdown from './ProgressPhotoBodyBreakdown'

export default function ProgressTimeline({ photos, onAdd, onSelectPhoto }) {
  if (!photos?.length) {
    return (
      <div style={{ padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#2D5B3F', marginBottom: 14 }}>
          Take your first progress photo to track changes. You can upload new ones anytime.
        </div>
        <button
          type="button"
          onClick={() => onAdd?.()}
          style={{
            padding: '14px 22px',
            minHeight: 48,
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #10B981, #6EE7B7)',
            color: '#070B07',
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Upload progress photo
        </button>
      </div>
    )
  }

  return (
    <div>
    <div
      style={{
        padding: '12px 18px',
        overflowX: 'auto',
        display: 'flex',
        gap: 12,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {photos.map((photo) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onSelectPhoto?.(photo)}
          style={{
            minWidth: 100,
            flex: '0 0 auto',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          {photo.signedUrl ? (
            <img
              src={photo.signedUrl}
              alt=""
              style={{
                width: 100,
                height: 100,
                objectFit: 'cover',
                borderRadius: 14,
                border: '1px solid rgba(110,231,183,0.1)',
              }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 14,
                background: 'rgba(14,20,14,0.6)',
                border: '1px solid rgba(110,231,183,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#2D5B3F',
              }}
            >
              No preview
            </div>
          )}
          <div style={{ fontSize: 10, color: '#2D5B3F', marginTop: 4 }}>
            {new Date(photo.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
          {photo.weight_at_time != null && (
            <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 600 }}>{photo.weight_at_time} kg</div>
          )}
          <div style={{ fontSize: 10, color: '#6EE7B7', fontWeight: 600 }}>
            {photo.body_fat_estimate || photo.analysis?.bodyFatEstimate || ''}
          </div>
        </button>
      ))}
    </div>
    <div
      style={{
        padding: '0 18px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: '#4A6B58' }}>
        {photos.length} photo{photos.length !== 1 ? 's' : ''} — add more whenever you want
      </span>
      <button
        type="button"
        onClick={() => onAdd?.()}
        style={{
          padding: '10px 16px',
          minHeight: 44,
          borderRadius: 100,
          background: 'rgba(110,231,183,0.1)',
          border: '1px solid rgba(110,231,183,0.2)',
          color: '#6EE7B7',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        + Add photo
      </button>
    </div>
    <ProgressPhotoBodyBreakdown photos={photos} />
    </div>
  )
}
