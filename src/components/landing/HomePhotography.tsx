interface HomePhotographyProps {
  image: string;
  alt: string;
  widths?: readonly number[];
  sizes?: string;
  className?: string;
  ratio?: number;
}

export function HomePhotography({ image, alt, widths = [640, 1100], sizes = "(max-width: 767px) calc(100vw - 32px), 48vw", className = "", ratio = 1.6 }: HomePhotographyProps) {
  const largest = widths[widths.length - 1];
  const sources = (extension: string) => widths.map(width => `/home/${image}-${width}.${extension} ${width}w`).join(", ");
  return (
    <picture className={`udx-editorial-photo ${className}`}>
      <source type="image/avif" srcSet={sources("avif")} sizes={sizes} />
      <img src={`/home/${image}-${largest}.webp`} srcSet={sources("webp")} sizes={sizes}
        width={largest} height={Math.round(largest / ratio)} alt={alt} loading="lazy" decoding="async" fetchPriority="low" />
    </picture>
  );
}
