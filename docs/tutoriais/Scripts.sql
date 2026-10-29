### 1 - Como zerar a marca de configuração inicial 

update public.barbershops
set onboarded_at = null
where slug = 'barbeariaks';

# Troque barbeariaks pelo link da barbearia que quiser testar. Depois feche o app por completo e abra de novo. Para refazer com outra conta a partir do cadastro (passo 1), use um e-mail novo, ou apague a barbearia dela:

# Troque barbeariaks pelo link da barbearia que quiser testar. Depois feche o app por completo e abra de novo. Para refazer com outra conta a partir do cadastro (passo 1), use um e-mail novo, ou apague a barbearia dela:

delete from public.barbershops where slug = 'barbeariaks';

# Esse comando apaga também serviços, horários, clientes e agendamentos dessa barbearia, em cascata. Use só em conta de teste.
# Também dá pelo painel: Table Editor → barbershops, abra a linha da barbearia, apague o valor de onboarded_at (deixe vazio, NULL) e salve.

### ---------------------------------------------------