INSERT INTO public.users (id, email, first_name, last_name, role)
VALUES ('3eaf9b9e-710f-41dd-b257-c28f684bd18c', 'fkpdickson@gmail.com', 'A', 'B', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';