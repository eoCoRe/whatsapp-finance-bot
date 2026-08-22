import Image from 'next/image';

interface BrandHeaderProps {
  title: string;
  subtitle: React.ReactNode;
}

export default function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <div className="brand-header">
      <Image
        src="/leitaozinho-avatar.jpg"
        alt="Leitãozinho"
        width={48}
        height={48}
        className="brand-header__avatar"
        priority
      />
      <div>
        <h1>{title}</h1>
        <p className="page-header__subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
