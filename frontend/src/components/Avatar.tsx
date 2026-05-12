import { useState } from 'react';

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const initial = (name || '?')[0].toUpperCase();

  return (
    <div
      className={`avatar-wrap ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src && !errored ? (
        <img
          src={src}
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
