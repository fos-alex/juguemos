ALTER TABLE "household_materials" ADD COLUMN "have" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Materiales gets its own screen (JUG-153), and a material the family hasn't
-- answered is at its default, which is on for what almost every home has.
-- Until now a row meant the family had it and no row meant it didn't, so a
-- family that had marked any material keeps its "no" for the rest of the old
-- list. A family that never marked one gets the defaults.
INSERT INTO "household_materials" ("family_id", "material", "have")
SELECT "answered"."family_id", "old"."material", false
FROM (SELECT DISTINCT "family_id" FROM "household_materials") AS "answered"
CROSS JOIN unnest(ARRAY['cajas', 'ollas', 'mantas', 'tizas', 'almohadones', 'crayones', 'cinta', 'tuppers']::text[]) AS "old"("material")
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- A template's materials were words; now they are keys from the materials
-- list, the ones it can't be played without. The seed's templates get their
-- keys by slug, and any other keeps only what is already a key.
UPDATE "activity_templates" SET "materials" = "tags"."materials"
FROM (VALUES
	('la-busqueda', ARRAY['almohadones']::text[]),
	('tren-de-almohadones', ARRAY['almohadones']::text[]),
	('hora-de-comer', '{}'::text[]),
	('galope-en-la-plaza', '{}'::text[]),
	('el-cumple', ARRAY['tuppers', 'repasadores']::text[]),
	('el-consultorio', ARRAY['cinta']::text[]),
	('como-hace-la-mascota', '{}'::text[]),
	('el-almacen', '{}'::text[]),
	('ring-ring', '{}'::text[]),
	('la-cueva', ARRAY['mantas']::text[]),
	('el-retrato', ARRAY['crayones']::text[]),
	('la-orquesta', ARRAY['ollas', 'cucharas']::text[]),
	('una-torre', ARRAY['tuppers']::text[]),
	('la-casa-de-carton', ARRAY['cajas', 'crayones', 'tijera']::text[]),
	('el-camino', ARRAY['cinta']::text[]),
	('los-nenufares', '{}'::text[]),
	('el-tunel-de-cajas', ARRAY['cajas']::text[]),
	('la-sombra', '{}'::text[]),
	('el-piso-es-lava', ARRAY['almohadones', 'mantas']::text[]),
	('estatuas', '{}'::text[]),
	('la-mancha', '{}'::text[]),
	('el-circuito', ARRAY['almohadones', 'cinta']::text[]),
	('la-lista-de-la-plaza', '{}'::text[]),
	('la-rayuela', ARRAY['tizas']::text[]),
	('el-veo-veo', '{}'::text[]),
	('el-mandado', '{}'::text[]),
	('el-camino-de-tiza', ARRAY['tizas']::text[]),
	('las-hormigas', '{}'::text[]),
	('las-medias-perdidas', '{}'::text[]),
	('poner-la-mesa', '{}'::text[]),
	('lavar-la-verdura', ARRAY['repasadores']::text[]),
	('la-plantita', ARRAY['envases', 'tierra', 'porotos']::text[]),
	('guardar-antes-de-que-suene', '{}'::text[]),
	('el-trapo-y-el-balde', ARRAY['baldes']::text[]),
	('el-intruso', '{}'::text[]),
	('el-ruido-escondido', '{}'::text[]),
	('frio-o-caliente', '{}'::text[]),
	('cuantos-pasos', '{}'::text[]),
	('se-hunde-o-flota', ARRAY['baldes']::text[]),
	('el-memotest-casero', ARRAY['cajas', 'crayones', 'tijera']::text[]),
	('la-caza-del-color', ARRAY['repasadores']::text[]),
	('la-ciudad-de-carton', ARRAY['cajas', 'tubos', 'crayones', 'cinta', 'tijera']::text[]),
	('los-binoculares', ARRAY['tubos', 'cinta', 'crayones', 'cordones']::text[]),
	('el-titere-de-media', ARRAY['medias', 'marcadores', 'papel', 'cinta']::text[]),
	('la-masa-y-la-pizzeria', ARRAY['harina']::text[]),
	('el-mural', ARRAY['cinta', 'crayones']::text[]),
	('el-libro-de-lo-que-me-gusta', ARRAY['papel', 'crayones', 'cinta']::text[]),
	('los-aviones-de-papel', ARRAY['papel', 'cinta']::text[]),
	('el-frasco-de-la-calma', ARRAY['botellas', 'cinta']::text[]),
	('sombras-en-la-pared', '{}'::text[]),
	('la-pizza-en-la-espalda', '{}'::text[]),
	('el-globo-que-se-infla', '{}'::text[]),
	('el-cuento-sin-leer', ARRAY['libros']::text[]),
	('la-gallinita-ciega', '{}'::text[]),
	('anton-pirulero', '{}'::text[])
) AS "tags"("slug", "materials")
WHERE "activity_templates"."slug" = "tags"."slug";--> statement-breakpoint
UPDATE "activity_templates"
SET "materials" = ARRAY(SELECT "material" FROM unnest("materials") AS "material" WHERE "material" = ANY(ARRAY['ollas', 'cucharas', 'tuppers', 'repasadores', 'harina', 'porotos', 'botellas', 'envases', 'papel', 'crayones', 'marcadores', 'tijera', 'cinta', 'cajas', 'tubos', 'cordones', 'medias', 'almohadones', 'mantas', 'baldes', 'libros', 'tizas', 'tierra']::text[]))
WHERE "slug" <> ALL(ARRAY['la-busqueda', 'tren-de-almohadones', 'hora-de-comer', 'galope-en-la-plaza', 'el-cumple', 'el-consultorio', 'como-hace-la-mascota', 'el-almacen', 'ring-ring', 'la-cueva', 'el-retrato', 'la-orquesta', 'una-torre', 'la-casa-de-carton', 'el-camino', 'los-nenufares', 'el-tunel-de-cajas', 'la-sombra', 'el-piso-es-lava', 'estatuas', 'la-mancha', 'el-circuito', 'la-lista-de-la-plaza', 'la-rayuela', 'el-veo-veo', 'el-mandado', 'el-camino-de-tiza', 'las-hormigas', 'las-medias-perdidas', 'poner-la-mesa', 'lavar-la-verdura', 'la-plantita', 'guardar-antes-de-que-suene', 'el-trapo-y-el-balde', 'el-intruso', 'el-ruido-escondido', 'frio-o-caliente', 'cuantos-pasos', 'se-hunde-o-flota', 'el-memotest-casero', 'la-caza-del-color', 'la-ciudad-de-carton', 'los-binoculares', 'el-titere-de-media', 'la-masa-y-la-pizzeria', 'el-mural', 'el-libro-de-lo-que-me-gusta', 'los-aviones-de-papel', 'el-frasco-de-la-calma', 'sombras-en-la-pared', 'la-pizza-en-la-espalda', 'el-globo-que-se-infla', 'el-cuento-sin-leer', 'la-gallinita-ciega', 'anton-pirulero']::text[]);
