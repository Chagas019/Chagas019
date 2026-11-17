-- Catálogo de referência de talentos (dados reais de configuração, não fictícios).
insert into public.skill_categories (slug, names, icon, sort_order) values
  ('music',         '{"pt-BR":"Música e liturgia","en":"Music & liturgy","es":"Música y liturgia"}', 'music', 1),
  ('communication', '{"pt-BR":"Comunicação","en":"Communication","es":"Comunicación"}', 'megaphone', 2),
  ('technology',    '{"pt-BR":"Tecnologia","en":"Technology","es":"Tecnología"}', 'laptop', 3),
  ('education',     '{"pt-BR":"Educação e catequese","en":"Education & catechesis","es":"Educación y catequesis"}', 'book-open', 4),
  ('health',        '{"pt-BR":"Saúde e cuidado","en":"Health & care","es":"Salud y cuidado"}', 'heart-pulse', 5),
  ('social',        '{"pt-BR":"Ação social","en":"Social action","es":"Acción social"}', 'hand-heart', 6),
  ('maintenance',   '{"pt-BR":"Manutenção e obras","en":"Maintenance & building","es":"Mantenimiento y obras"}', 'hammer', 7),
  ('administration','{"pt-BR":"Gestão e finanças","en":"Management & finance","es":"Gestión y finanzas"}', 'briefcase', 8),
  ('languages',     '{"pt-BR":"Idiomas e tradução","en":"Languages & translation","es":"Idiomas y traducción"}', 'languages', 9),
  ('arts',          '{"pt-BR":"Artes e design","en":"Arts & design","es":"Artes y diseño"}', 'palette', 10)
on conflict (slug) do nothing;

insert into public.skills (category_id, slug, names)
select c.id, v.slug, v.names::jsonb
from (values
  ('music','vocals','{"pt-BR":"Canto","en":"Singing","es":"Canto"}'),
  ('music','guitar','{"pt-BR":"Violão","en":"Guitar","es":"Guitarra"}'),
  ('music','keyboard','{"pt-BR":"Teclado e órgão","en":"Keyboard & organ","es":"Teclado y órgano"}'),
  ('music','sound-engineering','{"pt-BR":"Operação de som","en":"Sound engineering","es":"Operación de sonido"}'),
  ('communication','social-media','{"pt-BR":"Redes sociais","en":"Social media","es":"Redes sociales"}'),
  ('communication','photography','{"pt-BR":"Fotografia","en":"Photography","es":"Fotografía"}'),
  ('communication','video','{"pt-BR":"Vídeo e transmissão","en":"Video & streaming","es":"Video y transmisión"}'),
  ('communication','writing','{"pt-BR":"Redação","en":"Writing","es":"Redacción"}'),
  ('technology','web-development','{"pt-BR":"Desenvolvimento web","en":"Web development","es":"Desarrollo web"}'),
  ('technology','it-support','{"pt-BR":"Suporte de TI","en":"IT support","es":"Soporte de TI"}'),
  ('technology','data','{"pt-BR":"Dados e planilhas","en":"Data & spreadsheets","es":"Datos y hojas de cálculo"}'),
  ('education','catechesis','{"pt-BR":"Catequese","en":"Catechesis","es":"Catequesis"}'),
  ('education','tutoring','{"pt-BR":"Reforço escolar","en":"Tutoring","es":"Refuerzo escolar"}'),
  ('education','youth-ministry','{"pt-BR":"Pastoral da juventude","en":"Youth ministry","es":"Pastoral juvenil"}'),
  ('health','nursing','{"pt-BR":"Enfermagem","en":"Nursing","es":"Enfermería"}'),
  ('health','psychology','{"pt-BR":"Escuta e psicologia","en":"Listening & psychology","es":"Escucha y psicología"}'),
  ('health','elderly-care','{"pt-BR":"Cuidado de idosos","en":"Elderly care","es":"Cuidado de mayores"}'),
  ('social','food-distribution','{"pt-BR":"Distribuição de alimentos","en":"Food distribution","es":"Distribución de alimentos"}'),
  ('social','home-visits','{"pt-BR":"Visitas domiciliares","en":"Home visits","es":"Visitas domiciliarias"}'),
  ('social','event-organization','{"pt-BR":"Organização de eventos","en":"Event organization","es":"Organización de eventos"}'),
  ('maintenance','electrical','{"pt-BR":"Elétrica","en":"Electrical","es":"Electricidad"}'),
  ('maintenance','carpentry','{"pt-BR":"Marcenaria","en":"Carpentry","es":"Carpintería"}'),
  ('maintenance','painting','{"pt-BR":"Pintura","en":"Painting","es":"Pintura"}'),
  ('administration','accounting','{"pt-BR":"Contabilidade","en":"Accounting","es":"Contabilidad"}'),
  ('administration','legal','{"pt-BR":"Orientação jurídica","en":"Legal guidance","es":"Orientación jurídica"}'),
  ('administration','fundraising','{"pt-BR":"Captação de recursos","en":"Fundraising","es":"Captación de fondos"}'),
  ('languages','translation','{"pt-BR":"Tradução","en":"Translation","es":"Traducción"}'),
  ('languages','sign-language','{"pt-BR":"Língua de sinais","en":"Sign language","es":"Lengua de señas"}'),
  ('arts','graphic-design','{"pt-BR":"Design gráfico","en":"Graphic design","es":"Diseño gráfico"}'),
  ('arts','sacred-art','{"pt-BR":"Arte sacra","en":"Sacred art","es":"Arte sacro"}')
) as v(category, slug, names)
join public.skill_categories c on c.slug = v.category
on conflict (slug) do nothing;
