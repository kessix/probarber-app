/** Mesmas regras do banco (supabase/schema.sql): 3 a 30 caracteres, só a-z, 0-9 e hífen no meio. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const RESERVED = ['admin', 'api', 'login', 'cadastro', 'app'];

/** "Barbearia Dois Irmãos" -> "barbearia-dois-irmaos" */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

export function slugError(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return 'Use de 3 a 30 letras minúsculas, números ou hífen, sem começar nem terminar com hífen.';
  }
  if (RESERVED.includes(slug)) return 'Este endereço é reservado. Escolha outro.';
  return null;
}

export const SITE_URL = 'https://probarberapp.com.br';
