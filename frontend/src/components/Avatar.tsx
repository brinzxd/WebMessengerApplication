import { useEffect, useState } from 'react';

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://minio:')) {
    return url.replace(/^http:\/\/minio:[0-9]+/, '/minio');
  }
  return url;
}

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const normalizedSrc = normalizeUrl(src);
  const [errored, setErrored] = useState(false);
  const initial = (name || '?')[0].toUpperCase();

  // Reset error state whenever src changes so new URLs are retried
  useEffect(() => {
    setErrored(false);
  }, [normalizedSrc]);

  return (
    <div
      className={`avatar-wrap ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {normalizedSrc && !errored ? (
        <img
          src={normalizedSrc}
          alt={name}
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      ) : (
        <span className="avatar-initial">{initial}</span>
      )}
    </div>
  );
}
