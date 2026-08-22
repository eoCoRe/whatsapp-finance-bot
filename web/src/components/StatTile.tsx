import { formatBRL } from '@/lib/format';

interface StatTileProps {
  label: string;
  value: number;
  deltaPct?: number | null;
  accent?: string;
}

export default function StatTile({ label, value, deltaPct, accent }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span
        className="stat-tile__value"
        style={accent ? { color: accent } : undefined}
      >
        {formatBRL(value)}
      </span>
      {deltaPct !== undefined && deltaPct !== null && Number.isFinite(deltaPct) && (
        <span className="stat-tile__delta">
          {deltaPct > 0 ? '↑' : deltaPct < 0 ? '↓' : '→'} {Math.abs(deltaPct).toFixed(0)}% vs mês anterior
        </span>
      )}
    </div>
  );
}
