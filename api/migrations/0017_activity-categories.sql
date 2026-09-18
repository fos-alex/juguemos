-- A template carries every category that fits it, not only the main one
-- (JUG-30). The seed's templates get the ones they were missing by slug,
-- since a template already loaded is never overwritten by the seed. A
-- category is only ever added here, never taken away, so what was chosen in
-- the admin stays.
UPDATE "activity_templates"
SET "categories" = "activity_templates"."categories" || "added"."categories"
FROM (VALUES
	('galope-en-la-plaza', ARRAY['out_and_about']::text[]),
	('la-sombra', ARRAY['out_and_about']::text[]),
	('la-mancha', ARRAY['out_and_about']::text[]),
	('la-rayuela', ARRAY['out_and_about']::text[]),
	('el-camino-de-tiza', ARRAY['out_and_about']::text[]),
	('las-hormigas', ARRAY['out_and_about']::text[]),
	('el-tesoro-en-la-arena', ARRAY['out_and_about']::text[]),
	('el-barco-en-el-charco', ARRAY['out_and_about']::text[]),
	('las-palomas', ARRAY['out_and_about']::text[]),
	('la-lomita', ARRAY['out_and_about']::text[]),
	('el-tobogan-de-los-juguetes', ARRAY['out_and_about']::text[]),
	('el-almacen', ARRAY['low_energy']::text[]),
	('el-retrato', ARRAY['low_energy']::text[]),
	('a-que-huele', ARRAY['low_energy']::text[]),
	('el-mandado', ARRAY['learn']::text[]),
	('el-piso-es-lava', ARRAY['pretend']::text[]),
	('que-sera', ARRAY['explore']::text[]),
	('los-dibujos-que-se-secan', ARRAY['explore']::text[]),
	('los-ruidos-de-la-noche', ARRAY['explore']::text[])
) AS "added"("slug", "categories")
WHERE "activity_templates"."slug" = "added"."slug"
	AND NOT "activity_templates"."categories" @> "added"."categories";
