-- crear_profile solo la usa el trigger de auth.users; no debe poder llamarse como RPC.
revoke execute on function public.crear_profile() from public, anon, authenticated;
