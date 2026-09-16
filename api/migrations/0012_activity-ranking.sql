ALTER TABLE "activities" ADD COLUMN "reaction" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "reacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "pick" jsonb;--> statement-breakpoint
ALTER TABLE "activity_templates" ADD COLUMN "themes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "activities_template_id_reaction_idx" ON "activities" USING btree ("template_id") WHERE "activities"."reaction" is not null;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_reaction_check" CHECK ("activities"."reaction" in ('up', 'down'));--> statement-breakpoint
ALTER TABLE "activity_templates" ADD CONSTRAINT "activity_templates_themes_check" CHECK ("activity_templates"."themes" <@ array['animales', 'dinosaurios', 'vehiculos', 'musica', 'agua', 'construir', 'dibujar', 'cocinar', 'naturaleza', 'pelota', 'esconderse', 'libros', 'disfraces', 'munecos', 'numeros', 'letras', 'colores', 'cuerpo']);--> statement-breakpoint
-- The ranking (JUG-104) matches a template's themes against what the kids
-- love. The seed's templates get theirs by slug, since a template already
-- loaded is never overwritten by the seed.
UPDATE "activity_templates" SET "themes" = "tags"."themes"
FROM (VALUES
	('la-busqueda', ARRAY['esconderse']::text[]),
	('tren-de-almohadones', ARRAY['vehiculos', 'construir']::text[]),
	('hora-de-comer', ARRAY['munecos', 'cocinar']::text[]),
	('galope-en-la-plaza', ARRAY['animales', 'cuerpo']::text[]),
	('el-cumple', ARRAY['munecos', 'cocinar']::text[]),
	('el-consultorio', ARRAY['munecos']::text[]),
	('como-hace-la-mascota', ARRAY['animales', 'cuerpo']::text[]),
	('el-almacen', ARRAY['munecos', 'numeros']::text[]),
	('ring-ring', ARRAY['munecos']::text[]),
	('la-cueva', ARRAY['esconderse', 'construir']::text[]),
	('el-retrato', ARRAY['dibujar']::text[]),
	('la-orquesta', ARRAY['musica', 'cocinar']::text[]),
	('una-torre', ARRAY['construir']::text[]),
	('la-casa-de-carton', ARRAY['construir', 'dibujar', 'munecos']::text[]),
	('el-camino', ARRAY['vehiculos', 'construir']::text[]),
	('los-nenufares', ARRAY['cuerpo', 'animales']::text[]),
	('el-tunel-de-cajas', ARRAY['cuerpo', 'esconderse', 'construir']::text[]),
	('la-sombra', ARRAY['cuerpo']::text[]),
	('el-piso-es-lava', ARRAY['cuerpo']::text[]),
	('estatuas', ARRAY['musica', 'cuerpo']::text[]),
	('la-mancha', ARRAY['cuerpo']::text[]),
	('el-circuito', ARRAY['cuerpo', 'construir']::text[]),
	('la-lista-de-la-plaza', ARRAY['naturaleza', 'colores']::text[]),
	('la-rayuela', ARRAY['numeros', 'cuerpo']::text[]),
	('el-veo-veo', ARRAY['colores']::text[]),
	('el-mandado', ARRAY['numeros', 'cocinar']::text[]),
	('el-camino-de-tiza', ARRAY['dibujar', 'cuerpo']::text[]),
	('las-hormigas', ARRAY['naturaleza', 'animales']::text[]),
	('las-medias-perdidas', ARRAY['colores']::text[]),
	('poner-la-mesa', ARRAY['numeros', 'cocinar']::text[]),
	('lavar-la-verdura', ARRAY['agua', 'cocinar']::text[]),
	('la-plantita', ARRAY['naturaleza']::text[]),
	('guardar-antes-de-que-suene', ARRAY['cuerpo']::text[]),
	('el-trapo-y-el-balde', ARRAY['agua']::text[]),
	('el-intruso', ARRAY['colores']::text[]),
	('el-ruido-escondido', ARRAY['musica', 'esconderse']::text[]),
	('frio-o-caliente', ARRAY['esconderse']::text[]),
	('cuantos-pasos', ARRAY['numeros']::text[]),
	('se-hunde-o-flota', ARRAY['agua']::text[]),
	('el-memotest-casero', ARRAY['dibujar']::text[]),
	('la-caza-del-color', ARRAY['colores', 'cuerpo']::text[]),
	('la-ciudad-de-carton', ARRAY['construir', 'vehiculos', 'dibujar']::text[]),
	('los-binoculares', ARRAY['naturaleza', 'construir']::text[]),
	('el-titere-de-media', ARRAY['munecos', 'disfraces']::text[]),
	('la-masa-y-la-pizzeria', ARRAY['cocinar', 'munecos']::text[]),
	('el-mural', ARRAY['dibujar']::text[]),
	('el-libro-de-lo-que-me-gusta', ARRAY['libros', 'dibujar', 'letras']::text[]),
	('los-aviones-de-papel', ARRAY['vehiculos', 'construir']::text[]),
	('el-frasco-de-la-calma', ARRAY['agua']::text[]),
	('sombras-en-la-pared', ARRAY['animales', 'libros']::text[]),
	('la-pizza-en-la-espalda', ARRAY['cocinar']::text[]),
	('el-globo-que-se-infla', '{}'::text[]),
	('el-cuento-sin-leer', ARRAY['libros']::text[]),
	('la-gallinita-ciega', ARRAY['animales', 'esconderse']::text[]),
	('anton-pirulero', ARRAY['musica']::text[])
) AS "tags"("slug", "themes")
WHERE "activity_templates"."slug" = "tags"."slug";
