ALTER TABLE public.citas 
ADD COLUMN servicio_id BIGINT REFERENCES public.servicios(id);