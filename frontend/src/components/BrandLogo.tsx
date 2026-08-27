type BrandLogoProps = {
  size?: number;
};

export function BrandLogo({ size = 48 }: BrandLogoProps) {
  return (
    <img
      className="brand-logo"
      src="/logo-mordi.png"
      alt="Mordi"
      width={size}
      height={size}
    />
  );
}
