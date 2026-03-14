import Image from 'next/image';

interface VaultIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export function VaultIcon({ icon, size = 20, className }: VaultIconProps) {
  if (icon.startsWith('/')) {
    return (
      <Image
        src={icon}
        alt=""
        width={size}
        height={size}
        className={className}
      />
    );
  }
  return <span className={className}>{icon}</span>;
}
