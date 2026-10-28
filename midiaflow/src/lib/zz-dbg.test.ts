import { it } from 'vitest';
import { buildDemoData } from '/home/user/Chagas019/midiaflow/src/lib/demo-data';
it('x', () => { const d = buildDemoData(new Date('2026-10-28T21:00:00')); d.schedules.filter(s=>s.date>='2026-10-29'&&s.date<='2026-11-01').forEach(s=>console.log(s.date,s.title,JSON.stringify(s.slots.map(x=>[x.roleId,x.memberId,x.status])))); });
