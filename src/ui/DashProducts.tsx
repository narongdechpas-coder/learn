import type { Case, Proposal } from '../types';
import { fmtBaht, fmtCompactBaht, useT } from '../i18n';
import { useStore } from '../store';
import { productStats } from '../lib/productStats';
import { HBars } from './charts';
import { TypeTag } from './common';
import { productName } from './Products';

/** Dashboard: sales per product for the filtered period (issued policies and partner quotations). */
export function ProductSection({ cases, proposals, from, to }: { cases: Case[]; proposals: Proposal[]; from: number; to: number }) {
  const { t, lang } = useT();
  const s = useStore();
  const inRange = (at?: number) => !!at && at >= from && at <= to;
  const stats = productStats(
    cases.filter((c) => inRange(c.stamps.issued)),
    proposals.filter((p) => inRange(p.createdAt)),
  );
  const rows = [...stats.values()]
    .filter((r) => r.policies > 0 || r.offered > 0)
    .map((r) => ({ r, p: s.products.find((x) => x.id === r.id) }))
    .sort((a, b) => b.r.gwp - a.r.gwp);
  const name = (id: string, p?: (typeof s.products)[number]) => (p ? productName(p, lang) : id);
  return (
    <section className="card dash-products">
      <div className="card-tools">
        <div>
          <h3>{t('dpTitle')}</h3>
          <p className="hint">{t('dpLead')}</p>
        </div>
      </div>
      <div className="dash-2col dp-grid">
        <div>
          <h4>{t('dpGwp')}</h4>
          <HBars rows={rows.slice(0, 8).map(({ r, p }) => ({ key: r.id, label: name(r.id, p), value: r.gwp }))} format={(v) => fmtCompactBaht(v, lang)} empty={t('noData')} />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('pdProduct')}</th>
                <th className="r">{t('dpPolicies')}</th>
                <th className="r">{t('dpPartnerShare')}</th>
                <th className="r">{t('dpCommission')}</th>
                <th className="r">{t('pdConv')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="muted">{t('noData')}</td></tr>
              )}
              {rows.map(({ r, p }) => (
                <tr key={r.id}>
                  <td>{p && <TypeTag type={p.type} />} {name(r.id, p)}</td>
                  <td className="r num">{r.policies}</td>
                  <td className="r num">{r.policies ? `${Math.round((r.partnerPolicies / r.policies) * 100)}%` : '—'}</td>
                  <td className="r num">{fmtBaht(Math.round(r.commission), lang)}</td>
                  <td className="r num">{r.offered ? `${Math.round((r.won / r.offered) * 100)}%` : '—'}<div className="hint">{t('dpWon', { won: r.won, offered: r.offered })}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
