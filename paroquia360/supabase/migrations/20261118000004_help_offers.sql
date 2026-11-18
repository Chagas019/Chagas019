-- "Preciso de ajuda": o voluntário pode retirar e refazer a própria oferta
-- (antes só podia marcar como retirada, e a restrição de unicidade impedia oferecer de novo).
drop policy upd on public.help_offers;
create policy upd on public.help_offers for update to authenticated
  using (user_id = auth.uid() or private.can_manage_pastoral(parish_id,
         (select pastoral_id from public.help_requests where id = help_request_id)))
  with check ((user_id = auth.uid() and status in ('offered', 'withdrawn')) or private.can_manage_pastoral(parish_id,
         (select pastoral_id from public.help_requests where id = help_request_id)));
