type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export function BrandLogo({ size = 48, className, alt = 'Mordi' }: BrandLogoProps) {
  return (
    <img
      className={className ? `brand-logo ${className}` : 'brand-logo'}
      src="/logo-mordi.png"
      alt={alt}
      width={size}
      height={size}
    />
  );
}
