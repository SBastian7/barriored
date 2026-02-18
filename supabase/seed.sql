-- Seed community
INSERT INTO communities (name, slug, municipality, department, description, primary_color)
VALUES ('Parque Industrial', 'parqueindustrial', 'Pereira', 'Risaralda', 'Comuna del Cafe - Barrio Parque Industrial', '#1E40AF');

-- Seed categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Restaurantes', 'restaurantes', 'Utensils', 1),
  ('Tiendas', 'tiendas', 'Store', 2),
  ('Belleza', 'belleza', 'Scissors', 3),
  ('Servicios', 'servicios', 'Wrench', 4),
  ('Salud', 'salud', 'Heart', 5),
  ('Tecnologia', 'tecnologia', 'Monitor', 6),
  ('Educacion', 'educacion', 'GraduationCap', 7),
  ('Talleres', 'talleres', 'Hammer', 8),
  ('Mascotas', 'mascotas', 'PawPrint', 9),
  ('Otros', 'otros', 'MoreHorizontal', 10);
