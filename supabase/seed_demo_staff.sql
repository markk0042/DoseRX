-- Prefer running 20260805_schema_v2_text_ids.sql (includes this staff seed).
-- Standalone staff seed matching app PINs:

insert into public.staff (id, name, grade, role, pin, phecc_number) values
  ('mgmt-1', 'Claire Byrne', 'AP', 'management', '9999', 'MGMT-001'),
  ('mgmt-2', 'Tom Fitzgerald', 'Paramedic', 'management', '8888', 'MGMT-002'),
  ('staff-1', 'Aoife Brennan', 'EMT', 'staff', '1111', 'EMT-48291'),
  ('staff-2', 'Conor Murphy', 'EMT', 'staff', '2222', 'EMT-51902'),
  ('staff-3', 'Siobhán O''Neill', 'Paramedic', 'staff', '3333', 'P-33814'),
  ('staff-4', 'James Kelly', 'Paramedic', 'staff', '4444', 'P-29107'),
  ('staff-5', 'Niamh Walsh', 'AP', 'staff', '5555', 'AP-17462'),
  ('staff-6', 'Mark Doyle', 'AP', 'staff', '6666', 'AP-15208')
on conflict (id) do update set
  name = excluded.name,
  grade = excluded.grade,
  role = excluded.role,
  pin = excluded.pin,
  phecc_number = excluded.phecc_number;
